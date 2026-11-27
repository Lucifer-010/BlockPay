from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import (
    ActivityLog,
    BillShare,
    ExpenseGroup,
    GroupMembership,
    Notification,
    SharedBill,
    StellarSettlementTransaction,
    User,
)

SAM_WALLET = "GA4KDGQIIXA7SQZB43AIK254XTSGYV3HBX4GAPKU3N2ECP76IX4U557Q"
ALEX_WALLET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
JO_WALLET = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ"
MIA_WALLET = "GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3"

FAQ_ITEMS_DATA = [
    {
        "id": "real-money",
        "question": "Is this real money?",
        "answer": "No. Raba Pay runs on a test network and uses simulated USDC, so no real money moves.",
    },
    {
        "id": "need-wallet",
        "question": "Do I need a wallet?",
        "answer": "You can create an account, join a group, and view every shared bill first. When you are ready to pay your share, connect any supported test network wallet and approve the transfer yourself.",
    },
    {
        "id": "what-is-usdc",
        "question": "What is USDC?",
        "answer": "USDC is a digital dollar pegged 1:1 to USD. On Raba Pay, all balances and settlements use simulated testnet USDC so groups can test splitting and settling bills without spending real funds.",
    },
    {
        "id": "not-pay",
        "question": "What happens if someone does not pay?",
        "answer": "Their share remains highlighted in the group ledger and progress bar (for example, Waiting on Mia), so everyone sees what is still outstanding without awkward follow-up messages.",
    },
    {
        "id": "who-sees",
        "question": "Who can see my bills?",
        "answer": "Only members inside a group can see the bills, split amounts, and payment history for that group. Raba Pay never holds your funds or posts your activity publicly.",
    },
]

WITHOUT_RABA_DATA = [
    "Chasing people in chat for money",
    "Doing the maths by hand",
    "No clear record of who has paid",
]

WITH_RABA_DATA = [
    "One shared bill for the whole group",
    "Equal or custom splits, worked out for you",
    "See who has paid, in one place",
]


