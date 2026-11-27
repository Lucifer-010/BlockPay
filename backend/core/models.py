import uuid
from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


def generate_invite_code() -> str:
    return f"raba.pay/join/{uuid.uuid4().hex[:6]}"


class User(AbstractUser):
    """
    RabaPay User supporting non-custodial Stellar Testnet wallet connection.
    """
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True, default="")
    avatar_bg = models.CharField(max_length=16, default="#166534")
    avatar_text = models.CharField(max_length=16, default="#FFFFFF")
    stellar_address = models.CharField(
        max_length=56,
        blank=True,
        null=True,
        unique=True,
        help_text="Non-custodial Stellar Ed25519 public key (starts with G, 56 chars).",
    )
    wallet_provider = models.CharField(
        max_length=32,
        default="freighter",
        blank=True,
        help_text="Connected wallet provider (e.g., freighter, albedo, xbull, lobstr).",
    )
    simulated_usdc_balance = models.DecimalField(
        max_digits=18,
        decimal_places=7,
        default=Decimal("100.0000000"),
        help_text="Simulated Testnet USDC balance available in the user's connected wallet.",
    )
    wallet_connected_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def name(self) -> str:
        return self.display_name or self.first_name or self.username

    @property
    def initial(self) -> str:
        n = self.name.strip()
        return (n[0] if n else "U").upper()

    def __str__(self):
        return f"{self.username} ({self.stellar_address or 'no-wallet'})"


class ExpenseGroup(models.Model):
    """
    Expense group where friends, roommates, colleagues, or teams divide bills.
    """
    slug = models.SlugField(max_length=64, unique=True, blank=True, null=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=64, blank=True, default="Home & Rent")
    location = models.CharField(max_length=120, blank=True, default="")
    icon = models.CharField(max_length=16, blank=True, default="🏠")
    cover_color = models.CharField(max_length=128, blank=True, default="#15803D")
    invite_code = models.CharField(
        max_length=64,
        default=generate_invite_code,
        unique=True,
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_groups",
    )
    members = models.ManyToManyField(
        User,
        through="GroupMembership",
        related_name="expense_groups",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} (#{self.id})"


class GroupMembership(models.Model):
    ROLE_ADMIN = "ADMIN"
    ROLE_MEMBER = "MEMBER"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_MEMBER, "Member"),
    ]

    STATUS_ACTIVE = "ACTIVE"
    STATUS_INVITED = "INVITED"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_INVITED, "Invited"),
    ]

    group = models.ForeignKey(
        ExpenseGroup,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="group_memberships",
        null=True,
        blank=True,
    )
    invited_name = models.CharField(max_length=120, blank=True, default="")
    invited_email = models.EmailField(blank=True, default="")
    invited_stellar_address = models.CharField(max_length=56, blank=True, default="")
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    invite_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "user"],
                condition=models.Q(user__isnull=False),
                name="unique_group_user_membership",
            )
        ]

    def __str__(self):
        target = self.user.username if self.user else (self.invited_name or self.invited_email or self.invited_stellar_address)
        return f"{target} in {self.group.name} ({self.status})"


