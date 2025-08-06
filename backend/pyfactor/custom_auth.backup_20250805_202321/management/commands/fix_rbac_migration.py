from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

class Command(BaseCommand):
    help = 'Fix RBAC migration by removing fake record and running it properly'

    def handle(self, *args, **options):
        self.stdout.write("Fixing RBAC migration...")
        
        # Remove the fake migration record
        recorder = MigrationRecorder(connection)
        
        # Check if the migration is recorded
        applied = recorder.applied_migrations()
        migration_key = ('custom_auth', '0012_add_rbac_models')
        
        if migration_key in applied:
            self.stdout.write("Removing fake migration record...")
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM django_migrations 
                    WHERE app = 'custom_auth' 
                    AND name = '0012_add_rbac_models'
                """)
            
            self.stdout.write(
                self.style.SUCCESS('✅ Removed fake migration record for 0012_add_rbac_models')
            )
        else:
            self.stdout.write(
                self.style.WARNING('⚠️  Migration 0012_add_rbac_models was not recorded as applied')
            )
        
        self.stdout.write("\n🚀 Now run: python manage.py migrate")
        self.stdout.write("This will properly create the RBAC tables.")