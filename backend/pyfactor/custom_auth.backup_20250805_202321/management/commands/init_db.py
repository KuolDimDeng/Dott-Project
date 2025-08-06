from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Initialize database schemas and permissions'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Create public schema if it doesn't exist
            cursor.execute("""
                CREATE SCHEMA IF NOT EXISTS public;
            """)
            
            # Grant usage and create permissions on public schema
            cursor.execute(f"""
                GRANT USAGE ON SCHEMA public TO {connection.settings_dict['USER']};
                GRANT CREATE ON SCHEMA public TO {connection.settings_dict['USER']};
                GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {connection.settings_dict['USER']};
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {connection.settings_dict['USER']};
            """)

            self.stdout.write(
                self.style.SUCCESS('Successfully initialized database schemas and permissions')
            )