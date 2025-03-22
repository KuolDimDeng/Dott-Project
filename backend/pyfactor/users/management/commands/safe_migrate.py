# yourapp/management/commands/safe_migrate.py
import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db.models.signals import post_migrate
from django.contrib.auth.management import create_permissions
from django.db import connection

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run migrations safely by temporarily disconnecting the permission creation signal and then creating permissions manually with UUID support'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-permissions',
            action='store_true',
            help='Manually create permissions after migration',
        )
        parser.add_argument(
            '--fake',
            action='store_true',
            help='Mark migrations as run without actually executing them',
        )

    def create_permissions_manually(self):
        """Create permissions manually for BIGINT content_type and permission IDs"""
        self.stdout.write("Creating permissions manually...")
        
        with connection.cursor() as cursor:
            # Clear existing permissions first
            cursor.execute("DELETE FROM auth_permission;")
            
            # Insert the basic permissions for each content type
            # Let Postgres handle the ID sequence automatically
            cursor.execute("""
            INSERT INTO auth_permission (name, content_type_id, codename)
            SELECT 
                'Can add ' || model, 
                id, 
                'add_' || model
            FROM django_content_type;
            """)
            
            cursor.execute("""
            INSERT INTO auth_permission (name, content_type_id, codename)
            SELECT 
                'Can change ' || model, 
                id, 
                'change_' || model
            FROM django_content_type;
            """)
            
            cursor.execute("""
            INSERT INTO auth_permission (name, content_type_id, codename)
            SELECT 
                'Can delete ' || model, 
                id, 
                'delete_' || model
            FROM django_content_type;
            """)
            
            cursor.execute("""
            INSERT INTO auth_permission (name, content_type_id, codename)
            SELECT 
                'Can view ' || model, 
                id, 
                'view_' || model
            FROM django_content_type;
            """)
        
        self.stdout.write(self.style.SUCCESS("Permissions created successfully"))

    def handle(self, *args, **options):
        create_perms = options.get('create_permissions', False)
        
        self.stdout.write('Disconnecting permission creation signal...')
        post_migrate.disconnect(create_permissions)
        
        try:
            # Extract args that should be passed to migrate
            migrate_options = {k: v for k, v in options.items() if k in ['fake', 'verbosity']}
            
            if options.get('fake'):
                self.stdout.write('Running migrations with --fake...')
            else:
                self.stdout.write('Running migrations...')
                
            call_command('migrate', **migrate_options)
            
            if create_perms:
                self.stdout.write('Creating permissions manually...')
                self.create_permissions_manually()
        finally:
            self.stdout.write('Reconnecting permission creation signal...')
            post_migrate.connect(create_permissions)
            
        self.stdout.write(self.style.SUCCESS('Migrations completed successfully!'))