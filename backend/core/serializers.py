from decimal import Decimal
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
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
from .stellar_service import (
    StellarTestnetService,
    calculate_equal_split_amounts,
    is_valid_stellar_public_key,
    is_valid_tx_hash,
)


def format_short_stellar_address(addr: str) -> str:
    if not addr:
        return ""
    cleaned = addr.strip()
    if len(cleaned) >= 12 and "…" not in cleaned:
        return f"{cleaned[:4]}…{cleaned[-4:]}"
    return cleaned


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    stellar_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "name",
            "display_name",
            "email",
            "password",
            "first_name",
            "last_name",
            "stellar_address",
            "wallet_provider",
            "simulated_usdc_balance",
            "wallet_connected_at",
            "created_at",
        )
        read_only_fields = ("id", "simulated_usdc_balance", "wallet_connected_at", "created_at")

    def validate_stellar_address(self, value):
        if not value:
            return None
        cleaned = value.strip()
        if not is_valid_stellar_public_key(cleaned):
            raise serializers.ValidationError(
                "Invalid Stellar Testnet public key. Must start with 'G' and be 56 characters."
            )
        if User.objects.filter(stellar_address=cleaned).exists():
            raise serializers.ValidationError(
                "This Stellar wallet address is already connected to another user."
            )
        return cleaned

    def create(self, validated_data):
        password = validated_data.pop("password")
        name_val = validated_data.pop("name", "").strip()
        if name_val and not validated_data.get("display_name"):
            validated_data["display_name"] = name_val
            validated_data["first_name"] = name_val
        elif not validated_data.get("display_name"):
            validated_data["display_name"] = validated_data.get("username", "")

        stellar_addr = validated_data.get("stellar_address")
        if stellar_addr:
            validated_data["wallet_connected_at"] = timezone.now()
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Automatically activate any pending group invitations for this user's email or Stellar wallet
        q_filter = GroupMembership.objects.filter(
            status=GroupMembership.STATUS_INVITED,
            user__isnull=True,
        )
        for invite in q_filter.filter(invited_email__iexact=user.email):
            invite.user = user
            invite.status = GroupMembership.STATUS_ACTIVE
            invite.save()
        if stellar_addr:
            for invite in q_filter.filter(invited_stellar_address=stellar_addr):
                invite.user = user
                invite.status = GroupMembership.STATUS_ACTIVE
                invite.save()

        return user


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    wallet_short = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "name",
            "display_name",
            "email",
            "first_name",
            "last_name",
            "avatar_bg",
            "avatar_text",
            "stellar_address",
            "wallet_short",
            "wallet_provider",
            "simulated_usdc_balance",
            "wallet_connected_at",
            "created_at",
        )
        read_only_fields = ("id", "wallet_connected_at", "created_at")

    def get_name(self, obj) -> str:
        return obj.name

    def get_wallet_short(self, obj) -> str:
        return format_short_stellar_address(obj.stellar_address or "")


class WalletConnectSerializer(serializers.Serializer):
    stellar_address = serializers.CharField(
        max_length=56,
        help_text="Non-custodial Stellar Testnet public key (starts with G).",
    )
    wallet_provider = serializers.CharField(
        max_length=32,
        required=False,
        default="freighter",
        help_text="Wallet provider name (freighter, albedo, xbull, lobstr).",
    )

    def validate_stellar_address(self, value):
        cleaned = (value or "").strip()
        if not is_valid_stellar_public_key(cleaned):
            raise serializers.ValidationError(
                "Invalid Stellar Testnet public key. Must start with 'G' and be 56 characters."
            )
        return cleaned


class WalletAuthSerializer(serializers.Serializer):
    stellar_address = serializers.CharField(
        max_length=56,
        help_text="Stellar Testnet public key from Stellar Wallets Kit.",
    )
    wallet_provider = serializers.CharField(
        max_length=32,
        required=False,
        default="freighter",
    )
    name = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
    )

    def validate_stellar_address(self, value):
        cleaned = (value or "").strip()
        if not is_valid_stellar_public_key(cleaned):
            raise serializers.ValidationError(
                "Invalid Stellar Testnet public key. Must start with 'G' and be 56 characters."
            )
        return cleaned


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)

    class Meta:
        model = GroupMembership
        fields = (
            "id",
            "group",
            "user",
            "user_details",
            "invited_name",
            "invited_email",
            "invited_stellar_address",
            "role",
            "status",
            "invite_token",
            "joined_at",
        )
        read_only_fields = ("id", "group", "invite_token", "joined_at")


