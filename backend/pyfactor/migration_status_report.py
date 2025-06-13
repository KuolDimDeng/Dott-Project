#!/usr/bin/env python
"""
Generate a comprehensive migration status report.
"""

import os
import django
from django.db import connection

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def main():
    """Main function."""
    print("MIGRATION STATUS REPORT")
    print("="*60)
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    print("="*60)
    
    with connection.cursor() as cursor:
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        all_tables = [row[0] for row in cursor.fetchall()]
        
        # Get migration status
        cursor.execute("""
            SELECT app, COUNT(*) as migration_count
            FROM django_migrations 
            GROUP BY app
            ORDER BY app
        """)
        migrations = dict(cursor.fetchall())
        
        # Check app tables
        apps = [
            'hr', 'users', 'sales', 'finance', 'payroll', 'inventory', 
            'crm', 'accounting', 'suppliers', 'benefits', 'leave', 
            'recruitment', 'performance', 'expenses', 'assets', 
            'documents', 'projects', 'notifications', 'reports', 
            'taxes', 'compliance', 'banking', 'purchases', 'integrations',
            'payments', 'analysis', 'onboarding', 'transport'
        ]
        
        print("\nAPP STATUS:")
        print("-"*60)
        
        for app in sorted(apps):
            # Count tables
            app_tables = [t for t in all_tables if t.startswith(f'{app}_')]
            migration_count = migrations.get(app, 0)
            
            if app_tables or migration_count > 0:
                status = "✅" if app_tables else "❌"
                print(f"{status} {app:15} - {len(app_tables):3} tables, {migration_count:2} migrations")
                if app_tables and len(app_tables) <= 5:
                    for table in app_tables:
                        print(f"    - {table}")
        
        print("\nSUMMARY:")
        print("-"*60)
        print(f"Total tables in database: {len(all_tables)}")
        print(f"Django system tables: {len([t for t in all_tables if t.startswith('django_') or t.startswith('auth_')])}")
        print(f"Application tables: {len([t for t in all_tables if not t.startswith('django_') and not t.startswith('auth_')])}")
        
        # List apps that need tables created
        missing_apps = []
        for app in ['hr', 'users', 'sales', 'finance', 'payroll', 'inventory', 
                    'crm', 'reports', 'taxes', 'integrations', 'payments']:
            app_tables = [t for t in all_tables if t.startswith(f'{app}_')]
            if not app_tables:
                missing_apps.append(app)
        
        if missing_apps:
            print(f"\nApps still missing tables: {', '.join(missing_apps)}")
        
        print("\nRECOMMENDATIONS:")
        print("-"*60)
        
        if 'users' in missing_apps:
            print("1. Fix users app first - many apps depend on it")
            print("   - Check if users_business table exists (it should)")
            print("   - Run: python manage.py migrate users --fake-initial")
        
        if 'crm' in missing_apps:
            print("2. Migrate CRM before finance")
            print("   - Run: python manage.py migrate crm")
        
        if missing_apps:
            print("3. Then run remaining migrations:")
            for app in missing_apps:
                if app not in ['users', 'crm']:
                    print(f"   - python manage.py migrate {app}")

if __name__ == '__main__':
    main()