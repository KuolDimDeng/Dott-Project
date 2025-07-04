from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Check which RBAC tables exist in the database'

    def handle(self, *args, **options):
        self.stdout.write("Checking RBAC tables...")
        
        tables_to_check = [
            'page_permissions',
            'user_page_access', 
            'role_templates',
            'role_template_pages',
            'user_invitations'
        ]
        
        with connection.cursor() as cursor:
            for table_name in tables_to_check:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, [table_name])
                exists = cursor.fetchone()[0]
                
                if exists:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Table {table_name} EXISTS')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'❌ Table {table_name} DOES NOT EXIST')
                    )
        
        # Check migration status
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'custom_auth' 
            ORDER BY name;
        """)
        migrations = cursor.fetchall()
        
        self.stdout.write("\nApplied custom_auth migrations:")
        for migration in migrations:
            self.stdout.write(f"  - {migration[0]}")
            
        # Check if the problematic migration is recorded
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM django_migrations 
                WHERE app = 'custom_auth' 
                AND name = '0012_add_rbac_models'
            );
        """)
        migration_exists = cursor.fetchone()[0]
        
        if migration_exists:
            self.stdout.write(
                self.style.SUCCESS('\n✅ Migration 0012_add_rbac_models is recorded as applied')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\n❌ Migration 0012_add_rbac_models is NOT recorded as applied')
            )