class ParticipantItemSerializer(serializers.Serializer):
    stellar_address = serializers.CharField(max_length=56)
    name = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")

    def validate_stellar_address(self, value):
        addr = (value or "").strip()
        if not addr:
            raise serializers.ValidationError("Stellar address is compulsory.")
        if not is_valid_stellar_public_key(addr):
            raise serializers.ValidationError("Invalid Stellar Testnet public key.")
        return addr


class GroupInviteSerializer(serializers.Serializer):
    participants = ParticipantItemSerializer(many=True, required=False)
    user_id = serializers.IntegerField(required=False)
    username = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    stellar_address = serializers.CharField(required=False, allow_blank=True, max_length=56)
    role = serializers.ChoiceField(
        choices=GroupMembership.ROLE_CHOICES,
        default=GroupMembership.ROLE_MEMBER,
    )

    def validate(self, attrs):
        participants = attrs.get("participants")
        if participants is not None:
            if len(participants) == 0:
                raise serializers.ValidationError({"participants": "Provide at least one participant in the collection."})
            return attrs

        user_id = attrs.get("user_id")
        username = (attrs.get("username") or "").strip()
        name = (attrs.get("name") or "").strip()
        email = (attrs.get("email") or "").strip()
        stellar_address = (attrs.get("stellar_address") or "").strip()

        if not any([user_id, username, name, email, stellar_address]):
            raise serializers.ValidationError(
                "Provide a compulsory Stellar address (or user details) to invite or add a participant."
            )

        if stellar_address and not is_valid_stellar_public_key(stellar_address):
            raise serializers.ValidationError(
                {"stellar_address": "Invalid Stellar Testnet public key."}
            )

        target_user = None
        if user_id:
            target_user = User.objects.filter(id=user_id).first()
            if not target_user:
                raise serializers.ValidationError({"user_id": "User not found."})
        elif username:
            target_user = User.objects.filter(username=username).first()
            if not target_user:
                raise serializers.ValidationError({"username": "User not found."})
        elif email:
            target_user = User.objects.filter(email__iexact=email).first()
        elif stellar_address:
            target_user = User.objects.filter(stellar_address=stellar_address).first()

        attrs["target_user"] = target_user
        return attrs


class ExpenseGroupSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source="created_by", read_only=True)
    memberships = GroupMembershipSerializer(many=True, read_only=True)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="Optional list of user IDs to immediately add to the group.",
    )
    total_bills = serializers.SerializerMethodField()
    total_expenses_usdc = serializers.SerializerMethodField()
    outstanding_balance_usdc = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseGroup
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "category",
            "location",
            "icon",
            "cover_color",
            "invite_code",
            "created_by",
            "created_by_details",
            "participant_ids",
            "memberships",
            "total_bills",
            "total_expenses_usdc",
            "outstanding_balance_usdc",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "invite_code", "created_by", "created_at", "updated_at")

    def get_total_bills(self, obj) -> int:
        return obj.bills.count()

    def get_total_expenses_usdc(self, obj) -> str:
        total = sum((b.total_amount for b in obj.bills.all()), Decimal("0.0000000"))
        return str(total.quantize(Decimal("0.0000001")))

    def get_outstanding_balance_usdc(self, obj) -> str:
        total = sum((b.outstanding_amount for b in obj.bills.all()), Decimal("0.0000000"))
        return str(total.quantize(Decimal("0.0000001")))

    @transaction.atomic
    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        creator = self.context["request"].user
        if not validated_data.get("slug"):
            base_slug = (
                validated_data["name"].lower().replace(" ", "-")[:40]
                + f"-{timezone.now().strftime('%H%M%S')}"
            )
            validated_data["slug"] = base_slug
        group = ExpenseGroup.objects.create(created_by=creator, **validated_data)

        GroupMembership.objects.create(
            group=group,
            user=creator,
            invited_email=creator.email,
            invited_stellar_address=creator.stellar_address or "",
            role=GroupMembership.ROLE_ADMIN,
            status=GroupMembership.STATUS_ACTIVE,
        )

        for uid in set(participant_ids):
            if uid == creator.id:
                continue
            u = User.objects.filter(id=uid).first()
            if u:
                GroupMembership.objects.get_or_create(
                    group=group,
                    user=u,
                    defaults={
                        "invited_email": u.email,
                        "invited_stellar_address": u.stellar_address or "",
                        "role": GroupMembership.ROLE_MEMBER,
                        "status": GroupMembership.STATUS_ACTIVE,
                    },
                )
        return group


