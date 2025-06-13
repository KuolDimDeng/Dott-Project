#!/usr/bin/env python
import os
import sys
import django
from django.db import connection

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def verify_final_state():
    with connection.cursor() as cursor:
        print("=== FINAL DATABASE STATE ===\n")
        
        # Check migration status
        cursor.execute("""
            SELECT app, COUNT(*) as migration_count
            FROM django_migrations
            WHERE app IN ('users', 'crm', 'sales', 'reports', 'integrations', 'finance', 'hr', 'inventory')
            GROUP BY app
            ORDER BY app;
        """)
        migrations = cursor.fetchall()
        print("Migration counts by app:")
        for app, count in migrations:
            print(f"  - {app}: {count} migrations")
        
        # Check critical tables
        critical_tables = [
            'users_userprofile',
            'users_business',
            'users_businessmember',
            'crm_customer',
            'sales_invoice',
            'finance_transaction',
            'hr_employee',
            'inventory_item'
        ]
        
        print("\nCritical tables status:")
        for table in critical_tables:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                );
            """)
            exists = cursor.fetchone()[0]
            status = "✓" if exists else "✗"
            print(f"  {status} {table}")
        
        # Check pending migrations
        print("\nChecking for pending migrations...")
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('showmigrations', '--plan', stdout=out)
        plan = out.getvalue()
        
        # Count unapplied migrations
        unapplied = plan.count('[ ]')
        if unapplied == 0:
            print("  ✓ All migrations have been applied!")
        else:
            print(f"  ✗ {unapplied} migrations are still pending")

if __name__ == "__main__":
    verify_final_state()