class SharedBill(models.Model):
    """
    A shared bill within an expense group that can be split equally or by custom amounts,
    and settled in simulated USDC on Stellar Testnet.
    """
    SPLIT_EQUAL = "EQUAL"
    SPLIT_CUSTOM = "CUSTOM"
    SPLIT_CHOICES = [
        (SPLIT_EQUAL, "Equal Split"),
        (SPLIT_CUSTOM, "Custom Amounts"),
    ]

    STATUS_OPEN = "OPEN"
    STATUS_PARTIALLY_PAID = "PARTIALLY_PAID"
    STATUS_SETTLED = "SETTLED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_PARTIALLY_PAID, "Partially Paid"),
        (STATUS_SETTLED, "Settled"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    slug = models.SlugField(max_length=64, unique=True, blank=True, null=True)
    group = models.ForeignKey(
        ExpenseGroup,
        on_delete=models.CASCADE,
        related_name="bills",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_bills",
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="receivable_bills",
    )
    recipient_stellar_address = models.CharField(
        max_length=56,
        help_text="Recipient's Stellar Testnet address where USDC payments are sent.",
    )
    description = models.CharField(max_length=255)
    total_amount = models.DecimalField(
        max_digits=18,
        decimal_places=7,
        validators=[MinValueValidator(Decimal("0.0000001"))],
        help_text="Total bill amount in simulated USDC (7 decimals, matching Stellar stroops).",
    )
    asset_code = models.CharField(max_length=12, default="USDC")
    asset_issuer = models.CharField(max_length=56, blank=True, default="")
    split_type = models.CharField(
        max_length=16,
        choices=SPLIT_CHOICES,
        default=SPLIT_EQUAL,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OPEN,
    )
    contract_bill_id = models.PositiveBigIntegerField(
        unique=True,
        null=True,
        blank=True,
        help_text="On-chain bill ID in the RabaPay Soroban settlement contract.",
    )
    contract_tx_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Soroban transaction hash when the bill was synced on-chain.",
    )
    edited_by_name = models.CharField(max_length=120, blank=True, default="")
    edited_from_share = models.DecimalField(max_digits=18, decimal_places=7, null=True, blank=True)
    edited_to_share = models.DecimalField(max_digits=18, decimal_places=7, null=True, blank=True)
    created_label = models.CharField(max_length=64, blank=True, default="Just now")
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Bill #{self.id}: {self.description} ({self.total_amount} {self.asset_code}) [{self.status}]"

    @property
    def total_paid(self) -> Decimal:
        agg = self.shares.aggregate(total=models.Sum("amount_paid"))
        return (agg["total"] or Decimal("0.0000000")).quantize(Decimal("0.0000001"))

    @property
    def outstanding_amount(self) -> Decimal:
        rem = self.total_amount - self.total_paid
        return max(Decimal("0.0000000"), rem).quantize(Decimal("0.0000001"))

    def recalculate_status(self):
        """
        Recalculate and persist the bill's status based on all participant shares.
        Automatically marks the bill as SETTLED when all shares are paid and outstanding == 0.
        """
        from django.utils import timezone

        if self.status == self.STATUS_CANCELLED:
            return self.status

        shares = list(self.shares.all())
        if not shares:
            return self.status

        all_paid = all(s.is_paid for s in shares)
        any_paid = any(s.is_paid or s.amount_paid > Decimal("0") for s in shares)
        total_paid_amt = sum((s.amount_paid for s in shares), Decimal("0.0000000"))

        if all_paid and total_paid_amt >= self.total_amount:
            self.status = self.STATUS_SETTLED
            if not self.settled_at:
                self.settled_at = timezone.now()
        elif any_paid:
            self.status = self.STATUS_PARTIALLY_PAID
            self.settled_at = None
        else:
            self.status = self.STATUS_OPEN
            self.settled_at = None

        self.save(update_fields=["status", "settled_at", "updated_at"])
        return self.status


class BillShare(models.Model):
    """
    An individual participant's payment obligation on a SharedBill.
    """
    STATUS_PENDING = "PENDING"
    STATUS_CONFIRMING = "CONFIRMING"
    STATUS_PAID = "PAID"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMING, "Confirming"),
        (STATUS_PAID, "Paid"),
    ]

    bill = models.ForeignKey(
        SharedBill,
        on_delete=models.CASCADE,
        related_name="shares",
    )
    participant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bill_shares",
    )
    amount_due = models.DecimalField(
        max_digits=18,
        decimal_places=7,
        validators=[MinValueValidator(Decimal("0.0000001"))],
    )
    amount_paid = models.DecimalField(
        max_digits=18,
        decimal_places=7,
        default=Decimal("0.0000000"),
    )
    is_paid = models.BooleanField(default=False)
    is_payer = models.BooleanField(default=False)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    stellar_tx_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        help_text="Verified Stellar Testnet transaction hash that settled this share.",
    )
    paid_at_label = models.CharField(max_length=64, blank=True, default="Not paid yet")
    paid_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["bill", "participant"],
                name="unique_bill_participant_share",
            )
        ]

    def __str__(self):
        return f"Share #{self.id} (Bill #{self.bill_id} - {self.participant.username}: {self.amount_due} USDC [{self.status}])"

    @property
    def outstanding_amount(self) -> Decimal:
        rem = self.amount_due - self.amount_paid
        return max(Decimal("0.0000000"), rem).quantize(Decimal("0.0000001"))