class BillShareInputSerializer(serializers.Serializer):
    participant_id = serializers.IntegerField()
    amount_due = serializers.DecimalField(
        max_digits=18,
        decimal_places=7,
        required=False,
    )


class BillShareSerializer(serializers.ModelSerializer):
    participant_details = UserSerializer(source="participant", read_only=True)
    outstanding_amount = serializers.SerializerMethodField()

    class Meta:
        model = BillShare
        fields = (
            "id",
            "bill",
            "participant",
            "participant_details",
            "amount_due",
            "amount_paid",
            "outstanding_amount",
            "is_paid",
            "is_payer",
            "status",
            "stellar_tx_hash",
            "paid_at_label",
            "paid_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_outstanding_amount(self, obj) -> str:
        return str(obj.outstanding_amount)


class StellarSettlementTransactionSerializer(serializers.ModelSerializer):
    participant_details = UserSerializer(source="participant", read_only=True)
    bill_description = serializers.CharField(source="bill.description", read_only=True)

    class Meta:
        model = StellarSettlementTransaction
        fields = (
            "id",
            "bill",
            "bill_description",
            "share",
            "participant",
            "participant_details",
            "tx_hash",
            "payer_stellar_address",
            "recipient_stellar_address",
            "amount",
            "asset_code",
            "asset_issuer",
            "memo",
            "direction",
            "counterparty_name",
            "counterparty_initial",
            "avatar_bg",
            "avatar_text",
            "group_name",
            "bill_title",
            "day_group",
            "date_label",
            "fee_label",
            "contract_synced",
            "contract_invocation_hash",
            "ledger_sequence",
            "verification_status",
            "verification_payload",
            "verified_at",
        )
        read_only_fields = fields


class SharedBillSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source="created_by", read_only=True)
    recipient_details = UserSerializer(source="recipient", read_only=True)
    shares = BillShareSerializer(many=True, read_only=True)
    transactions = StellarSettlementTransactionSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    outstanding_amount = serializers.SerializerMethodField()
    paid_participants_count = serializers.SerializerMethodField()
    unpaid_participants_count = serializers.SerializerMethodField()

    # Write-only inputs for creating and splitting the bill
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of participant user IDs for EQUAL split.",
    )
    custom_shares = BillShareInputSerializer(
        many=True,
        write_only=True,
        required=False,
        help_text="List of {participant_id, amount_due} objects for CUSTOM split.",
    )
    recipient_stellar_address = serializers.CharField(
        max_length=56,
        required=False,
        allow_blank=True,
    )
    mark_creator_paid = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = SharedBill
        fields = (
            "id",
            "slug",
            "group",
            "created_by",
            "created_by_details",
            "recipient",
            "recipient_details",
            "recipient_stellar_address",
            "description",
            "total_amount",
            "total_paid",
            "outstanding_amount",
            "asset_code",
            "asset_issuer",
            "split_type",
            "status",
            "contract_bill_id",
            "contract_tx_hash",
            "paid_participants_count",
            "unpaid_participants_count",
            "participant_ids",
            "custom_shares",
            "mark_creator_paid",
            "shares",
            "transactions",
            "edited_by_name",
            "edited_from_share",
            "edited_to_share",
            "created_label",
            "due_date",
            "created_at",
            "settled_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "status",
            "contract_bill_id",
            "contract_tx_hash",
            "created_at",
            "settled_at",
            "updated_at",
        )

    def get_total_paid(self, obj) -> str:
        return str(obj.total_paid)

    def get_outstanding_amount(self, obj) -> str:
        return str(obj.outstanding_amount)

    def get_paid_participants_count(self, obj) -> int:
        return obj.shares.filter(is_paid=True).count()

    def get_unpaid_participants_count(self, obj) -> int:
        return obj.shares.filter(is_paid=False).count()

    def validate(self, attrs):
        total_amount = attrs.get("total_amount")
        if total_amount is not None and total_amount <= Decimal("0"):
            raise serializers.ValidationError(
                {"total_amount": "Bill total amount must be greater than zero."}
            )

        recipient = attrs.get("recipient") or self.context["request"].user
        attrs["recipient"] = recipient

        recipient_addr = (attrs.get("recipient_stellar_address") or "").strip()
        if not recipient_addr:
            recipient_addr = recipient.stellar_address or ""
        if recipient_addr and not is_valid_stellar_public_key(recipient_addr):
            raise serializers.ValidationError(
                {"recipient_stellar_address": "Invalid recipient Stellar Testnet address."}
            )
        attrs["recipient_stellar_address"] = recipient_addr

        split_type = attrs.get("split_type", SharedBill.SPLIT_EQUAL)
        participant_ids = attrs.get("participant_ids", [])
        custom_shares = attrs.get("custom_shares", [])

        if split_type == SharedBill.SPLIT_EQUAL:
            if not participant_ids and custom_shares:
                participant_ids = [item["participant_id"] for item in custom_shares]
            if not participant_ids:
                raise serializers.ValidationError(
                    {"participant_ids": "At least one participant is required for an equal split bill."}
                )
            if len(participant_ids) != len(set(participant_ids)):
                raise serializers.ValidationError(
                    {"participant_ids": "Duplicate participants are not allowed in the same bill."}
                )
            users_count = User.objects.filter(id__in=participant_ids).count()
            if users_count != len(participant_ids):
                raise serializers.ValidationError(
                    {"participant_ids": "One or more selected participants do not exist."}
                )
            try:
                calculate_equal_split_amounts(total_amount, len(participant_ids))
            except ValueError as exc:
                raise serializers.ValidationError({"total_amount": str(exc)})
            attrs["participant_ids"] = participant_ids

        elif split_type == SharedBill.SPLIT_CUSTOM:
            if not custom_shares:
                raise serializers.ValidationError(
                    {"custom_shares": "custom_shares list is required when split_type is CUSTOM."}
                )
            seen_ids = set()
            shares_sum = Decimal("0.0000000")
            for item in custom_shares:
                pid = item["participant_id"]
                amt = item.get("amount_due")
                if amt is None or amt <= Decimal("0"):
                    raise serializers.ValidationError(
                        {"custom_shares": "Each custom share must have a positive amount_due."}
                    )
                if pid in seen_ids:
                    raise serializers.ValidationError(
                        {"custom_shares": "Duplicate participants are not allowed in custom_shares."}
                    )
                seen_ids.add(pid)
                shares_sum += amt.quantize(Decimal("0.0000001"))

            if User.objects.filter(id__in=seen_ids).count() != len(seen_ids):
                raise serializers.ValidationError(
                    {"custom_shares": "One or more participants in custom_shares do not exist."}
                )

            quantized_total = total_amount.quantize(Decimal("0.0000001"))
            if shares_sum != quantized_total:
                raise serializers.ValidationError(
                    {
                        "custom_shares": (
                            f"Individual custom shares sum ({shares_sum} USDC) must equal "
                            f"the total bill amount ({quantized_total} USDC)."
                        )
                    }
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        custom_shares = validated_data.pop("custom_shares", [])
        mark_creator_paid = validated_data.pop("mark_creator_paid", False)
        creator = self.context["request"].user
        service = StellarTestnetService()

        if not validated_data.get("asset_issuer"):
            validated_data["asset_issuer"] = service.usdc_issuer

        if not validated_data.get("recipient_stellar_address"):
            validated_data["recipient_stellar_address"] = (
                validated_data["recipient"].stellar_address or ""
            )

        bill = SharedBill.objects.create(created_by=creator, **validated_data)
        if not bill.slug:
            bill.slug = f"bill-{bill.id}"
        bill.contract_bill_id = bill.id
        bill.save(update_fields=["slug", "contract_bill_id"])

        group = bill.group
        if bill.split_type == SharedBill.SPLIT_EQUAL:
            amounts = calculate_equal_split_amounts(bill.total_amount, len(participant_ids))
            pairs = list(zip(participant_ids, amounts))
        else:
            pairs = [
                (item["participant_id"], item["amount_due"].quantize(Decimal("0.0000001")))
                for item in custom_shares
            ]

        for pid, share_amt in pairs:
            GroupMembership.objects.get_or_create(
                group=group,
                user_id=pid,
                defaults={
                    "role": GroupMembership.ROLE_MEMBER,
                    "status": GroupMembership.STATUS_ACTIVE,
                },
            )
            is_payer_share = mark_creator_paid and (pid == bill.recipient_id)
            BillShare.objects.create(
                bill=bill,
                participant_id=pid,
                amount_due=share_amt,
                amount_paid=share_amt if is_payer_share else Decimal("0.0000000"),
                is_paid=is_payer_share,
                is_payer=(pid == bill.recipient_id),
                status=BillShare.STATUS_PAID if is_payer_share else BillShare.STATUS_PENDING,
                paid_at_label="Paid the bill" if is_payer_share else "Not paid yet",
                paid_at=timezone.now() if is_payer_share else None,
            )

        if mark_creator_paid:
            bill.recalculate_status()

        ActivityLog.objects.create(
            group=group,
            actor=creator,
            actor_initial=creator.initial,
            avatar_bg=creator.avatar_bg,
            avatar_text=creator.avatar_text,
            title=f"{creator.name} added {bill.description}",
            subtitle=f"{bill.total_amount:.2f} USDC · Just now",
            timestamp_label="Just now",
            day_group="Today",
        )

        return bill


class ResplitBillSerializer(serializers.Serializer):
    split_type = serializers.ChoiceField(choices=SharedBill.SPLIT_CHOICES)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    custom_shares = BillShareInputSerializer(many=True, required=False)


class PaymentSubmissionSerializer(serializers.Serializer):
    participant_id = serializers.IntegerField(
        required=False,
        help_text="Defaults to the currently authenticated user if omitted.",
    )
    tx_hash = serializers.CharField(
        max_length=64,
        help_text="Stellar Testnet transaction hash for the simulated USDC payment.",
    )
    amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=7,
        required=False,
        help_text="Amount paid in simulated USDC (must match participant's share).",
    )
    payer_stellar_address = serializers.CharField(
        max_length=56,
        required=False,
        allow_blank=True,
        help_text="Stellar Testnet public key of the payer wallet.",
    )
    verify_on_horizon = serializers.BooleanField(
        required=False,
        allow_null=True,
        default=None,
        help_text="Set True to force live Horizon Testnet lookup for this tx_hash.",
    )
    async_processing = serializers.BooleanField(
        required=False,
        default=False,
        help_text="If True, queues verification on Celery worker and returns task ID.",
    )

    def validate_tx_hash(self, value):
        cleaned = (value or "").strip()
        if not is_valid_tx_hash(cleaned):
            raise serializers.ValidationError("Invalid Stellar transaction hash format.")
        return cleaned


