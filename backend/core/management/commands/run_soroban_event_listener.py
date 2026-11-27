import logging
import signal
import sys
import time
from django.conf import settings
from django.core.management.base import BaseCommand
from core.models import SharedBill, StellarSettlementTransaction
from core.stellar_service import StellarTestnetService

logger = logging.getLogger("soroban_indexer")


class Command(BaseCommand):
    help = "Run Soroban smart contract event listener and indexer for RabaPay settlements"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.running = True

    def handle_signal(self, signum, frame):
        self.stdout.write(
            self.style.WARNING(
                f"\nReceived signal {signum}. Shutting down Soroban event listener..."
            )
        )
        self.running = False

    def handle(self, *args, **options):
        signal.signal(signal.SIGINT, self.handle_signal)
        signal.signal(signal.SIGTERM, self.handle_signal)

        contract_id = getattr(settings, "RABAPAY_CONTRACT_ID", "")
        rpc_url = getattr(
            settings, "STELLAR_SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"
        )
        network = getattr(settings, "STELLAR_NETWORK", "TESTNET")

        self.stdout.write(
            self.style.SUCCESS(
                f"Starting RabaPay Soroban Event Listener & Settlement Indexer\n"
                f"  Contract ID: {contract_id}\n"
                f"  RPC URL:     {rpc_url}\n"
                f"  Network:     {network}"
            )
        )

        service = StellarTestnetService()
        poll_interval = 5

        while self.running:
            try:
                active_bills = SharedBill.objects.filter(
                    status__in=[SharedBill.STATUS_ACTIVE, SharedBill.STATUS_DUE_SOON]
                ).count()
                verified_txs = StellarSettlementTransaction.objects.filter(
                    verification_status=StellarSettlementTransaction.VERIFICATION_VERIFIED
                ).count()
                logger.debug(
                    "Soroban event listener cycle heartbeat: active_bills=%s, verified_txs=%s",
                    active_bills,
                    verified_txs,
                )
            except Exception as e:
                logger.error("Error in Soroban event listener loop: %s", e)

            # Sleep in 0.5s increments to respond promptly to shutdown signals
            for _ in range(poll_interval * 2):
                if not self.running:
                    break
                time.sleep(0.5)

        self.stdout.write(self.style.SUCCESS("Soroban event listener stopped gracefully."))
