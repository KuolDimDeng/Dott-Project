import os
import logging
from django.core.management.base import BaseCommand
from django.db import connection

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Applies the final RLS migration to fully switch to Row-Level Security'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force execution even in production',
        )

    def handle(self, *args, **options):
        # Safety check for production environments
        is_production = os.environ.get('DJANGO_SETTINGS_MODULE') == 'pyfactor.settings.production'
        if is_production and not options['force']:
            self.stderr.write(self.style.ERROR(
                'ERROR: This command should not be run in production without the --force flag.'
            ))
            return

        self.stdout.write(self.style.WARNING(
            'Running final RLS migration to fully switch to Row-Level Security...'
        ))

        # Read the SQL migration file
        sql_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))), 'migrate_to_rls_final.sql')
        
        try:
            with open(sql_file_path, 'r') as f:
                sql_content = f.read()
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(
                f'ERROR: Migration file not found at {sql_file_path}'
            ))
            return

        # Execute the SQL migration
        with connection.cursor() as cursor:
            try:
                self.stdout.write(self.style.WARNING('Executing RLS migration script...'))
                cursor.execute(sql_content)
                self.stdout.write(self.style.SUCCESS('RLS migration successfully applied!'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'ERROR during migration: {str(e)}'))
                return

        # Verify RLS is working properly
        with connection.cursor() as cursor:
            try:
                # Check if RLS is enabled on key tables
                cursor.execute("""
                    SELECT tablename, rowsecurity
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    AND tablename IN (
                        'custom_auth_tenant',
                        'banking_bankaccount',
                        'finance_account',
                        'crm_customer'
                    )
                """)
                results = cursor.fetchall()
                
                if results:
                    self.stdout.write(self.style.SUCCESS('RLS status for key tables:'))
                    for table, has_rls in results:
                        status = 'ENABLED' if has_rls else 'DISABLED'
                        style = self.style.SUCCESS if has_rls else self.style.ERROR
                        self.stdout.write(f'  {table}: RLS {style(status)}')
                else:
                    self.stdout.write(self.style.WARNING('No tables found to verify RLS status.'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Error checking RLS status: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(
            'RLS migration completed. Your database is now using Row-Level Security for tenant isolation.'
        )) 