class ActivityLogSerializer(serializers.ModelSerializer):
    groupId = serializers.SerializerMethodField()
    actorInitial = serializers.CharField(source="actor_initial")
    avatarBg = serializers.CharField(source="avatar_bg")
    avatarText = serializers.CharField(source="avatar_text")
    timestamp = serializers.CharField(source="timestamp_label")
    dayGroup = serializers.CharField(source="day_group")
    txHash = serializers.CharField(source="tx_hash")

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "groupId",
            "actorInitial",
            "avatarBg",
            "avatarText",
            "title",
            "subtitle",
            "timestamp",
            "dayGroup",
            "txHash",
        )

    def get_groupId(self, obj) -> str:
        return obj.group.slug or str(obj.group_id)


class NotificationSerializer(serializers.ModelSerializer):
    targetGroupId = serializers.SerializerMethodField()
    targetBillId = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id",
            "title",
            "subtitle",
            "unread",
            "targetGroupId",
            "targetBillId",
        )

    def get_targetGroupId(self, obj) -> str | None:
        if not obj.target_group:
            return None
        return obj.target_group.slug or str(obj.target_group_id)

    def get_targetBillId(self, obj) -> str | None:
        if not obj.target_bill:
            return None
        return obj.target_bill.slug or str(obj.target_bill_id)
