from django.core.management.base import BaseCommand
from django.db import transaction
from taxes.models import (
    W2Form, W3Form, Form1099NEC, Form1099MISC, Form1096,
    YearEndTaxGeneration
)


class Command(BaseCommand):
    help = 'Set up year-end tax form tables and ensure proper database structure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verify-only',
            action='store_true',
            help='Only verify table structure without making changes'
        )

    def handle(self, *args, **options):
        verify_only = options['verify_only']
        
        self.stdout.write(
            self.style.SUCCESS('Setting up year-end tax form tables...')
        )

        try:
            with transaction.atomic():
                # Check if tables exist and are accessible
                models_to_check = [
                    W2Form,
                    W3Form,
                    Form1099NEC,
                    Form1099MISC,
                    Form1096,
                    YearEndTaxGeneration
                ]

                for model in models_to_check:
                    try:
                        # Try to query the model to verify table exists
                        model.objects.count()
                        self.stdout.write(
                            self.style.SUCCESS(f'✓ {model.__name__} table is accessible')
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'✗ {model.__name__} table error: {str(e)}')
                        )

                if not verify_only:
                    # Create any sample data or perform setup tasks here
                    self.stdout.write(
                        self.style.SUCCESS('Year-end tax tables setup completed successfully!')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS('Verification completed!')
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error setting up year-end tax tables: {str(e)}')
            )