from django.core.management.base import BaseCommand
from core.seed_service import ensure_initial_workspace_seeded


class Command(BaseCommand):
    help = "Seed initial RabaPay workspace data (groups, sample bills, FAQ, activity)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--noinput",
            "--no-input",
            action="store_true",
            help="Do not prompt for user confirmation.",
        )

    def handle(self, *args, **options):
        self.stdout.write("Checking and seeding initial RabaPay workspace data...")
        user = ensure_initial_workspace_seeded()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully ensured seed data for primary user: {user.username} ({user.email})"
            )
        )
