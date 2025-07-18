from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.apps import apps
import sys

class Command(BaseCommand):
    help = 'Setup WhatsApp Business database tables and verify installation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-only',
            action='store_true',
            help='Only check if tables exist, do not create them',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force migration even if tables exist',
        )

    def handle(self, *args, **options):
        self.stdout.write("🚀 WhatsApp Business Setup Starting...")
        
        # Check if app is installed
        try:
            apps.get_app_config('whatsapp_business')
            self.stdout.write(self.style.SUCCESS("✅ WhatsApp Business app is installed"))
        except LookupError:
            self.stdout.write(self.style.ERROR("❌ WhatsApp Business app not found in INSTALLED_APPS"))
            return
        
        # Check current state
        tables_exist = self.check_tables_exist()
        
        if options['check_only']:
            if tables_exist:
                self.stdout.write(self.style.SUCCESS("✅ All WhatsApp Business tables exist"))
            else:
                self.stdout.write(self.style.WARNING("⚠️  Some WhatsApp Business tables are missing"))
            return
        
        if tables_exist and not options['force']:
            self.stdout.write(self.style.SUCCESS("✅ WhatsApp Business tables already exist"))
            self.stdout.write("Use --force to recreate tables")
            return
        
        # Run migrations
        try:
            self.stdout.write("📦 Running WhatsApp Business migrations...")
            call_command('migrate', 'whatsapp_business', verbosity=1)
            self.stdout.write(self.style.SUCCESS("✅ Migrations completed successfully"))
            
            # Verify tables were created
            if self.check_tables_exist():
                self.stdout.write(self.style.SUCCESS("✅ All tables verified successfully"))
                self.list_created_tables()
            else:
                self.stdout.write(self.style.ERROR("❌ Some tables were not created properly"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Migration failed: {e}"))
            sys.exit(1)

    def check_tables_exist(self):
        """Check if WhatsApp Business tables exist in database."""
        expected_tables = [
            'whatsapp_business_settings',
            'whatsapp_catalogs', 
            'whatsapp_products',
            'whatsapp_orders',
            'whatsapp_order_items',
            'whatsapp_messages',
            'whatsapp_analytics'
        ]
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE 'whatsapp_%'
            """)
            existing_tables = [row[0] for row in cursor.fetchall()]
        
        missing_tables = set(expected_tables) - set(existing_tables)
        
        if missing_tables:
            self.stdout.write(f"Missing tables: {', '.join(missing_tables)}")
            return False
        
        return True

    def list_created_tables(self):
        """List all WhatsApp Business tables with row counts."""
        whatsapp_tables = [
            'whatsapp_business_settings',
            'whatsapp_catalogs', 
            'whatsapp_products',
            'whatsapp_orders',
            'whatsapp_order_items',
            'whatsapp_messages',
            'whatsapp_analytics'
        ]
        
        self.stdout.write("\n📊 WhatsApp Business Tables:")
        self.stdout.write("-" * 50)
        
        with connection.cursor() as cursor:
            for table in whatsapp_tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    self.stdout.write(f"  {table}: {count} rows")
                except Exception as e:
                    self.stdout.write(f"  {table}: Error - {e}")
        
        self.stdout.write("-" * 50)
        self.stdout.write("🎉 WhatsApp Business setup complete!")
        self.stdout.write("\nNext steps:")
        self.stdout.write("1. Configure WHATSAPP_ACCESS_TOKEN environment variable")
        self.stdout.write("2. Set WHATSAPP_PHONE_NUMBER_ID (optional)")
        self.stdout.write("3. Test WhatsApp Business API endpoints")
        self.stdout.write("4. Create your first catalog and products")