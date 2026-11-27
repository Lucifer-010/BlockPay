import logging
from decimal import Decimal
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from .models import (
    ActivityLog,
    BillShare,
    Notification,
    SharedBill,
    StellarSettlementTransaction,
)
from .stellar_service import StellarTestnetService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def verify_and_settle_payment_task(
    self,
    bill_id: int,
    participant_id: int,
    tx_hash: str,
    amount_str: str,
    payer_stellar_address: str,
    verify_on_horizon: bool = False,
):
    """
    Celery task to asynchronously verify a Stellar Testnet USDC transaction,
    record the settlement, update the participant's share status, recalculate
    outstanding balances, and mark the bill as SETTLED when all shares are paid.
    Rejects duplicate transaction hashes or already paid shares.
    """
    service = StellarTestnetService()
    cleaned_hash = (tx_hash or "").strip()

    with transaction.atomic():
        if StellarSettlementTransaction.objects.filter(tx_hash=cleaned_hash).exists():
            return {
                "status": "rejected",
                "reason": "Duplicate settlement transaction hash already recorded.",
                "tx_hash": cleaned_hash,
            }

        try:
            bill = SharedBill.objects.select_for_update().select_related("group", "recipient").get(id=bill_id)
        except SharedBill.DoesNotExist:
            return {"status": "rejected", "reason": f"Bill #{bill_id} does not exist."}

        if bill.status == SharedBill.STATUS_SETTLED:
            return {
                "status": "rejected",
                "reason": "Bill is already fully settled.",
                "bill_id": bill_id,
            }

        try:
            share = BillShare.objects.select_for_update().select_related("participant").get(
                bill=bill, participant_id=participant_id
            )
        except BillShare.DoesNotExist:
            return {
                "status": "rejected",
                "reason": "Participant is not part of this shared bill.",
            }

        if share.is_paid:
            return {
                "status": "rejected",
                "reason": "Participant share has already been paid.",
                "share_id": share.id,
            }

        amount = Decimal(str(amount_str)).quantize(Decimal("0.0000001"))
        if amount != share.amount_due:
            return {
                "status": "rejected",
                "reason": f"Payment amount ({amount} USDC) must match participant share due ({share.amount_due} USDC).",
            }

        verification = service.verify_testnet_payment(
            tx_hash=cleaned_hash,
            expected_payer=payer_stellar_address,
            expected_recipient=bill.recipient_stellar_address,
            expected_amount=share.amount_due,
            expected_bill_id=bill.id,
            verify_on_horizon=verify_on_horizon,
        )

        if not verification.get("verified"):
            return {
                "status": "rejected",
                "reason": verification.get("reason", "Stellar Testnet verification failed."),
            }

        now = timezone.now()
        share.amount_paid = share.amount_due
        share.is_paid = True
        share.status = BillShare.STATUS_PAID
        share.stellar_tx_hash = cleaned_hash
        share.paid_at_label = "Paid · Just now"
        share.paid_at = now
        share.save()

        participant = share.participant
        recipient = bill.recipient

        # Update balances from live Stellar Horizon or transfer logic
        if participant != recipient:
            if participant.simulated_usdc_balance >= amount:
                participant.simulated_usdc_balance -= amount
            else:
                participant.simulated_usdc_balance = max(Decimal("0.0000000"), participant.simulated_usdc_balance - amount)
            participant.save(update_fields=["simulated_usdc_balance"])

            if recipient:
                recipient.simulated_usdc_balance += amount
                recipient.save(update_fields=["simulated_usdc_balance"])

        # Sync with live on-chain Testnet balances when available
        if participant.stellar_address:
            try:
                p_bal = service.query_account_balances(participant.stellar_address)
                if p_bal.get("funded"):
                    participant.simulated_usdc_balance = p_bal.get("usdc", participant.simulated_usdc_balance)
                    participant.save(update_fields=["simulated_usdc_balance"])
            except Exception:
                pass

        if recipient and recipient.stellar_address:
            try:
                r_bal = service.query_account_balances(recipient.stellar_address)
                if r_bal.get("funded"):
                    recipient.simulated_usdc_balance = r_bal.get("usdc", recipient.simulated_usdc_balance)
                    recipient.save(update_fields=["simulated_usdc_balance"])
            except Exception:
                pass

        settlement = StellarSettlementTransaction.objects.create(
            bill=bill,
            share=share,
            participant=participant,
            tx_hash=cleaned_hash,
            payer_stellar_address=payer_stellar_address,
            recipient_stellar_address=bill.recipient_stellar_address,
            amount=amount,
            asset_code=bill.asset_code,
            asset_issuer=bill.asset_issuer or service.usdc_issuer,
            memo=verification.get("memo", f"RABA-BILL-{bill.id}"),
            direction="out",
            counterparty_name=bill.recipient.name,
            counterparty_initial=bill.recipient.initial,
            avatar_bg=bill.recipient.avatar_bg,
            avatar_text=bill.recipient.avatar_text,
            group_name=bill.group.name,
            bill_title=bill.description,
            day_group="Today",
            date_label="Just now",
            fee_label="0.00001 XLM",
            contract_synced=True,
            contract_invocation_hash=cleaned_hash,
            ledger_sequence=verification.get("ledger"),
            verification_status=StellarSettlementTransaction.VERIFICATION_VERIFIED,
            verification_payload=verification,
        )

        new_bill_status = bill.recalculate_status()

        ActivityLog.objects.create(
            group=bill.group,
            actor=participant,
            actor_initial=participant.initial,
            avatar_bg=participant.avatar_bg,
            avatar_text=participant.avatar_text,
            title=f"{participant.name} paid {amount:.2f} USDC",
            subtitle=f"{bill.description} · Just now",
            timestamp_label="Just now",
            day_group="Today",
            tx_hash=cleaned_hash,
        )

        Notification.objects.create(
            user=participant,
            title=f"Your payment to {bill.recipient.name} is confirmed",
            subtitle=f"{bill.description} · Just now",
            unread=True,
            target_group=bill.group,
            target_bill=bill,
        )

        if bill.recipient_id != participant.id:
            Notification.objects.create(
                user=bill.recipient,
                title=f"{participant.name} paid {amount:.2f} USDC",
                subtitle=f"{bill.description} · Just now",
                unread=True,
                target_group=bill.group,
                target_bill=bill,
            )

        return {
            "status": "settled",
            "settlement_id": settlement.id,
            "bill_id": bill.id,
            "bill_status": new_bill_status,
            "share_id": share.id,
            "tx_hash": cleaned_hash,
            "amount_paid": str(share.amount_paid),
            "bill_outstanding_amount": str(bill.outstanding_amount),
        }


@shared_task
def recalculate_group_balances_task(group_id: int):
    """
    Celery task to audit and reconcile all open/partially paid bills in an expense group.
    """
    bills = SharedBill.objects.filter(group_id=group_id)
    updated = 0
    for bill in bills:
        prev = bill.status
        curr = bill.recalculate_status()
        if prev != curr:
            updated += 1
    return {"group_id": group_id, "checked_bills": bills.count(), "updated_bills": updated}
