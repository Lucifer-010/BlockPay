from decimal import Decimal
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    BillShare,
    ExpenseGroup,
    GroupMembership,
    SharedBill,
    StellarSettlementTransaction,
    User,
)


VALID_WALLET_1 = "GA4KDGQIIXA7SQZB43AIK254XTSGYV3HBX4GAPKU3N2ECP76IX4U557Q"
VALID_WALLET_2 = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
VALID_WALLET_3 = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ"
VALID_WALLET_4 = "GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3"


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class RabaPayEndToEndTests(APITestCase):
    def setUp(self):
        # Register 3 test users via API
        self.alice_resp = self.client.post(
            reverse("auth-register"),
            {
                "username": "alice",
                "name": "Alice",
                "email": "alice@rabapay.io",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(self.alice_resp.status_code, status.HTTP_201_CREATED)
        self.alice_token = self.alice_resp.data["tokens"]["access"]
        self.alice = User.objects.get(username="alice")

        self.bob_resp = self.client.post(
            reverse("auth-register"),
            {
                "username": "bob",
                "name": "Bob",
                "email": "bob@rabapay.io",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(self.bob_resp.status_code, status.HTTP_201_CREATED)
        self.bob_token = self.bob_resp.data["tokens"]["access"]
        self.bob = User.objects.get(username="bob")

        self.carol_resp = self.client.post(
            reverse("auth-register"),
            {
                "username": "carol",
                "name": "Carol",
                "email": "carol@rabapay.io",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(self.carol_resp.status_code, status.HTTP_201_CREATED)
        self.carol_token = self.carol_resp.data["tokens"]["access"]
        self.carol = User.objects.get(username="carol")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.alice_token}")

    def test_01_wallet_connection_and_group_invitation_workflow(self):
        # Alice creates an expense group and invites Carol by username
        group_resp = self.client.post(
            reverse("expense-group-list"),
            {
                "name": "Flat 4B Roommates",
                "description": "Monthly rent, Wi-Fi, and groceries",
                "participant_ids": [self.bob.id],
            },
            format="json",
        )
        self.assertEqual(group_resp.status_code, status.HTTP_201_CREATED)
        group_id = group_resp.data["id"]

        # Invite Carol by username
        invite_resp = self.client.post(
            reverse("expense-group-invite-participant", args=[group_id]),
            {"username": "carol", "role": "MEMBER"},
            format="json",
        )
        self.assertEqual(invite_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(invite_resp.data["status"], GroupMembership.STATUS_ACTIVE)

        # Test inviting a collection of participants with only address as compulsory
        bulk_resp = self.client.post(
            reverse("expense-group-invite-participant", args=[group_id]),
            {
                "participants": [
                    {"stellar_address": VALID_WALLET_1, "name": "Bulk Peer 1"},
                    {"stellar_address": VALID_WALLET_2},  # Only address supplied
                ]
            },
            format="json",
        )
        self.assertEqual(bulk_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(bulk_resp.data["added_count"], 2)

        # Invite an external participant by email
        ext_invite = self.client.post(
            reverse("expense-group-invite-participant", args=[group_id]),
            {"email": "dave@rabapay.io", "role": "MEMBER"},
            format="json",
        )
        self.assertEqual(ext_invite.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ext_invite.data["status"], GroupMembership.STATUS_INVITED)

        # Carol connects her non-custodial Stellar wallet via Stellar Wallets Kit endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.carol_token}")
        wallet_resp = self.client.post(
            reverse("user-connect-wallet"),
            {
                "stellar_address": VALID_WALLET_3,
                "wallet_provider": "freighter",
            },
            format="json",
        )
        self.assertEqual(wallet_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(wallet_resp.data["stellar_address"], VALID_WALLET_3)

        # Test direct Stellar Wallets Kit authentication endpoint (/api/auth/wallet/)
        kit_auth_resp = self.client.post(
            reverse("auth-wallet"),
            {
                "stellar_address": VALID_WALLET_1,
                "wallet_provider": "freighter",
                "name": "Alice Kit",
            },
            format="json",
        )
        self.assertEqual(kit_auth_resp.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", kit_auth_resp.data)
        self.assertIn("workspace", kit_auth_resp.data)

    def test_02_equal_split_bill_and_full_stellar_settlement(self):
        group = ExpenseGroup.objects.create(
            name="Colleagues Lunch Club", created_by=self.alice
        )
        # Create a 100.0000000 USDC bill split equally across 3 participants
        bill_resp = self.client.post(
            reverse("shared-bill-list"),
            {
                "group": group.id,
                "recipient": self.alice.id,
                "description": "Friday Team Sushi Lunch",
                "total_amount": "100.0000000",
                "split_type": "EQUAL",
                "participant_ids": [self.alice.id, self.bob.id, self.carol.id],
            },
            format="json",
        )
        self.assertEqual(bill_resp.status_code, status.HTTP_201_CREATED)
        bill_id = bill_resp.data["id"]
        shares = bill_resp.data["shares"]
        self.assertEqual(len(shares), 3)

        amounts = [Decimal(s["amount_due"]) for s in shares]
        self.assertEqual(sum(amounts), Decimal("100.0000000"))
        self.assertEqual(amounts[0], Decimal("33.3333334"))
        self.assertEqual(amounts[1], Decimal("33.3333333"))
        self.assertEqual(amounts[2], Decimal("33.3333333"))

        # Check payment intent endpoint (Soroban invocation + Stellar Testnet metadata)
        intent_resp = self.client.get(
            reverse("shared-bill-payment-intent", args=[bill_id]),
            {"participant_id": self.bob.id},
        )
        self.assertEqual(intent_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(intent_resp.data["amount_stroops"], 333333333)
        self.assertEqual(
            intent_resp.data["soroban_invocation"]["function"], "pay_share"
        )

        # 1. Alice pays her share (33.3333334 USDC)
        pay1 = self.client.post(
            reverse("shared-bill-pay-share", args=[bill_id]),
            {
                "participant_id": self.alice.id,
                "tx_hash": "a11ce00000000000000000000000000000000000000000000000000000000001",
                "amount": "33.3333334",
            },
            format="json",
        )
        self.assertEqual(pay1.status_code, status.HTTP_200_OK)
        self.assertEqual(pay1.data["bill"]["status"], SharedBill.STATUS_PARTIALLY_PAID)
        self.assertEqual(
            Decimal(pay1.data["bill"]["outstanding_amount"]), Decimal("66.6666666")
        )

        # 2. Reject duplicate transaction hash
        dup_tx = self.client.post(
            reverse("shared-bill-pay-share", args=[bill_id]),
            {
                "participant_id": self.bob.id,
                "tx_hash": "a11ce00000000000000000000000000000000000000000000000000000000001",
            },
            format="json",
        )
        self.assertEqual(dup_tx.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Reject duplicate payment by an already-paid participant (Alice)
        dup_part = self.client.post(
            reverse("shared-bill-pay-share", args=[bill_id]),
            {
                "participant_id": self.alice.id,
                "tx_hash": "a11ce00000000000000000000000000000000000000000000000000000000002",
            },
            format="json",
        )
        self.assertEqual(dup_part.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Bob pays his share (33.3333333 USDC)
        alice_balance_before = self.alice.simulated_usdc_balance
        bob_balance_before = self.bob.simulated_usdc_balance

        pay2 = self.client.post(
            reverse("shared-bill-pay-share", args=[bill_id]),
            {
                "participant_id": self.bob.id,
                "tx_hash": "b0b0000000000000000000000000000000000000000000000000000000000001",
            },
            format="json",
        )
        self.assertEqual(pay2.status_code, status.HTTP_200_OK)
        self.assertEqual(pay2.data["bill"]["status"], SharedBill.STATUS_PARTIALLY_PAID)
        self.assertEqual(
            Decimal(pay2.data["bill"]["outstanding_amount"]), Decimal("33.3333333")
        )

        # Verify Bob was debited and Alice (recipient) was credited
        self.bob.refresh_from_db()
        self.alice.refresh_from_db()
        self.assertEqual(self.bob.simulated_usdc_balance, bob_balance_before - Decimal("33.3333333"))
        self.assertEqual(self.alice.simulated_usdc_balance, alice_balance_before + Decimal("33.3333333"))

        # 5. Carol pays her share -> Bill automatically transitions to SETTLED
        pay3 = self.client.post(
            reverse("shared-bill-pay-share", args=[bill_id]),
            {
                "participant_id": self.carol.id,
                "tx_hash": "ca50100000000000000000000000000000000000000000000000000000000001",
            },
            format="json",
        )
        self.assertEqual(pay3.status_code, status.HTTP_200_OK)
        self.assertEqual(pay3.data["bill"]["status"], SharedBill.STATUS_SETTLED)
        self.assertEqual(
            Decimal(pay3.data["bill"]["outstanding_amount"]), Decimal("0.0000000")
        )
        self.assertIsNotNone(pay3.data["bill"]["settled_at"])

        # 6. Any further payment attempt on a settled bill is rejected
        after_settled = self.client.post(
            reverse("shared-bill-pay-share", args=[bill_id]),
            {
                "participant_id": self.carol.id,
                "tx_hash": "ca50100000000000000000000000000000000000000000000000000000000099",
            },
            format="json",
        )
        self.assertEqual(after_settled.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify payment progress endpoint
        prog_resp = self.client.get(
            reverse("shared-bill-payment-progress", args=[bill_id])
        )
        self.assertEqual(prog_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(prog_resp.data["progress_percentage"], 100.0)
        self.assertEqual(prog_resp.data["paid_count"], 3)
        self.assertEqual(prog_resp.data["unpaid_count"], 0)

    def test_03_custom_split_validation_and_resplit(self):
        group = ExpenseGroup.objects.create(
            name="Weekend Trip Group", created_by=self.alice
        )
        # Attempt to create a custom split bill where shares (60 + 25 = 85) != total_amount (100)
        bad_resp = self.client.post(
            reverse("shared-bill-list"),
            {
                "group": group.id,
                "recipient": self.alice.id,
                "description": "Airbnb Cabin Booking",
                "total_amount": "100.0000000",
                "split_type": "CUSTOM",
                "custom_shares": [
                    {"participant_id": self.alice.id, "amount_due": "60.0000000"},
                    {"participant_id": self.bob.id, "amount_due": "25.0000000"},
                ],
            },
            format="json",
        )
        self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid custom split (55.50 + 44.50 = 100.00)
        good_resp = self.client.post(
            reverse("shared-bill-list"),
            {
                "group": group.id,
                "recipient": self.alice.id,
                "description": "Airbnb Cabin Booking",
                "total_amount": "100.0000000",
                "split_type": "CUSTOM",
                "custom_shares": [
                    {"participant_id": self.alice.id, "amount_due": "55.5000000"},
                    {"participant_id": self.bob.id, "amount_due": "44.5000000"},
                ],
            },
            format="json",
        )
        self.assertEqual(good_resp.status_code, status.HTTP_201_CREATED)
        bill_id = good_resp.data["id"]

        # Re-split unpaid bill to equal split between Alice and Bob (50 + 50)
        resplit_resp = self.client.post(
            reverse("shared-bill-split-bill", args=[bill_id]),
            {
                "split_type": "EQUAL",
                "participant_ids": [self.alice.id, self.bob.id],
            },
            format="json",
        )
        self.assertEqual(resplit_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resplit_resp.data["split_type"], "EQUAL")
        for s in resplit_resp.data["shares"]:
            self.assertEqual(Decimal(s["amount_due"]), Decimal("50.0000000"))

    def test_04_workspace_bootstrap_dashboards_swagger_and_smart_contract(self):
        # Workspace bootstrap endpoint returns ONLY the authenticated user's own groups/bills (0 initially)
        ws_resp = self.client.get(reverse("workspace-bootstrap"))
        self.assertEqual(ws_resp.status_code, status.HTTP_200_OK)
        self.assertIn("groups", ws_resp.data)
        self.assertIn("bills", ws_resp.data)
        self.assertIn("faqItems", ws_resp.data)
        self.assertEqual(len(ws_resp.data["groups"]), 0)
        self.assertEqual(len(ws_resp.data["bills"]), 0)

        # Create a group as Alice and verify workspace now contains strictly that group
        self.client.post(
            reverse("expense-group-list"),
            {"name": "Alice Created Group", "description": "Created by Alice"},
            format="json",
        )
        ws_after = self.client.get(reverse("workspace-bootstrap"))
        self.assertEqual(len(ws_after.data["groups"]), 1)
        self.assertEqual(ws_after.data["groups"][0]["name"], "Alice Created Group")

        # Smart contract metadata endpoint
        contract_resp = self.client.get(reverse("stellar-contract-info"))
        self.assertEqual(contract_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(contract_resp.data["contract_id"].startswith("C"))
        self.assertTrue(contract_resp.data["wasm_compiled"])
        self.assertIn("pay_share", contract_resp.data["exported_functions"])

        # User dashboard endpoint
        dash_resp = self.client.get(reverse("user-dashboard"))
        self.assertEqual(dash_resp.status_code, status.HTTP_200_OK)
        self.assertIn("summary", dash_resp.data)

        # OpenAPI / Swagger schema endpoint
        schema_resp = self.client.get(reverse("schema"))
        self.assertEqual(schema_resp.status_code, status.HTTP_200_OK)
        swagger_resp = self.client.get(reverse("swagger-ui"))
        self.assertEqual(swagger_resp.status_code, status.HTTP_200_OK)
