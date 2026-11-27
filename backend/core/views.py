import uuid
from decimal import Decimal
from django.contrib.auth import authenticate
from django.db import models, transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    ActivityLog,
    BillShare,
    ExpenseGroup,
    GroupMembership,
    Notification,
    SharedBill,
    StellarSettlementTransaction,
    User,
    generate_invite_code,
)
from .seed_service import (
    FAQ_ITEMS_DATA,
    WITH_RABA_DATA,
    WITHOUT_RABA_DATA,
)
from .serializers import (
    ActivityLogSerializer,
    BillShareSerializer,
    ExpenseGroupSerializer,
    GroupInviteSerializer,
    GroupMembershipSerializer,
    NotificationSerializer,
    PaymentSubmissionSerializer,
    ResplitBillSerializer,
    SharedBillSerializer,
    StellarSettlementTransactionSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    WalletAuthSerializer,
    WalletConnectSerializer,
    format_short_stellar_address,
)
from .stellar_service import (
    StellarTestnetService,
    calculate_equal_split_amounts,
    is_valid_stellar_public_key,
)
from .tasks import recalculate_group_balances_task, verify_and_settle_payment_task


def serialize_frontend_workspace(current_user: User | None) -> dict:
    """
    Serializes the authenticated user's RabaPay workspace from the database.
    Returns ONLY groups, bills, activity, payments, and notifications created by
    or belonging to `current_user`. If `current_user` is None (unauthenticated),
    returns an empty workspace with only public FAQ/landing copy.
    """
    service = StellarTestnetService()

    if not current_user or not current_user.is_authenticated:
        return {
            "isAuthenticated": False,
            "user": {
                "name": "",
                "email": "",
                "walletConnected": False,
                "walletAddress": "",
                "fullWalletAddress": "",
                "walletProvider": "",
                "usdcBalance": 0.0,
                "verified": False,
            },
            "groups": [],
            "bills": [],
            "activity": [],
            "payments": [],
            "notifications": [],
            "faqItems": FAQ_ITEMS_DATA,
            "withoutRabaPoints": WITHOUT_RABA_DATA,
            "withRabaPoints": WITH_RABA_DATA,
            "smartContract": service.get_contract_metadata(),
        }

    all_groups = (
        ExpenseGroup.objects.filter(
            models.Q(created_by=current_user)
            | models.Q(memberships__user=current_user)
        )
        .prefetch_related("memberships__user", "bills__shares__participant")
        .distinct()
        .order_by("-created_at", "-id")
    )

    all_bills = (
        SharedBill.objects.filter(group__in=all_groups)
        .select_related("group", "created_by", "recipient")
        .prefetch_related("shares__participant")
        .order_by("-created_at", "-id")
    )

    frontend_bills = []
    for b in all_bills:
        group_key = b.group.slug or str(b.group_id)
        paid_by_you = b.recipient_id == current_user.id
        paid_by_id = "sam" if paid_by_you else str(b.recipient_id)
        paid_by_label = "you" if paid_by_you else b.recipient.name
        shares_list = list(b.shares.all())
        total_members = len(shares_list) or 1
        paid_count = sum(1 for s in shares_list if s.is_paid)

        my_share_obj = next(
            (s for s in shares_list if s.participant_id == current_user.id),
            None,
        )
        your_share = (
            float(my_share_obj.amount_due)
            if my_share_obj
            else float(b.total_amount / Decimal(total_members))
        )
        user_paid = bool(my_share_obj.is_paid) if my_share_obj else paid_by_you

        unpaid_other = next(
            (
                s.participant.name
                for s in shares_list
                if not s.is_paid and s.participant_id != current_user.id
            ),
            None,
        )

        if b.status == SharedBill.STATUS_CANCELLED:
            fe_status = "cancelled"
        elif b.status == SharedBill.STATUS_SETTLED or paid_count >= total_members:
            fe_status = "settled"
        elif paid_by_you:
            fe_status = "waiting"
        elif user_paid:
            fe_status = "paid"
        else:
            fe_status = "you-owe"

        participants_payload = []
        for s in shares_list:
            p_user = s.participant
            is_you = p_user.id == current_user.id
            is_payer = s.is_payer or (p_user.id == b.recipient_id)
            if is_payer:
                p_status = "payer"
            elif s.is_paid:
                p_status = "paid"
            elif s.status == BillShare.STATUS_CONFIRMING:
                p_status = "confirming"
            else:
                p_status = "unpaid"

            tx_short = None
            if s.stellar_tx_hash:
                h = s.stellar_tx_hash
                tx_short = f"{h[:6]}…{h[-4:]}" if len(h) > 12 else h

            participants_payload.append(
                {
                    "memberId": "sam" if is_you else str(p_user.id),
                    "userId": p_user.id,
                    "name": f"{p_user.name} (you)"
                    if (is_you and not is_payer)
                    else ("You" if is_you else p_user.name),
                    "initial": p_user.initial,
                    "avatarBg": p_user.avatar_bg,
                    "avatarText": p_user.avatar_text,
                    "share": float(s.amount_due),
                    "isPayer": is_payer,
                    "isYou": is_you,
                    "status": p_status,
                    "paidAtLabel": s.paid_at_label
                    or (
                        "Paid the bill"
                        if is_payer
                        else ("Paid" if s.is_paid else "Not paid yet")
                    ),
                    "txHash": tx_short,
                }
            )

        edited_notice = None
        if (
            b.edited_by_name
            and b.edited_from_share is not None
            and b.edited_to_share is not None
        ):
            edited_notice = {
                "editorName": b.edited_by_name,
                "fromShare": float(b.edited_from_share),
                "toShare": float(b.edited_to_share),
            }

        frontend_bills.append(
            {
                "id": b.slug or str(b.id),
                "dbId": b.id,
                "contractBillId": b.contract_bill_id or b.id,
                "groupId": group_key,
                "title": b.description,
                "paidById": "sam" if paid_by_you else paid_by_id,
                "paidByLabel": paid_by_label,
                "paidToWallet": format_short_stellar_address(
                    b.recipient_stellar_address
                ),
                "paidToFullWallet": b.recipient_stellar_address,
                "totalAmount": float(b.total_amount),
                "yourShare": round(your_share, 2),
                "paidCount": paid_count,
                "totalMembers": total_members,
                "status": fe_status,
                "waitingOnName": unpaid_other,
                "userPaid": user_paid,
                "createdAt": b.created_label or "Just now",
                "splitType": "custom"
                if b.split_type == SharedBill.SPLIT_CUSTOM
                else "equal",
                "participants": participants_payload,
                "editedNotice": edited_notice,
            }
        )

    frontend_groups = []
    for g in all_groups:
        group_key = g.slug or str(g.id)
        g_bills = [
            b
            for b in all_bills
            if b.group_id == g.id and b.status != SharedBill.STATUS_CANCELLED
        ]

        you_owe_total = Decimal("0.00")
        owed_to_you_total = Decimal("0.00")
        member_net: dict[int, Decimal] = {}

        for b in g_bills:
            for s in b.shares.all():
                if s.is_paid:
                    continue
                if (
                    s.participant_id == current_user.id
                    and b.recipient_id != current_user.id
                ):
                    you_owe_total += s.amount_due
                    member_net[b.recipient_id] = (
                        member_net.get(b.recipient_id, Decimal("0")) - s.amount_due
                    )
                elif (
                    b.recipient_id == current_user.id
                    and s.participant_id != current_user.id
                ):
                    owed_to_you_total += s.amount_due
                    member_net[s.participant_id] = (
                        member_net.get(s.participant_id, Decimal("0")) + s.amount_due
                    )

        if you_owe_total > 0:
            status_summary = f"You owe {you_owe_total:.2f} USDC"
        elif owed_to_you_total > 0:
            status_summary = f"You are owed {owed_to_you_total:.2f} USDC"
        elif len(g_bills) > 0:
            status_summary = "Settled"
        else:
            status_summary = "No bills yet"

        members_payload = []
        for m in g.memberships.all():
            if m.user:
                u = m.user
                is_you = u.id == current_user.id
                net = member_net.get(u.id, Decimal("0"))
                if is_you:
                    balance_note = "You"
                elif net < 0:
                    balance_note = f"You owe {abs(net):.2f} USDC"
                elif net > 0:
                    balance_note = f"Owes you {net:.2f} USDC"
                else:
                    balance_note = "All settled"

                members_payload.append(
                    {
                        "id": "sam" if is_you else str(u.id),
                        "userId": u.id,
                        "membershipId": m.id,
                        "name": f"{u.name} (you)" if is_you else u.name,
                        "initial": u.initial,
                        "isYou": is_you,
                        "invited": m.status == GroupMembership.STATUS_INVITED,
                        "avatarBg": u.avatar_bg,
                        "avatarText": u.avatar_text,
                        "balanceNote": balance_note,
                        "walletAddress": format_short_stellar_address(
                            u.stellar_address or ""
                        )
                        or "No wallet",
                        "fullWalletAddress": u.stellar_address or "",
                    }
                )
            else:
                inv_name = m.invited_name or (
                    m.invited_email.split("@")[0].capitalize()
                    if m.invited_email
                    else "Invited"
                )
                members_payload.append(
                    {
                        "id": f"invited-{m.id}",
                        "membershipId": m.id,
                        "name": inv_name,
                        "initial": (inv_name[0] if inv_name else "I").upper(),
                        "isYou": False,
                        "invited": True,
                        "avatarBg": "#F5F5F4",
                        "avatarText": "#57534E",
                        "balanceNote": "Invited · not joined yet",
                        "walletAddress": format_short_stellar_address(
                            m.invited_stellar_address or ""
                        )
                        or "Pending",
                        "fullWalletAddress": m.invited_stellar_address or "",
                    }
                )

        frontend_groups.append(
            {
                "id": group_key,
                "dbId": g.id,
                "name": g.name,
                "description": g.description,
                "category": getattr(g, "category", "") or "Home & Rent",
                "location": getattr(g, "location", "") or "",
                "icon": getattr(g, "icon", "") or "🏠",
                "coverColor": getattr(g, "cover_color", "") or "#15803D",
                "members": members_payload,
                "statusSummary": status_summary,
                "inviteCode": g.invite_code,
            }
        )

    activities = ActivityLog.objects.filter(group__in=all_groups).select_related(
        "group"
    )[:40]
    frontend_activity = [
        {
            "id": f"act-{a.id}",
            "groupId": a.group.slug or str(a.group_id),
            "actorInitial": a.actor_initial,
            "avatarBg": a.avatar_bg,
            "avatarText": a.avatar_text,
            "title": a.title,
            "subtitle": a.subtitle,
            "timestamp": a.timestamp_label,
            "dayGroup": a.day_group,
            "txHash": a.tx_hash if a.tx_hash else None,
        }
        for a in activities
    ]

    txs = (
        StellarSettlementTransaction.objects.filter(
            models.Q(participant=current_user)
            | models.Q(bill__recipient=current_user)
            | models.Q(bill__group__in=all_groups)
        )
        .select_related("bill", "participant")
        .distinct()[:40]
    )

    frontend_payments = []
    for t in txs:
        is_incoming = (
            t.bill
            and t.bill.recipient_id == current_user.id
            and t.participant_id != current_user.id
        )
        direction = "in" if is_incoming else t.direction
        counterparty = (
            t.participant.name
            if is_incoming
            else (
                t.counterparty_name
                or (t.bill.recipient.name if t.bill else "Recipient")
            )
        )
        title = (
            f"Received from {counterparty}"
            if direction == "in"
            else f"Paid {counterparty}"
        )
        g_name = t.group_name or (t.bill.group.name if t.bill else "Group")
        b_title = t.bill_title or (t.bill.description if t.bill else "Shared Bill")
        short_tx = (
            f"{t.tx_hash[:6]}…{t.tx_hash[-4:]}"
            if len(t.tx_hash) > 12
            else t.tx_hash
        )
        frontend_payments.append(
            {
                "id": f"pay-{t.id}",
                "title": title,
                "subtitle": f"{b_title} · {g_name} · {t.date_label}",
                "amount": float(t.amount),
                "direction": direction,
                "txHash": short_tx,
                "fullTxHash": t.tx_hash,
                "counterpartyName": counterparty,
                "counterpartyInitial": (
                    counterparty[0] if counterparty else "U"
                ).upper(),
                "avatarBg": t.participant.avatar_bg if is_incoming else t.avatar_bg,
                "avatarText": t.participant.avatar_text
                if is_incoming
                else t.avatar_text,
                "groupName": g_name,
                "billTitle": b_title,
                "dayGroup": t.day_group
                if t.day_group in ("Today", "Earlier")
                else "Today",
                "dateLabel": t.date_label,
                "status": "confirmed"
                if t.verification_status
                == StellarSettlementTransaction.VERIFICATION_VERIFIED
                else "failed",
                "feeLabel": t.fee_label,
                "toWallet": format_short_stellar_address(
                    t.recipient_stellar_address
                ),
            }
        )

    notifs = Notification.objects.filter(user=current_user).select_related(
        "target_group", "target_bill"
    )[:30]
    frontend_notifications = NotificationSerializer(notifs, many=True).data

    # Query live Stellar Horizon balances if address is linked
    live_native_xlm = 0.0
    live_onchain_usdc = 0.0
    if current_user.stellar_address:
        try:
            live_balances = service.query_account_balances(current_user.stellar_address)
            live_native_xlm = float(live_balances.get("native_xlm", 0))
            live_onchain_usdc = float(live_balances.get("usdc", 0))
            if live_balances.get("funded"):
                current_user.simulated_usdc_balance = Decimal(str(live_onchain_usdc))
                current_user.save(update_fields=["simulated_usdc_balance"])
        except Exception:
            pass

    effective_usdc_balance = (
        live_onchain_usdc
        if current_user.stellar_address
        else float(current_user.simulated_usdc_balance)
    )

    return {
        "isAuthenticated": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "name": current_user.name,
            "email": current_user.email,
            "walletConnected": bool(current_user.stellar_address),
            "walletAddress": format_short_stellar_address(
                current_user.stellar_address or ""
            ),
            "fullWalletAddress": current_user.stellar_address or "",
            "walletProvider": current_user.wallet_provider or "",
            "usdcBalance": effective_usdc_balance,
            "nativeXlmBalance": live_native_xlm,
            "onchainUsdcBalance": live_onchain_usdc,
            "verified": True,
        },
        "groups": frontend_groups,
        "bills": frontend_bills,
        "activity": frontend_activity,
        "payments": frontend_payments,
        "notifications": frontend_notifications,
        "faqItems": FAQ_ITEMS_DATA,
        "withoutRabaPoints": WITHOUT_RABA_DATA,
        "withRabaPoints": WITH_RABA_DATA,
        "smartContract": service.get_contract_metadata(),
    }


