from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

class Command(BaseCommand):
    help = 'Fake the RBAC migration if tables already exist'

    def handle(self, *args, **options):
        self.stdout.write("Checking for duplicate table issues...")
        
        # Check if page_permissions table exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'page_permissions'
                );
            """)
            table_exists = cursor.fetchone()[0]
        
        if table_exists:
            self.stdout.write(self.style.WARNING('Table page_permissions already exists'))
            
            # Check if migration is already applied
            recorder = MigrationRecorder(connection)
            applied = recorder.applied_migrations()
            
            if ('custom_auth', '0012_add_rbac_models') not in applied:
                # Fake the migration
                recorder.record_applied('custom_auth', '0012_add_rbac_models')
                self.stdout.write(
                    self.style.SUCCESS('Successfully faked migration custom_auth.0012_add_rbac_models')
                )
                self.stdout.write('You can now run migrations normally')
            else:
                self.stdout.write(
                    self.style.SUCCESS('Migration custom_auth.0012_add_rbac_models is already applied')
                )
        else:
            self.stdout.write(
                self.style.ERROR('Table page_permissions does not exist. Run migrations normally.')
            )