class StellarSettlementTransaction(models.Model):
    """
    Immutable settlement record linking a Stellar Testnet USDC payment transaction
    to a specific Bill and Participant Share.
    Enforces strict rejection of duplicate settlement records and duplicate tx hashes.
    """
    VERIFICATION_VERIFIED = "VERIFIED"
    VERIFICATION_REJECTED = "REJECTED"
    VERIFICATION_PENDING = "PENDING"
    VERIFICATION_CHOICES = [
        (VERIFICATION_PENDING, "Pending"),
        (VERIFICATION_VERIFIED, "Verified"),
        (VERIFICATION_REJECTED, "Rejected"),
    ]

    bill = models.ForeignKey(
        SharedBill,
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True,
        blank=True,
    )
    share = models.ForeignKey(
        BillShare,
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True,
        blank=True,
    )
    participant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="stellar_transactions",
    )
    tx_hash = models.CharField(
        max_length=64,
        unique=True,
        help_text="Unique Stellar Testnet transaction hash (64 hex chars).",
    )
    payer_stellar_address = models.CharField(max_length=56)
    recipient_stellar_address = models.CharField(max_length=56)
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=7,
        validators=[MinValueValidator(Decimal("0.0000001"))],
    )
    asset_code = models.CharField(max_length=12, default="USDC")
    asset_issuer = models.CharField(max_length=56, blank=True, default="")
    memo = models.CharField(max_length=64, blank=True, default="")
    direction = models.CharField(max_length=8, default="out")
    counterparty_name = models.CharField(max_length=120, blank=True, default="")
    counterparty_initial = models.CharField(max_length=4, blank=True, default="A")
    avatar_bg = models.CharField(max_length=16, default="#DBEAFE")
    avatar_text = models.CharField(max_length=16, default="#1E40AF")
    group_name = models.CharField(max_length=120, blank=True, default="")
    bill_title = models.CharField(max_length=255, blank=True, default="")
    day_group = models.CharField(max_length=16, default="Today")
    date_label = models.CharField(max_length=64, default="Just now")
    fee_label = models.CharField(max_length=32, default="0.00001 XLM")
    contract_synced = models.BooleanField(default=False)
    contract_invocation_hash = models.CharField(max_length=64, blank=True, default="")
    ledger_sequence = models.PositiveBigIntegerField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=16,
        choices=VERIFICATION_CHOICES,
        default=VERIFICATION_VERIFIED,
    )
    verification_payload = models.JSONField(default=dict, blank=True)
    verified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-verified_at"]

    def clean(self):
        if self.share and self.share.is_paid and self.share.stellar_tx_hash != self.tx_hash:
            raise ValidationError("This participant share has already been settled.")

    def __str__(self):
        return f"Tx {self.tx_hash[:12]}... -> Bill #{self.bill_id} ({self.amount} {self.asset_code})"


class ActivityLog(models.Model):
    """
    Group activity feed item (payments, bill creation, split edits, member joins).
    """
    group = models.ForeignKey(
        ExpenseGroup,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )
    actor_initial = models.CharField(max_length=4, default="S")
    avatar_bg = models.CharField(max_length=16, default="#166534")
    avatar_text = models.CharField(max_length=16, default="#FFFFFF")
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255)
    timestamp_label = models.CharField(max_length=64, default="Just now")
    day_group = models.CharField(max_length=16, default="Today")
    tx_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.title} ({self.group.name})"


class Notification(models.Model):
    """
    User notifications for bill edits, share payments, group joins, and settlements.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255)
    unread = models.BooleanField(default=True)
    target_group = models.ForeignKey(
        ExpenseGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    target_bill = models.ForeignKey(
        SharedBill,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Notif for {self.user.username}: {self.title}"
