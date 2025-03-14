#!/usr/bin/env python
"""
Script to directly mark migrations as applied in the database without actually running them.
This is useful for resolving migration issues where the migrations can't be applied normally.
"""

import os
import sys
import django
from django.db import connection

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def mark_migration_as_applied(app_name, migration_name):
    """Mark a migration as applied in the django_migrations table."""
    with connection.cursor() as cursor:
        # Check if the migration is already applied
        cursor.execute(
            "SELECT id FROM django_migrations WHERE app = %s AND name = %s",
            [app_name, migration_name]
        )
        if cursor.fetchone():
            print(f"Migration {app_name}.{migration_name} is already applied.")
            return False
        
        # Insert the migration record
        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
            [app_name, migration_name]
        )
        print(f"Marked migration {app_name}.{migration_name} as applied.")
        return True

def main():
    # List of problematic migrations to mark as applied
    migrations_to_apply = [
        # Users app migrations first (dependency for business)
        ('users', '0001_initial'),
        ('users', '0002_userprofile_metadata'),
        ('users', '0003_move_business_model'),
        ('users', '0004_migrate_business_data'),
        ('users', '0005_rename_users_busin_busines_e7a4a9_idx_users_busin_busines_de1003_idx_and_more'),
        
        # Business app migrations
        ('business', '0001_initial'),
        ('business', '0002_initial'),
        ('business', '0003_remove_business_models'),
        ('business', '0004_business_proxy'),
        ('business', '0004_fake_models'),
        ('business', '0005_merge_0004_business_proxy_0004_fake_models'),
        ('business', '0006_fake_businessmember'),
        
        # Finance app migrations
        ('finance', '0001_initial'),
        ('finance', '0002_initial'),
        ('finance', 'fix_business_references'),
        ('finance', '0003_merge_0002_initial_fix_business_references'),
        ('finance', '0004_alter_financialstatement_business_and_more'),
        
        # HR app migrations
        ('hr', '0001_initial'),
        ('hr', 'fix_business_references'),
        ('hr', 'fix_business_refs'),
        ('hr', '0002_merge_fix_business_references_fix_business_refs'),
        ('hr', '0003_alter_employee_business'),
        
        # Onboarding app migrations
        ('onboarding', '0001_initial'),
        ('onboarding', 'fix_business_references'),
        ('onboarding', '0001_alter_onboardingprogress_business'),
        
        # CRM app migrations
        ('crm', '0001_initial'),
        
        # Transport app migrations
        ('transport', '0001_initial'),
    ]
    
    # Mark each migration as applied
    applied_count = 0
    for app_name, migration_name in migrations_to_apply:
        if mark_migration_as_applied(app_name, migration_name):
            applied_count += 1
    
    print(f"Marked {applied_count} migrations as applied.")

if __name__ == '__main__':
    main()