class WorkspaceBootstrapView(APIView):
    """
    Returns the authenticated user's live RabaPay workspace state from the database.
    Does NOT auto-seed demo groups or bills.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get live RabaPay workspace state for the authenticated user",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        active_user = request.user if request.user.is_authenticated else None
        payload = serialize_frontend_workspace(active_user)
        return Response(payload, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    """
    Register a new RabaPay user account and return JWT access/refresh tokens + clean workspace state.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        data = (
            request.data.copy()
            if hasattr(request.data, "copy")
            else dict(request.data)
        )
        if not data.get("username") and data.get("email"):
            base_user = data["email"].split("@")[0].lower().replace(".", "_")
            if User.objects.filter(username=base_user).exists():
                base_user = f"{base_user}_{uuid.uuid4().hex[:4]}"
            data["username"] = base_user

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_201_CREATED,
        )


class EmailOrUsernameLoginView(APIView):
    """
    Authenticate with email or username + password, returning JWT tokens and live workspace data.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Log in with email or username and password",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        identifier = (
            request.data.get("email") or request.data.get("username") or ""
        ).strip()
        password = request.data.get("password") or ""

        if not identifier:
            return Response(
                {"detail": "Email or username is required.", "code": "invalid-email"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj = (
            User.objects.filter(email__iexact=identifier).first()
            or User.objects.filter(username__iexact=identifier).first()
        )
        if not user_obj:
            return Response(
                {"detail": "No account with this email.", "code": "no-account"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = authenticate(username=user_obj.username, password=password)
        if not user:
            return Response(
                {"detail": "Wrong password. Try again.", "code": "wrong-password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )


class WalletAuthView(APIView):
    """
    Sign in or register directly via official Stellar Wallets Kit ("Connect" button).
    Creates or retrieves the user strictly matching the connected `stellar_address`
    with zero pre-populated demo groups or bills.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Authenticate or connect via Stellar Wallets Kit",
        request=WalletAuthSerializer,
        responses={200: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = WalletAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        stellar_address = serializer.validated_data["stellar_address"]
        wallet_provider = serializer.validated_data.get(
            "wallet_provider", "freighter"
        )
        name = (serializer.validated_data.get("name") or "").strip()

        if request.user.is_authenticated:
            user = request.user
            User.objects.exclude(id=user.id).filter(
                stellar_address=stellar_address
            ).update(stellar_address=None)
            user.stellar_address = stellar_address
            user.wallet_provider = wallet_provider
            user.wallet_connected_at = timezone.now()
            user.save(
                update_fields=[
                    "stellar_address",
                    "wallet_provider",
                    "wallet_connected_at",
                ]
            )
        else:
            user = User.objects.filter(stellar_address=stellar_address).first()
            if not user:
                short_key = stellar_address[:6].lower()
                uname = f"stellar_{short_key}"
                if User.objects.filter(username=uname).exists():
                    uname = f"stellar_{short_key}_{uuid.uuid4().hex[:4]}"
                short_display = f"{stellar_address[:4]}…{stellar_address[-4:]}"
                user = User.objects.create(
                    username=uname,
                    email=f"{uname}@stellar.rabapay.io",
                    display_name=name or short_display,
                    first_name=name or short_display,
                    stellar_address=stellar_address,
                    wallet_provider=wallet_provider,
                    wallet_connected_at=timezone.now(),
                    simulated_usdc_balance=Decimal("500.0000000"),
                )
                user.set_unusable_password()
                user.save()

                # Activate any pending invitations for this Stellar wallet address
                pending_invites = GroupMembership.objects.filter(
                    status=GroupMembership.STATUS_INVITED,
                    user__isnull=True,
                    invited_stellar_address=stellar_address,
                )
                for invite in pending_invites:
                    invite.user = user
                    invite.status = GroupMembership.STATUS_ACTIVE
                    invite.save()
            elif user.simulated_usdc_balance < Decimal("50.0000000"):
                user.simulated_usdc_balance = Decimal("500.0000000")
                user.save(update_fields=["simulated_usdc_balance"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the currently authenticated user's profile (name, email, password).
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        name = request.data.get("name") or request.data.get("display_name")
        if name:
            user.display_name = name.strip()
            user.first_name = name.strip()
        new_password = request.data.get("password")
        if new_password and len(str(new_password)) >= 8:
            user.set_password(str(new_password))
        user.save()
        return Response(
            {
                "user": UserSerializer(user).data,
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )


class ConnectWalletView(APIView):
    """
    Connect a non-custodial Stellar Testnet wallet to the authenticated user's account.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=WalletConnectSerializer,
        responses={200: UserSerializer},
        summary="Connect non-custodial Stellar Testnet wallet",
    )
    def post(self, request):
        user = request.user
        serializer = WalletConnectSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        addr = serializer.validated_data["stellar_address"]

        if User.objects.exclude(id=user.id).filter(stellar_address=addr).exists():
            return Response(
                {
                    "stellar_address": [
                        "This Stellar wallet address is already connected to another account."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.stellar_address = addr
        user.wallet_provider = serializer.validated_data.get(
            "wallet_provider", "freighter"
        )
        user.wallet_connected_at = timezone.now()
        user.save(
            update_fields=["stellar_address", "wallet_provider", "wallet_connected_at"]
        )

        pending_invites = GroupMembership.objects.filter(
            status=GroupMembership.STATUS_INVITED,
            user__isnull=True,
            invited_stellar_address=user.stellar_address,
        )
        for invite in pending_invites:
            invite.user = user
            invite.status = GroupMembership.STATUS_ACTIVE
            invite.save()

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class DisconnectWalletView(APIView):
    """
    Disconnect the Stellar Testnet wallet from the current user's account.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Disconnect Stellar Testnet wallet",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        user = request.user
        user.stellar_address = None
        user.wallet_connected_at = None
        user.save(update_fields=["stellar_address", "wallet_connected_at"])
        return Response(
            {
                "user": UserSerializer(user).data,
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )


class FaucetSimulatedUsdcView(APIView):
    """
    Mint / top-up 100.00 simulated Testnet USDC to the user's connected wallet.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Mint 100.00 simulated Testnet USDC to user wallet",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        user = request.user
        mint_amount = Decimal(str(request.data.get("amount", "100.0000000")))
        user.simulated_usdc_balance += mint_amount
        user.save(update_fields=["simulated_usdc_balance"])
        return Response(
            {
                "minted_usdc": str(mint_amount),
                "new_balance_usdc": str(user.simulated_usdc_balance),
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )


class UserDashboardView(APIView):
    """
    User Dashboard endpoint returning overview of expense groups, payment obligations,
    receivables, outstanding balances, and recent Stellar Testnet USDC transactions.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get User Dashboard summary & payment obligations",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        user = request.user
        my_shares = BillShare.objects.filter(participant=user).select_related(
            "bill", "bill__group", "bill__recipient"
        )
        unpaid_shares = my_shares.filter(is_paid=False)
        paid_shares = my_shares.filter(is_paid=True)

        total_owed_by_me = sum(
            (s.outstanding_amount for s in unpaid_shares), Decimal("0.0000000")
        )
        total_paid_by_me = sum(
            (s.amount_paid for s in paid_shares), Decimal("0.0000000")
        )

        receivable_shares = BillShare.objects.filter(
            bill__recipient=user, is_paid=False
        ).exclude(participant=user)
        total_owed_to_me = sum(
            (s.outstanding_amount for s in receivable_shares), Decimal("0.0000000")
        )

        groups = ExpenseGroup.objects.filter(
            models.Q(created_by=user) | models.Q(memberships__user=user)
        ).distinct()

        recent_txs = StellarSettlementTransaction.objects.filter(
            models.Q(participant=user) | models.Q(bill__recipient=user)
        ).distinct()[:10]

        return Response(
            {
                "user": UserSerializer(user).data,
                "summary": {
                    "groups_count": groups.count(),
                    "pending_obligations_count": unpaid_shares.count(),
                    "completed_payments_count": paid_shares.count(),
                    "total_outstanding_owed_by_user_usdc": str(
                        total_owed_by_me.quantize(Decimal("0.0000001"))
                    ),
                    "total_paid_by_user_usdc": str(
                        total_paid_by_me.quantize(Decimal("0.0000001"))
                    ),
                    "total_outstanding_owed_to_user_usdc": str(
                        total_owed_to_me.quantize(Decimal("0.0000001"))
                    ),
                },
                "pending_obligations": BillShareSerializer(
                    unpaid_shares, many=True
                ).data,
                "recent_transactions": StellarSettlementTransactionSerializer(
                    recent_txs, many=True
                ).data,
            }
        )


class ExpenseGroupViewSet(viewsets.ModelViewSet):
    """
    Manage expense groups created by or shared with the authenticated user.
    """
    queryset = ExpenseGroup.objects.none()
    serializer_class = ExpenseGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "description"]

    def get_permissions(self):
        if self.action == "by_invite":
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ExpenseGroup.objects.none()
        user = self.request.user
        return (
            ExpenseGroup.objects.filter(
                models.Q(created_by=user) | models.Q(memberships__user=user)
            )
            .prefetch_related("memberships__user", "bills__shares")
            .distinct()
        )

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        qs = self.get_queryset()
        if str(lookup).isdigit():
            obj = qs.filter(id=int(lookup)).first()
            if obj:
                return obj
        obj = qs.filter(slug=str(lookup)).first()
        if obj:
            return obj
        return super().get_object()

    def create(self, request, *args, **kwargs):
        user = request.user
        name = (request.data.get("name") or "").strip()
        description = (
            request.data.get("description")
            or "Shared expenses settled in simulated USDC."
        ).strip()
        category = (request.data.get("category") or "Home & Rent").strip()
        location = (request.data.get("location") or "").strip()
        icon = (request.data.get("icon") or "🏠").strip()
        cover_color = (
            request.data.get("cover_color")
            or request.data.get("coverColor")
            or "#15803D"
        ).strip()
        participant_ids = request.data.get("participant_ids") or []
        first_member = (
            request.data.get("first_member")
            or request.data.get("firstMember")
            or ""
        ).strip()
        if not name:
            return Response(
                {"detail": "Group name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slug_base = "".join(ch for ch in name.lower() if ch.isalnum())[:12] or "grp"
        slug = f"{slug_base}-{uuid.uuid4().hex[:4]}"
        custom_invite = (
            request.data.get("invite_code")
            or request.data.get("inviteCode")
            or ""
        ).strip()
        if custom_invite:
            if not custom_invite.startswith("raba.pay/join/"):
                if "/join/" in custom_invite:
                    invite_code = f"raba.pay/join/{custom_invite.split('/join/')[-1]}"
                elif "/" in custom_invite:
                    invite_code = f"raba.pay/join/{custom_invite.split('/')[-1]}"
                else:
                    invite_code = f"raba.pay/join/{custom_invite}"
            else:
                invite_code = custom_invite
        else:
            invite_code = f"raba.pay/join/{slug_base[:4]}{uuid.uuid4().hex[:4]}"

        group = ExpenseGroup.objects.create(
            slug=slug,
            name=name,
            description=description,
            category=category,
            location=location,
            icon=icon,
            cover_color=cover_color,
            invite_code=invite_code,
            created_by=user,
        )
        GroupMembership.objects.create(
            group=group,
            user=user,
            invited_name=user.display_name or user.username,
            invited_email=user.email,
            invited_stellar_address=user.stellar_address or "",
            role=GroupMembership.ROLE_ADMIN,
            status=GroupMembership.STATUS_ACTIVE,
        )

        # Handle first invited member if provided during group creation
        if first_member:
            p_name = ""
            p_email = ""
            p_addr = ""
            if "(" in first_member and ")" in first_member:
                parts = first_member.split("(", 1)
                p_name = parts[0].strip()
                rest = parts[1].rstrip(")").strip()
                if "@" in rest:
                    p_email = rest
                elif rest.startswith("G") and len(rest) == 56:
                    p_addr = rest
            elif "@" in first_member:
                p_email = first_member
                p_name = p_email.split("@")[0].capitalize()
            elif first_member.startswith("G") and len(first_member) == 56:
                p_addr = first_member
                p_name = format_short_stellar_address(p_addr)
            else:
                p_name = first_member

            target_user = None
            if p_addr:
                target_user = User.objects.filter(stellar_address=p_addr).first()
            if not target_user and p_email:
                target_user = User.objects.filter(email__iexact=p_email).first()

            if target_user and target_user != user:
                GroupMembership.objects.create(
                    group=group,
                    user=target_user,
                    invited_name=p_name or target_user.display_name or target_user.username,
                    invited_email=p_email or target_user.email,
                    invited_stellar_address=p_addr or (target_user.stellar_address or ""),
                    role=GroupMembership.ROLE_MEMBER,
                    status=GroupMembership.STATUS_ACTIVE,
                )
            elif p_name or p_email or p_addr:
                GroupMembership.objects.create(
                    group=group,
                    user=None,
                    invited_name=p_name,
                    invited_email=p_email,
                    invited_stellar_address=p_addr,
                    role=GroupMembership.ROLE_MEMBER,
                    status=GroupMembership.STATUS_INVITED,
                )

        for pid in set(participant_ids):
            if int(pid) == user.id:
                continue
            peer = User.objects.filter(id=int(pid)).first()
            if peer:
                GroupMembership.objects.get_or_create(
                    group=group,
                    user=peer,
                    defaults={
                        "invited_email": peer.email,
                        "invited_stellar_address": peer.stellar_address or "",
                        "role": GroupMembership.ROLE_MEMBER,
                        "status": GroupMembership.STATUS_ACTIVE,
                    },
                )

        serializer = self.get_serializer(group)
        data = dict(serializer.data)
        data["workspace"] = serialize_frontend_workspace(user)
        return Response(data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Lookup expense group info by invite code",
    )
    @action(detail=False, methods=["get"], url_path="by-invite", permission_classes=[permissions.AllowAny])
    def by_invite(self, request):
        raw_code = (request.query_params.get("code") or request.query_params.get("invite_code") or "").strip()
        if not raw_code:
            return Response({"detail": "Invite code is required."}, status=status.HTTP_400_BAD_REQUEST)

        code = raw_code
        if "/join/" in code:
            code = code.split("/join/")[-1].strip("/")
        elif "/" in code:
            code = code.split("/")[-1].strip("/")

        group = (
            ExpenseGroup.objects.filter(
                models.Q(invite_code=raw_code)
                | models.Q(invite_code__endswith=code)
                | models.Q(slug=code)
                | (
                    models.Q(slug__istartswith=code[:4])
                    | models.Q(invite_code__icontains=code[:4])
                    if len(code) >= 4
                    else models.Q(pk__in=[])
                )
            )
            .select_related("created_by")
            .first()
        )
        if not group:
            return Response({"detail": "We can’t find this invite."}, status=status.HTTP_404_NOT_FOUND)

        is_member = False
        if request.user.is_authenticated:
            is_member = GroupMembership.objects.filter(
                group=group, user=request.user, status=GroupMembership.STATUS_ACTIVE
            ).exists()

        creator_name = group.created_by.display_name or group.created_by.username or "A member"
        active_members_count = group.memberships.filter(status=GroupMembership.STATUS_ACTIVE).count()

        return Response({
            "id": group.id,
            "slug": group.slug,
            "name": group.name,
            "description": group.description,
            "category": group.category,
            "location": group.location,
            "icon": group.icon,
            "coverColor": group.cover_color,
            "inviteCode": group.invite_code,
            "creatorName": creator_name,
            "memberCount": active_members_count,
            "isMember": is_member,
        })

    @extend_schema(
        summary="Join an expense group using an invite code",
    )
    @action(detail=False, methods=["post"], url_path="join", permission_classes=[permissions.IsAuthenticated])
    def join_by_invite(self, request):
        user = request.user
        raw_code = (request.data.get("code") or request.data.get("invite_code") or "").strip()
        if not raw_code:
            return Response({"detail": "Invite code is required."}, status=status.HTTP_400_BAD_REQUEST)

        code = raw_code
        if "/join/" in code:
            code = code.split("/join/")[-1].strip("/")
        elif "/" in code:
            code = code.split("/")[-1].strip("/")

        group = (
            ExpenseGroup.objects.filter(
                models.Q(invite_code=raw_code)
                | models.Q(invite_code__endswith=code)
                | models.Q(slug=code)
                | (
                    models.Q(slug__istartswith=code[:4])
                    | models.Q(invite_code__icontains=code[:4])
                    if len(code) >= 4
                    else models.Q(pk__in=[])
                )
            )
            .first()
        )
        if not group:
            return Response({"detail": "Invalid or expired invite link."}, status=status.HTTP_404_NOT_FOUND)

        existing = GroupMembership.objects.filter(group=group, user=user).first()
        if existing and existing.status == GroupMembership.STATUS_ACTIVE:
            return Response({
                "joined": False,
                "already_member": True,
                "group_id": group.slug or str(group.id),
                "workspace": serialize_frontend_workspace(user),
            })

        invited_placeholder = GroupMembership.objects.filter(
            group=group,
            user__isnull=True,
            status=GroupMembership.STATUS_INVITED,
        ).filter(
            models.Q(invited_email__iexact=user.email)
            | (models.Q(invited_stellar_address=user.stellar_address) if user.stellar_address else models.Q(pk__in=[]))
        ).first()

        if invited_placeholder:
            invited_placeholder.user = user
            invited_placeholder.status = GroupMembership.STATUS_ACTIVE
            invited_placeholder.save(update_fields=["user", "status"])
        elif existing:
            existing.status = GroupMembership.STATUS_ACTIVE
            existing.save(update_fields=["status"])
        else:
            GroupMembership.objects.create(
                group=group,
                user=user,
                invited_name=user.display_name or user.username,
                invited_email=user.email,
                invited_stellar_address=user.stellar_address or "",
                role=GroupMembership.ROLE_MEMBER,
                status=GroupMembership.STATUS_ACTIVE,
            )

        ActivityLog.objects.create(
            group=group,
            actor=user,
            actor_initial=((user.display_name or user.username or "M")[0]).upper(),
            avatar_bg=user.avatar_bg or "#166534",
            avatar_text=user.avatar_text or "#FFFFFF",
            title=f"{user.display_name or user.username} joined {group.name}",
            subtitle="Joined group via invite link",
            timestamp_label="Just now",
            day_group="Today",
        )

        return Response({
            "joined": True,
            "already_member": False,
            "group_id": group.slug or str(group.id),
            "workspace": serialize_frontend_workspace(user),
        }, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        group = self.get_object()
        user = request.user
        name = (request.data.get("name") or "").strip()
        description = request.data.get("description")
        if name:
            group.name = name
        if description is not None:
            group.description = description
        group.save()
        data = dict(self.get_serializer(group).data)
        data["workspace"] = serialize_frontend_workspace(user)
        return Response(data, status=status.HTTP_200_OK)

    @extend_schema(
        request=GroupInviteSerializer,
        responses={201: GroupMembershipSerializer},
        summary="Add or invite a participant to an expense group",
    )
    @action(detail=True, methods=["post"], url_path="invite")
    def invite_participant(self, request, pk=None):
        group = self.get_object()
        user = request.user
        serializer = GroupInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data.get("role", GroupMembership.ROLE_MEMBER)
        participants_data = serializer.validated_data.get("participants")

        if participants_data:
            created_memberships = []
            for item in participants_data:
                addr = (item.get("stellar_address") or "").strip()
                p_name = (item.get("name") or "").strip() or format_short_stellar_address(addr)
                p_email = (item.get("email") or "").strip()
                target_user = User.objects.filter(stellar_address=addr).first()
                if target_user:
                    existing = GroupMembership.objects.filter(group=group, user=target_user).first()
                    if existing:
                        if existing.status != GroupMembership.STATUS_ACTIVE:
                            existing.status = GroupMembership.STATUS_ACTIVE
                            existing.save(update_fields=["status"])
                        created_memberships.append(existing)
                    else:
                        m = GroupMembership.objects.create(
                            group=group,
                            user=target_user,
                            invited_name=p_name or target_user.name,
                            invited_email=p_email or target_user.email,
                            invited_stellar_address=addr,
                            role=role,
                            status=GroupMembership.STATUS_ACTIVE,
                        )
                        created_memberships.append(m)
                else:
                    existing_inv = GroupMembership.objects.filter(
                        group=group, invited_stellar_address=addr
                    ).first()
                    if existing_inv:
                        created_memberships.append(existing_inv)
                    else:
                        m = GroupMembership.objects.create(
                            group=group,
                            user=None,
                            invited_name=p_name,
                            invited_email=p_email,
                            invited_stellar_address=addr,
                            role=role,
                            status=GroupMembership.STATUS_INVITED,
                        )
                        created_memberships.append(m)
            return Response(
                {
                    "added_count": len(created_memberships),
                    "workspace": serialize_frontend_workspace(user),
                },
                status=status.HTTP_201_CREATED,
            )

        target_user = serializer.validated_data.get("target_user")
        stellar_address = (
            serializer.validated_data.get("stellar_address") or ""
        ).strip()
        name = (serializer.validated_data.get("name") or "").strip()
        if not name and stellar_address:
            name = format_short_stellar_address(stellar_address)
        email = (serializer.validated_data.get("email") or "").strip()

        if target_user:
            existing = GroupMembership.objects.filter(
                group=group, user=target_user
            ).first()
            if existing:
                if existing.status != GroupMembership.STATUS_ACTIVE:
                    existing.status = GroupMembership.STATUS_ACTIVE
                    existing.save(update_fields=["status"])
                data = dict(GroupMembershipSerializer(existing).data)
                data["workspace"] = serialize_frontend_workspace(user)
                return Response(data, status=status.HTTP_200_OK)
            membership = GroupMembership.objects.create(
                group=group,
                user=target_user,
                invited_name=name or target_user.name,
                invited_email=email or target_user.email,
                invited_stellar_address=target_user.stellar_address
                or stellar_address,
                role=role,
                status=GroupMembership.STATUS_ACTIVE,
            )
            data = dict(GroupMembershipSerializer(membership).data)
            data["workspace"] = serialize_frontend_workspace(user)
            return Response(data, status=status.HTTP_201_CREATED)

        membership = GroupMembership.objects.create(
            group=group,
            user=None,
            invited_name=name or (format_short_stellar_address(stellar_address) if stellar_address else "Member"),
            invited_email=email,
            invited_stellar_address=stellar_address,
            role=role,
            status=GroupMembership.STATUS_INVITED,
        )
        data = dict(GroupMembershipSerializer(membership).data)
        data["workspace"] = serialize_frontend_workspace(user)
        return Response(data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Remove a member from an expense group",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["post"], url_path="remove-member")
    def remove_member(self, request, pk=None):
        group = self.get_object()
        user = request.user
        member_id = str(request.data.get("member_id") or "").strip()
        if member_id.startswith("invited-"):
            inv_pk = member_id.replace("invited-", "")
            if inv_pk.isdigit():
                GroupMembership.objects.filter(
                    group=group, id=int(inv_pk)
                ).delete()
        elif member_id.isdigit():
            GroupMembership.objects.filter(
                group=group, user_id=int(member_id)
            ).exclude(user=user).delete()
        else:
            GroupMembership.objects.filter(
                group=group,
                user__username__iexact=member_id,
            ).exclude(user=user).delete()
        return Response(
            {"workspace": serialize_frontend_workspace(user)},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Revoke and rotate group invite link",
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["post"], url_path="revoke-invite")
    def revoke_invite(self, request, pk=None):
        group = self.get_object()
        user = request.user
        group.invite_code = generate_invite_code()
        group.save(update_fields=["invite_code", "updated_at"])
        return Response(
            {
                "invite_code": group.invite_code,
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Get Group Dashboard: expenses, balances, and payment history"
    )
    @action(detail=True, methods=["get"], url_path="dashboard")
    def group_dashboard(self, request, pk=None):
        group = self.get_object()
        bills = group.bills.prefetch_related(
            "shares__participant", "transactions"
        ).all()
        transactions = StellarSettlementTransaction.objects.filter(
            bill__group=group
        ).select_related("participant", "bill")

        recalculate_group_balances_task.delay(group.id)

        settled_count = sum(
            1 for b in bills if b.status == SharedBill.STATUS_SETTLED
        )
        open_count = sum(
            1 for b in bills if b.status != SharedBill.STATUS_SETTLED
        )
        total_amount = sum(
            (b.total_amount for b in bills), Decimal("0.0000000")
        )
        total_paid = sum((b.total_paid for b in bills), Decimal("0.0000000"))
        outstanding = sum(
            (b.outstanding_amount for b in bills), Decimal("0.0000000")
        )

        return Response(
            {
                "group": ExpenseGroupSerializer(group).data,
                "metrics": {
                    "total_bills": len(bills),
                    "settled_bills": settled_count,
                    "active_bills": open_count,
                    "total_amount_usdc": str(
                        total_amount.quantize(Decimal("0.0000001"))
                    ),
                    "total_paid_usdc": str(
                        total_paid.quantize(Decimal("0.0000001"))
                    ),
                    "outstanding_amount_usdc": str(
                        outstanding.quantize(Decimal("0.0000001"))
                    ),
                },
                "bills": SharedBillSerializer(bills, many=True).data,
                "payment_history": StellarSettlementTransactionSerializer(
                    transactions, many=True
                ).data,
            }
        )


class SharedBillViewSet(viewsets.ModelViewSet):
    """
    Create shared bills, split equally or by custom amounts, edit or cancel bills,
    inspect payment progress, generate Stellar Testnet payment intents, and verify/settle
    individual shares in simulated USDC.
    """
    queryset = SharedBill.objects.none()
    serializer_class = SharedBillSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["group", "status", "split_type", "recipient"]
    search_fields = ["description"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return SharedBill.objects.none()
        user = self.request.user
        return (
            SharedBill.objects.filter(
                models.Q(group__created_by=user)
                | models.Q(group__memberships__user=user)
                | models.Q(created_by=user)
                | models.Q(recipient=user)
                | models.Q(shares__participant=user)
            )
            .select_related("group", "created_by", "recipient")
            .prefetch_related("shares__participant", "transactions__participant")
            .distinct()
        )

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        qs = self.get_queryset()
        if str(lookup).isdigit():
            obj = qs.filter(id=int(lookup)).first()
            if obj:
                return obj
        obj = qs.filter(slug=str(lookup)).first()
        if obj:
            return obj
        return super().get_object()

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        if "title" in data and "groupId" in data:
            group_slug = str(data.get("groupId"))
            group = (
                ExpenseGroup.objects.filter(slug=group_slug).first()
                or (
                    ExpenseGroup.objects.filter(id=int(group_slug)).first()
                    if group_slug.isdigit()
                    else None
                )
            )
            if not group:
                return Response(
                    {"detail": "Selected group does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            title = (data.get("title") or "Shared Bill").strip()
            total_amount = Decimal(
                str(data.get("totalAmount") or "0")
            ).quantize(Decimal("0.0000001"))
            split_mode = str(data.get("splitMode") or "equal").upper()
            participants_in = data.get("participants") or []

            resolved_participants = []
            for p in participants_in:
                m_id = str(p.get("memberId") or "")
                share_val = Decimal(str(p.get("share") or "0")).quantize(
                    Decimal("0.0000001")
                )
                if m_id == "sam" or p.get("isYou"):
                    u = user
                elif m_id.isdigit():
                    u = User.objects.filter(id=int(m_id)).first()
                elif m_id.startswith("invited-"):
                    inv_pk = m_id.replace("invited-", "")
                    membership = (
                        GroupMembership.objects.filter(id=int(inv_pk)).first()
                        if inv_pk.isdigit()
                        else None
                    )
                    if membership and membership.user:
                        u = membership.user
                    else:
                        inv_name = (
                            membership.invited_name
                            if membership and membership.invited_name
                            else (p.get("name") or "Member")
                        )
                        clean_uname = (
                            "".join(c for c in inv_name.lower() if c.isalnum())
                            or "member"
                        ) + f"_{uuid.uuid4().hex[:4]}"
                        u = User.objects.create(
                            username=clean_uname,
                            email=(membership.invited_email if membership and membership.invited_email else f"{clean_uname}@invited.rabapay.io"),
                            display_name=inv_name,
                            first_name=inv_name,
                            stellar_address=(membership.invited_stellar_address if membership and membership.invited_stellar_address else None),
                            avatar_bg=p.get("avatarBg") or "#F5F5F4",
                            avatar_text=p.get("avatarText") or "#57534E",
                        )
                        if membership:
                            membership.user = u
                            membership.save(update_fields=["user"])
                else:
                    u = User.objects.filter(username__iexact=m_id).first()
                    if not u:
                        clean_uname = (
                            "".join(c for c in m_id.lower() if c.isalnum())
                            or f"member_{uuid.uuid4().hex[:4]}"
                        )
                        u, _ = User.objects.get_or_create(
                            username=clean_uname,
                            defaults={
                                "email": f"{clean_uname}@invited.rabapay.io",
                                "display_name": p.get("name")
                                or clean_uname.capitalize(),
                                "avatar_bg": p.get("avatarBg") or "#F5F5F4",
                                "avatar_text": p.get("avatarText") or "#57534E",
                            },
                        )
                if u:
                    resolved_participants.append((u, share_val))

            if not resolved_participants:
                resolved_participants = [(user, total_amount)]

            service = StellarTestnetService()
            bill = SharedBill.objects.create(
                group=group,
                created_by=user,
                recipient=user,
                recipient_stellar_address=user.stellar_address or "",
                description=title,
                total_amount=total_amount,
                asset_issuer=service.usdc_issuer,
                split_type=SharedBill.SPLIT_CUSTOM
                if split_mode == "CUSTOM"
                else SharedBill.SPLIT_EQUAL,
                status=SharedBill.STATUS_PARTIALLY_PAID,
                created_label="Just now",
            )
            bill.slug = f"bill-{bill.id}"
            bill.contract_bill_id = bill.id
            bill.save(update_fields=["slug", "contract_bill_id"])

            if split_mode == "EQUAL":
                eq_amounts = calculate_equal_split_amounts(
                    total_amount, len(resolved_participants)
                )
                resolved_participants = [
                    (u, amt)
                    for (u, _), amt in zip(resolved_participants, eq_amounts)
                ]

            for u, amt in resolved_participants:
                is_creator = u.id == user.id
                BillShare.objects.create(
                    bill=bill,
                    participant=u,
                    amount_due=amt,
                    amount_paid=amt if is_creator else Decimal("0.0000000"),
                    is_paid=is_creator,
                    is_payer=is_creator,
                    status=BillShare.STATUS_PAID
                    if is_creator
                    else BillShare.STATUS_PENDING,
                    paid_at_label="Paid the bill"
                    if is_creator
                    else "Not paid yet",
                    paid_at=timezone.now() if is_creator else None,
                )

            bill.recalculate_status()
            ActivityLog.objects.create(
                group=group,
                actor=user,
                actor_initial=user.initial,
                avatar_bg=user.avatar_bg,
                avatar_text=user.avatar_text,
                title=f"{user.name} added {bill.description}",
                subtitle=f"{bill.total_amount:.2f} USDC · Just now",
                timestamp_label="Just now",
                day_group="Today",
            )

            resp_data = dict(self.get_serializer(bill).data)
            resp_data["workspace"] = serialize_frontend_workspace(user)
            return Response(resp_data, status=status.HTTP_201_CREATED)

        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        bill = self.get_object()
        user = request.user
        title = request.data.get("title") or request.data.get("description")
        total_amount_raw = request.data.get("totalAmount") or request.data.get(
            "total_amount"
        )
        group_id_raw = request.data.get("groupId") or request.data.get("group")

        if title:
            bill.description = str(title).strip()
        if group_id_raw:
            grp = ExpenseGroup.objects.filter(
                slug=str(group_id_raw)
            ).first() or (
                ExpenseGroup.objects.filter(id=int(group_id_raw)).first()
                if str(group_id_raw).isdigit()
                else None
            )
            if grp:
                bill.group = grp

        if total_amount_raw is not None:
            new_total = Decimal(str(total_amount_raw)).quantize(
                Decimal("0.0000001")
            )
            if new_total > 0 and new_total != bill.total_amount:
                bill.total_amount = new_total
                shares = list(bill.shares.all())
                if shares:
                    eq_amounts = calculate_equal_split_amounts(
                        new_total, len(shares)
                    )
                    for sh, new_amt in zip(shares, eq_amounts):
                        if sh.participant_id == user.id:
                            bill.edited_by_name = user.name
                            bill.edited_from_share = sh.amount_due
                            bill.edited_to_share = new_amt
                        sh.amount_due = new_amt
                        if sh.is_paid:
                            sh.amount_paid = new_amt
                        sh.save(
                            update_fields=[
                                "amount_due",
                                "amount_paid",
                                "updated_at",
                            ]
                        )

        bill.save()
        ActivityLog.objects.create(
            group=bill.group,
            actor=user,
            actor_initial=user.initial,
            avatar_bg=user.avatar_bg,
            avatar_text=user.avatar_text,
            title=f"{user.name} edited {bill.description}",
            subtitle=f"{bill.total_amount:.2f} USDC · Just now",
            timestamp_label="Just now",
            day_group="Today",
        )
        data = dict(self.get_serializer(bill).data)
        data["workspace"] = serialize_frontend_workspace(user)
        return Response(data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Cancel an open shared bill",
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_bill(self, request, pk=None):
        bill = self.get_object()
        user = request.user
        bill.status = SharedBill.STATUS_CANCELLED
        bill.save(update_fields=["status", "updated_at"])
        ActivityLog.objects.create(
            group=bill.group,
            actor=user,
            actor_initial=user.initial,
            avatar_bg=user.avatar_bg,
            avatar_text=user.avatar_text,
            title=f"{user.name} cancelled {bill.description}",
            subtitle="Nothing is owed · Just now",
            timestamp_label="Just now",
            day_group="Today",
        )
        return Response(
            {
                "bill": self.get_serializer(bill).data,
                "workspace": serialize_frontend_workspace(user),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=ResplitBillSerializer,
        responses={200: SharedBillSerializer},
        summary="Update or re-split an unpaid bill (equal or custom amounts)",
    )
    @action(detail=True, methods=["post"], url_path="split")
    def split_bill(self, request, pk=None):
        bill = self.get_object()
        if bill.shares.filter(is_paid=True, is_payer=False).exists():
            return Response(
                {
                    "detail": "Cannot re-split a bill that already has paid participant shares."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ResplitBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        split_type = serializer.validated_data["split_type"]
        participant_ids = serializer.validated_data.get("participant_ids", [])
        custom_shares = serializer.validated_data.get("custom_shares", [])

        with transaction.atomic():
            if split_type == SharedBill.SPLIT_EQUAL:
                if not participant_ids:
                    participant_ids = list(
                        bill.shares.values_list("participant_id", flat=True)
                    )
                if not participant_ids or len(participant_ids) != len(
                    set(participant_ids)
                ):
                    return Response(
                        {"detail": "Valid unique participant_ids are required."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                amounts = calculate_equal_split_amounts(
                    bill.total_amount, len(participant_ids)
                )
                bill.shares.all().delete()
                for pid, amt in zip(participant_ids, amounts):
                    BillShare.objects.create(
                        bill=bill, participant_id=pid, amount_due=amt
                    )
                bill.split_type = SharedBill.SPLIT_EQUAL
                bill.save(update_fields=["split_type", "updated_at"])
            else:
                if not custom_shares:
                    return Response(
                        {
                            "detail": "custom_shares list is required for CUSTOM split."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                total_custom = sum(
                    (
                        item["amount_due"].quantize(Decimal("0.0000001"))
                        for item in custom_shares
                    ),
                    Decimal("0.0000000"),
                )
                if total_custom != bill.total_amount.quantize(
                    Decimal("0.0000001")
                ):
                    return Response(
                        {
                            "detail": (
                                f"Individual custom shares sum ({total_custom} USDC) must equal "
                                f"the total bill amount ({bill.total_amount} USDC)."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                seen = set()
                for item in custom_shares:
                    if item["participant_id"] in seen or item[
                        "amount_due"
                    ] <= Decimal("0"):
                        return Response(
                            {
                                "detail": "Duplicate participants or non-positive amounts are not allowed."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    seen.add(item["participant_id"])

                bill.shares.all().delete()
                for item in custom_shares:
                    BillShare.objects.create(
                        bill=bill,
                        participant_id=item["participant_id"],
                        amount_due=item["amount_due"].quantize(
                            Decimal("0.0000001")
                        ),
                    )
                bill.split_type = SharedBill.SPLIT_CUSTOM
                bill.save(update_fields=["split_type", "updated_at"])

        bill.refresh_from_db()
        return Response(
            SharedBillSerializer(bill).data, status=status.HTTP_200_OK
        )

    @extend_schema(
        summary="Get Stellar Testnet & Soroban payment intent for a participant share"
    )
    @action(detail=True, methods=["get"], url_path="payment-intent")
    def payment_intent(self, request, pk=None):
        bill = self.get_object()
        active_user = request.user
        participant_id = request.query_params.get(
            "participant_id", active_user.id
        )
        share = (
            bill.shares.filter(participant_id=participant_id)
            .select_related("participant")
            .first()
        )
        if not share:
            return Response(
                {"detail": "No share found for this participant on this bill."},
                status=status.HTTP_404_NOT_FOUND,
            )

        service = StellarTestnetService()
        payer_address = share.participant.stellar_address or active_user.stellar_address or ""
        intent = service.build_payment_intent(
            bill_id=bill.id,
            contract_bill_id=bill.contract_bill_id,
            participant_address=payer_address or "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            recipient_address=bill.recipient_stellar_address,
            amount_due=share.amount_due,
        )
        intent["share_id"] = share.id
        intent["is_paid"] = share.is_paid
        return Response(intent, status=status.HTTP_200_OK)

    @extend_schema(
        request=PaymentSubmissionSerializer,
        summary="Pay & verify a participant share using simulated USDC on Stellar Testnet",
    )
    @action(detail=True, methods=["post"], url_path="pay")
    def pay_share(self, request, pk=None):
        bill = self.get_object()
        active_user = request.user
        data = (
            request.data.copy()
            if hasattr(request.data, "copy")
            else dict(request.data)
        )
        if not data.get("tx_hash"):
            data["tx_hash"] = uuid.uuid4().hex + uuid.uuid4().hex

        serializer = PaymentSubmissionSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        tx_hash = serializer.validated_data["tx_hash"]
        verify_on_horizon = serializer.validated_data.get(
            "verify_on_horizon"
        )
        async_processing = serializer.validated_data.get(
            "async_processing", False
        )

        if StellarSettlementTransaction.objects.filter(tx_hash=tx_hash).exists():
            return Response(
                {
                    "detail": "Duplicate settlement record rejected: transaction hash has already been used."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if bill.status == SharedBill.STATUS_SETTLED:
            return Response(
                {"detail": "Bill is already settled. Duplicate settlement rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant_id = serializer.validated_data.get("participant_id")
        share = None
        if participant_id:
            share = (
                bill.shares.filter(participant_id=participant_id)
                .select_related("participant")
                .first()
            )
        if not share:
            share = (
                bill.shares.filter(participant=active_user, is_paid=False)
                .select_related("participant")
                .first()
            )
        if not share and active_user.stellar_address:
            share = (
                bill.shares.filter(
                    participant__stellar_address=active_user.stellar_address,
                    is_paid=False,
                )
                .select_related("participant")
                .first()
            )
        if not share:
            share = (
                bill.shares.filter(is_paid=False, is_payer=False)
                .select_related("participant")
                .first()
            )

        if not share:
            return Response(
                {"detail": "No unpaid participant share found for this bill."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if share.is_paid:
            return Response(
                {
                    "detail": "Duplicate settlement rejected: this participant's share is already paid."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        submitted_amount = serializer.validated_data.get("amount")
        if submitted_amount is not None:
            if submitted_amount.quantize(Decimal("0.0000001")) != share.amount_due:
                return Response(
                    {
                        "detail": (
                            f"Payment amount ({submitted_amount} USDC) must match "
                            f"participant's share obligation ({share.amount_due} USDC)."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            submitted_amount = share.amount_due

        payer_address = (
            serializer.validated_data.get("payer_stellar_address") or ""
        ).strip()
        if not payer_address or not is_valid_stellar_public_key(payer_address):
            payer_address = (
                active_user.stellar_address
                or share.participant.stellar_address
                or "GCAD5PDJRNUAASBJSRL4YNNUCIB723PYNIGMU7FWSUKMS5IPUYIU46YI"
            )

        if not is_valid_stellar_public_key(bill.recipient_stellar_address):
            valid_recip = (
                bill.recipient.stellar_address
                or "GCAD5PDJRNUAASBJSRL4YNNUCIB723PYNIGMU7FWSUKMS5IPUYIU46YI"
            )
            bill.recipient_stellar_address = valid_recip
            bill.save(update_fields=["recipient_stellar_address"])

        if async_processing:
            async_res = verify_and_settle_payment_task.delay(
                bill_id=bill.id,
                participant_id=share.participant.id,
                tx_hash=tx_hash,
                amount_str=str(submitted_amount),
                payer_stellar_address=payer_address,
                verify_on_horizon=verify_on_horizon,
            )
            return Response(
                {
                    "status": "queued",
                    "task_id": async_res.id,
                    "bill_id": bill.id,
                    "tx_hash": tx_hash,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        result = verify_and_settle_payment_task(
            bill_id=bill.id,
            participant_id=share.participant.id,
            tx_hash=tx_hash,
            amount_str=str(submitted_amount),
            payer_stellar_address=payer_address,
            verify_on_horizon=verify_on_horizon,
        )

        if result.get("status") != "settled":
            return Response(
                {"detail": result.get("reason", "Payment verification failed.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bill.refresh_from_db()
        return Response(
            {
                "settlement": result,
                "bill": SharedBillSerializer(bill).data,
                "workspace": serialize_frontend_workspace(active_user),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Get detailed payment progress, paid/unpaid participants, and outstanding balances"
    )
    @action(detail=True, methods=["get"], url_path="progress")
    def payment_progress(self, request, pk=None):
        bill = self.get_object()
        shares = bill.shares.select_related("participant").all()
        paid_participants = [
            BillShareSerializer(s).data for s in shares if s.is_paid
        ]
        unpaid_participants = [
            BillShareSerializer(s).data for s in shares if not s.is_paid
        ]
        progress_pct = (
            float((bill.total_paid / bill.total_amount) * Decimal("100"))
            if bill.total_amount > 0
            else 0.0
        )

        return Response(
            {
                "bill_id": bill.id,
                "contract_bill_id": bill.contract_bill_id,
                "description": bill.description,
                "status": bill.status,
                "split_type": bill.split_type,
                "total_amount_usdc": str(bill.total_amount),
                "total_paid_usdc": str(bill.total_paid),
                "outstanding_amount_usdc": str(bill.outstanding_amount),
                "progress_percentage": round(progress_pct, 2),
                "paid_count": len(paid_participants),
                "unpaid_count": len(unpaid_participants),
                "paid_participants": paid_participants,
                "unpaid_participants": unpaid_participants,
                "settled_at": bill.settled_at,
            }
        )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and mark user notifications as read.
    """
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)

    @extend_schema(
        summary="Mark a single notification as read",
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        user = request.user
        Notification.objects.filter(id=pk, user=user).update(unread=False)
        return Response(
            {"workspace": serialize_frontend_workspace(user)},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Mark all notifications for the current user as read",
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        user = request.user
        Notification.objects.filter(user=user, unread=True).update(unread=False)
        return Response(
            {"workspace": serialize_frontend_workspace(user)},
            status=status.HTTP_200_OK,
        )


class StellarSettlementTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and inspect verified Stellar Testnet simulated USDC settlement transactions.
    """
    queryset = StellarSettlementTransaction.objects.none()
    serializer_class = StellarSettlementTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["bill", "participant", "verification_status", "asset_code"]
    search_fields = [
        "tx_hash",
        "payer_stellar_address",
        "recipient_stellar_address",
        "memo",
    ]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return StellarSettlementTransaction.objects.none()
        user = self.request.user
        return (
            StellarSettlementTransaction.objects.filter(
                models.Q(participant=user)
                | models.Q(bill__recipient=user)
                | models.Q(bill__created_by=user)
                | models.Q(bill__group__memberships__user=user)
            )
            .select_related("bill", "share", "participant")
            .distinct()
        )


class SmartContractMetadataView(APIView):
    """
    Inspect the integrated RabaPay Stellar Testnet Soroban Smart Contract metadata,
    contract ID, simulated USDC asset details, and exported functions.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get Stellar Testnet & Soroban Smart Contract info",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        service = StellarTestnetService()
        return Response(service.get_contract_metadata(), status=status.HTTP_200_OK)