@transaction.atomic
def ensure_initial_workspace_seeded() -> User:
    """
    Ensures the default RabaPay workspace users (Sam, Alex, Jo, Mia), expense groups,
    shared bills, Stellar settlement transactions, activity logs, and notifications
    exist in the database so the frontend renders 100% live database records from the API.
    """
    sam, created = User.objects.get_or_create(
        username="sam",
        defaults={
            "email": "sam@example.com",
            "display_name": "Sam",
            "first_name": "Sam",
            "avatar_bg": "#166534",
            "avatar_text": "#FFFFFF",
            "stellar_address": SAM_WALLET,
            "wallet_provider": "freighter",
            "wallet_connected_at": timezone.now(),
            "simulated_usdc_balance": Decimal("125.0000000"),
        },
    )
    if created:
        sam.set_password("password123")
        sam.save()

    alex, a_created = User.objects.get_or_create(
        username="alex",
        defaults={
            "email": "alex@example.com",
            "display_name": "Alex",
            "first_name": "Alex",
            "avatar_bg": "#DBEAFE",
            "avatar_text": "#1E40AF",
            "stellar_address": ALEX_WALLET,
            "wallet_provider": "freighter",
            "wallet_connected_at": timezone.now(),
            "simulated_usdc_balance": Decimal("250.0000000"),
        },
    )
    if a_created:
        alex.set_password("password123")
        alex.save()

    jo, j_created = User.objects.get_or_create(
        username="jo",
        defaults={
            "email": "jo@example.com",
            "display_name": "Jo",
            "first_name": "Jo",
            "avatar_bg": "#EDE9FE",
            "avatar_text": "#5B21B6",
            "stellar_address": JO_WALLET,
            "wallet_provider": "albedo",
            "wallet_connected_at": timezone.now(),
            "simulated_usdc_balance": Decimal("180.0000000"),
        },
    )
    if j_created:
        jo.set_password("password123")
        jo.save()

    mia, m_created = User.objects.get_or_create(
        username="mia",
        defaults={
            "email": "mia@example.com",
            "display_name": "Mia",
            "first_name": "Mia",
            "avatar_bg": "#FFE4E6",
            "avatar_text": "#9F1239",
            "stellar_address": MIA_WALLET,
            "wallet_provider": "xbull",
            "wallet_connected_at": timezone.now(),
            "simulated_usdc_balance": Decimal("90.0000000"),
        },
    )
    if m_created:
        mia.set_password("password123")
        mia.save()

    if ExpenseGroup.objects.filter(slug="housemates").exists():
        return sam

    # 1. Housemates Group
    housemates = ExpenseGroup.objects.create(
        slug="housemates",
        name="Housemates",
        description="Rent extras, bills and groceries.",
        invite_code="raba.pay/join/h8k2x9",
        created_by=alex,
    )
    for u, role in [
        (alex, GroupMembership.ROLE_ADMIN),
        (sam, GroupMembership.ROLE_MEMBER),
        (jo, GroupMembership.ROLE_MEMBER),
        (mia, GroupMembership.ROLE_MEMBER),
    ]:
        GroupMembership.objects.create(
            group=housemates,
            user=u,
            invited_email=u.email,
            invited_stellar_address=u.stellar_address or "",
            role=role,
            status=GroupMembership.STATUS_ACTIVE,
        )
    # Invited member Chris
    GroupMembership.objects.create(
        group=housemates,
        user=None,
        invited_name="Chris",
        invited_email="chris@example.com",
        role=GroupMembership.ROLE_MEMBER,
        status=GroupMembership.STATUS_INVITED,
    )

    # 2. Weekend trip Group
    weekend_trip = ExpenseGroup.objects.create(
        slug="weekend-trip",
        name="Weekend trip",
        description="Stays, rides and shared meals.",
        invite_code="raba.pay/join/w3k9p1",
        created_by=jo,
    )
    for u in [sam, jo, mia]:
        GroupMembership.objects.create(
            group=weekend_trip,
            user=u,
            invited_email=u.email,
            role=GroupMembership.ROLE_ADMIN if u == jo else GroupMembership.ROLE_MEMBER,
            status=GroupMembership.STATUS_ACTIVE,
        )

    # 3. Office lunch Group
    office_lunch = ExpenseGroup.objects.create(
        slug="office-lunch",
        name="Office lunch",
        description="Team lunches and coffee runs.",
        invite_code="raba.pay/join/o7m4z2",
        created_by=sam,
    )
    for u in [alex, sam]:
        GroupMembership.objects.create(
            group=office_lunch,
            user=u,
            invited_email=u.email,
            role=GroupMembership.ROLE_ADMIN if u == sam else GroupMembership.ROLE_MEMBER,
            status=GroupMembership.STATUS_ACTIVE,
        )

    # Bill 1: Dinner at Olive & Co (100 USDC, Alex paid, Jo paid, Sam & Mia unpaid)
    bill_olive = SharedBill.objects.create(
        slug="bill-olive",
        group=housemates,
        created_by=alex,
        recipient=alex,
        recipient_stellar_address=ALEX_WALLET,
        description="Dinner at Olive & Co",
        total_amount=Decimal("100.0000000"),
        split_type=SharedBill.SPLIT_EQUAL,
        status=SharedBill.STATUS_PARTIALLY_PAID,
        contract_bill_id=1001,
        created_label="Yesterday",
    )
    BillShare.objects.create(
        bill=bill_olive,
        participant=alex,
        amount_due=Decimal("25.0000000"),
        amount_paid=Decimal("25.0000000"),
        is_paid=True,
        is_payer=True,
        status=BillShare.STATUS_PAID,
        paid_at_label="Paid the bill",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_olive,
        participant=jo,
        amount_due=Decimal("25.0000000"),
        amount_paid=Decimal("25.0000000"),
        is_paid=True,
        is_payer=False,
        status=BillShare.STATUS_PAID,
        stellar_tx_hash="9a4f0000000000000000000000000000000000000000000000000000000031bc",
        paid_at_label="Paid · 2h ago",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_olive,
        participant=sam,
        amount_due=Decimal("25.0000000"),
        amount_paid=Decimal("0.0000000"),
        is_paid=False,
        is_payer=False,
        status=BillShare.STATUS_PENDING,
        paid_at_label="Not paid yet",
    )
    BillShare.objects.create(
        bill=bill_olive,
        participant=mia,
        amount_due=Decimal("25.0000000"),
        amount_paid=Decimal("0.0000000"),
        is_paid=False,
        is_payer=False,
        status=BillShare.STATUS_PENDING,
        paid_at_label="Not paid yet",
    )

    # Bill 2: Groceries (80 USDC, Sam paid, Alex & Jo paid, waiting on Mia)
    bill_groceries = SharedBill.objects.create(
        slug="bill-groceries",
        group=housemates,
        created_by=sam,
        recipient=sam,
        recipient_stellar_address=SAM_WALLET,
        description="Groceries",
        total_amount=Decimal("80.0000000"),
        split_type=SharedBill.SPLIT_EQUAL,
        status=SharedBill.STATUS_PARTIALLY_PAID,
        contract_bill_id=1002,
        created_label="Yesterday",
    )
    BillShare.objects.create(
        bill=bill_groceries,
        participant=sam,
        amount_due=Decimal("20.0000000"),
        amount_paid=Decimal("20.0000000"),
        is_paid=True,
        is_payer=True,
        status=BillShare.STATUS_PAID,
        paid_at_label="Paid the bill",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_groceries,
        participant=alex,
        amount_due=Decimal("20.0000000"),
        amount_paid=Decimal("20.0000000"),
        is_paid=True,
        status=BillShare.STATUS_PAID,
        stellar_tx_hash="7c120000000000000000000000000000000000000000000000000000000094aa",
        paid_at_label="Paid · Yesterday",
        paid_at=timezone.now(),
    )
    sh_groceries_jo = BillShare.objects.create(
        bill=bill_groceries,
        participant=jo,
        amount_due=Decimal("20.0000000"),
        amount_paid=Decimal("20.0000000"),
        is_paid=True,
        status=BillShare.STATUS_PAID,
        stellar_tx_hash="3b810000000000000000000000000000000000000000000000000000000020f4",
        paid_at_label="Paid · Yesterday",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_groceries,
        participant=mia,
        amount_due=Decimal("20.0000000"),
        amount_paid=Decimal("0.0000000"),
        is_paid=False,
        status=BillShare.STATUS_PENDING,
        paid_at_label="Not paid yet",
    )

    # Bill 3: Electricity, Nov (60 USDC, settled)
    bill_electricity = SharedBill.objects.create(
        slug="bill-electricity",
        group=housemates,
        created_by=jo,
        recipient=jo,
        recipient_stellar_address=JO_WALLET,
        description="Electricity, Nov",
        total_amount=Decimal("60.0000000"),
        split_type=SharedBill.SPLIT_EQUAL,
        status=SharedBill.STATUS_SETTLED,
        contract_bill_id=1003,
        created_label="3 days ago",
        settled_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_electricity,
        participant=jo,
        amount_due=Decimal("15.0000000"),
        amount_paid=Decimal("15.0000000"),
        is_paid=True,
        is_payer=True,
        status=BillShare.STATUS_PAID,
        paid_at_label="Paid the bill",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_electricity,
        participant=alex,
        amount_due=Decimal("15.0000000"),
        amount_paid=Decimal("15.0000000"),
        is_paid=True,
        status=BillShare.STATUS_PAID,
        stellar_tx_hash="1e400000000000000000000000000000000000000000000000000000000088cd",
        paid_at_label="Paid · 3 days ago",
        paid_at=timezone.now(),
    )
    sh_elec_sam = BillShare.objects.create(
        bill=bill_electricity,
        participant=sam,
        amount_due=Decimal("15.0000000"),
        amount_paid=Decimal("15.0000000"),
        is_paid=True,
        status=BillShare.STATUS_PAID,
        stellar_tx_hash="5a910000000000000000000000000000000000000000000000000000000041ef",
        paid_at_label="Paid · 3 days ago",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_electricity,
        participant=mia,
        amount_due=Decimal("15.0000000"),
        amount_paid=Decimal("15.0000000"),
        is_paid=True,
        status=BillShare.STATUS_PAID,
        stellar_tx_hash="8d230000000000000000000000000000000000000000000000000000000011ab",
        paid_at_label="Paid · 2 days ago",
        paid_at=timezone.now(),
    )

    # Bill 4: Lake cabin stay (120 USDC, settled)
    bill_cabin = SharedBill.objects.create(
        slug="bill-cabin",
        group=weekend_trip,
        created_by=jo,
        recipient=jo,
        recipient_stellar_address=JO_WALLET,
        description="Lake cabin stay",
        total_amount=Decimal("120.0000000"),
        split_type=SharedBill.SPLIT_EQUAL,
        status=SharedBill.STATUS_SETTLED,
        contract_bill_id=1004,
        created_label="3 days ago",
        settled_at=timezone.now(),
    )
    for u in [jo, sam, mia]:
        BillShare.objects.create(
            bill=bill_cabin,
            participant=u,
            amount_due=Decimal("40.0000000"),
            amount_paid=Decimal("40.0000000"),
            is_paid=True,
            is_payer=(u == jo),
            status=BillShare.STATUS_PAID,
            paid_at_label="Paid the bill" if u == jo else "Paid · 3 days ago",
            paid_at=timezone.now(),
        )

    # Bill 5: Team sushi lunch (40 USDC, waiting on Alex)
    bill_lunch = SharedBill.objects.create(
        slug="bill-lunch",
        group=office_lunch,
        created_by=sam,
        recipient=sam,
        recipient_stellar_address=SAM_WALLET,
        description="Team sushi lunch",
        total_amount=Decimal("40.0000000"),
        split_type=SharedBill.SPLIT_EQUAL,
        status=SharedBill.STATUS_PARTIALLY_PAID,
        contract_bill_id=1005,
        created_label="Yesterday",
    )
    BillShare.objects.create(
        bill=bill_lunch,
        participant=sam,
        amount_due=Decimal("20.0000000"),
        amount_paid=Decimal("20.0000000"),
        is_paid=True,
        is_payer=True,
        status=BillShare.STATUS_PAID,
        paid_at_label="Paid the bill",
        paid_at=timezone.now(),
    )
    BillShare.objects.create(
        bill=bill_lunch,
        participant=alex,
        amount_due=Decimal("20.0000000"),
        amount_paid=Decimal("0.0000000"),
        is_paid=False,
        status=BillShare.STATUS_PENDING,
        paid_at_label="Not paid yet",
    )

    # Seed StellarSettlementTransactions for History & Recent Payments
    StellarSettlementTransaction.objects.create(
        bill=bill_groceries,
        share=sh_groceries_jo,
        participant=jo,
        tx_hash="0x7c1294aa000000000000000000000000000000000000000000000000000001",
        payer_stellar_address=JO_WALLET,
        recipient_stellar_address=SAM_WALLET,
        amount=Decimal("20.0000000"),
        direction="in",
        counterparty_name="Jo",
        counterparty_initial="J",
        avatar_bg="#EDE9FE",
        avatar_text="#5B21B6",
        group_name="Housemates",
        bill_title="Groceries",
        day_group="Earlier",
        date_label="23 Nov, 18:15",
        fee_label="0.00001 XLM",
        contract_synced=True,
        verification_status=StellarSettlementTransaction.VERIFICATION_VERIFIED,
    )
    StellarSettlementTransaction.objects.create(
        bill=bill_electricity,
        share=sh_elec_sam,
        participant=sam,
        tx_hash="0x5a9141ef000000000000000000000000000000000000000000000000000002",
        payer_stellar_address=SAM_WALLET,
        recipient_stellar_address=JO_WALLET,
        amount=Decimal("15.0000000"),
        direction="out",
        counterparty_name="Jo",
        counterparty_initial="J",
        avatar_bg="#EDE9FE",
        avatar_text="#5B21B6",
        group_name="Housemates",
        bill_title="Electricity, Nov",
        day_group="Earlier",
        date_label="21 Nov, 09:30",
        fee_label="0.00001 XLM",
        contract_synced=True,
        verification_status=StellarSettlementTransaction.VERIFICATION_VERIFIED,
    )
    StellarSettlementTransaction.objects.create(
        bill=bill_cabin,
        share=None,
        participant=sam,
        tx_hash="7a3fc91e00000000000000000000000000000000000000000000000000000003",
        payer_stellar_address=SAM_WALLET,
        recipient_stellar_address=JO_WALLET,
        amount=Decimal("40.0000000"),
        direction="out",
        counterparty_name="Jo",
        counterparty_initial="J",
        avatar_bg="#EDE9FE",
        avatar_text="#5B21B6",
        group_name="Weekend trip",
        bill_title="Lake cabin stay",
        day_group="Today",
        date_label="24 Nov, 12:41",
        fee_label="0.00001 XLM",
        contract_synced=True,
        verification_status=StellarSettlementTransaction.VERIFICATION_VERIFIED,
    )

    # Seed ActivityLogs
    ActivityLog.objects.create(
        group=housemates,
        actor=jo,
        actor_initial="J",
        avatar_bg="#EDE9FE",
        avatar_text="#5B21B6",
        title="Jo paid 25.00 USDC",
        subtitle="Dinner at Olive & Co · 2h ago",
        timestamp_label="2h ago",
        day_group="Today",
        tx_hash="0x9a4f…31bc",
    )
    ActivityLog.objects.create(
        group=housemates,
        actor=alex,
        actor_initial="A",
        avatar_bg="#DBEAFE",
        avatar_text="#1E40AF",
        title="Alex changed the split",
        subtitle="Dinner at Olive & Co",
        timestamp_label="Yesterday",
        day_group="Yesterday",
    )
    ActivityLog.objects.create(
        group=housemates,
        actor=alex,
        actor_initial="A",
        avatar_bg="#DBEAFE",
        avatar_text="#1E40AF",
        title="Alex added Dinner at Olive & Co",
        subtitle="100.00 USDC",
        timestamp_label="Yesterday",
        day_group="Yesterday",
    )
    ActivityLog.objects.create(
        group=housemates,
        actor=mia,
        actor_initial="M",
        avatar_bg="#FFE4E6",
        avatar_text="#9F1239",
        title="Mia joined Housemates",
        subtitle="2 days ago",
        timestamp_label="2 days ago",
        day_group="Earlier",
    )
    ActivityLog.objects.create(
        group=housemates,
        actor=jo,
        actor_initial="E",
        avatar_bg="#DCFCE7",
        avatar_text="#166534",
        title="Electricity, Nov settled",
        subtitle="Everyone has paid",
        timestamp_label="2 days ago",
        day_group="Earlier",
    )

    # Seed Notifications for Sam
    Notification.objects.create(
        user=sam,
        title="Alex changed Dinner at Olive & Co",
        subtitle="Your share is now 25.00 USDC · 1h ago",
        unread=True,
        target_group=housemates,
        target_bill=bill_olive,
    )
    Notification.objects.create(
        user=sam,
        title="Jo paid 25.00 USDC",
        subtitle="Dinner at Olive & Co · 2h ago",
        unread=True,
        target_group=housemates,
        target_bill=bill_olive,
    )
    Notification.objects.create(
        user=sam,
        title="Jo paid 20.00 USDC",
        subtitle="Groceries · 3h ago",
        unread=True,
        target_group=housemates,
        target_bill=bill_groceries,
    )
    Notification.objects.create(
        user=sam,
        title="Mia joined Housemates",
        subtitle="Yesterday",
        unread=False,
        target_group=housemates,
    )
    Notification.objects.create(
        user=sam,
        title="Your payment to Jo is confirmed",
        subtitle="Electricity, Nov · 3 days ago",
        unread=False,
        target_group=housemates,
        target_bill=bill_electricity,
    )

    return sam
