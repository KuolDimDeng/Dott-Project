#!/usr/bin/env python
import os
import sys

# Add the current directory and its parent to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Now set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import connections, connection
from django.core.management import call_command

def execute_sql(sql, params=None):
    """Execute raw SQL against the database"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params)

def create_onboarding_initial_migration():
    """Create a simplified initial migration for onboarding app"""
    print("Creating onboarding initial migration...")
    
    onboarding_dir = os.path.join(parent_dir, 'onboarding/migrations')
    os.makedirs(onboarding_dir, exist_ok=True)
    
    migration_path = os.path.join(onboarding_dir, '0001_initial.py')
    
    with open(migration_path, 'w') as f:
        f.write("""
from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
    ]
    operations = [
        migrations.CreateModel(
            name='OnboardingProgress',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('onboarding_status', models.CharField(max_length=256)),
                ('account_status', models.CharField(max_length=9)),
                ('user_role', models.CharField(max_length=10)),
                ('subscription_plan', models.CharField(max_length=12)),
                ('current_step', models.CharField(max_length=256)),
                ('next_step', models.CharField(max_length=256, null=True)),
                ('completed_steps', models.JSONField(default=list)),
                ('last_active_step', models.CharField(max_length=256, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_login', models.DateTimeField(null=True)),
                ('access_token_expiration', models.DateTimeField(null=True)),
                ('completed_at', models.DateTimeField(null=True)),
                ('attribute_version', models.CharField(max_length=10)),
                ('preferences', models.JSONField(default=dict)),
                ('setup_error', models.TextField(null=True)),
                ('selected_plan', models.CharField(max_length=12)),
                ('business_id', models.UUIDField(null=True)),
                ('user_id', models.UUIDField(unique=True)),
            ],
            options={
                'db_table': 'onboarding_onboardingprogress',
            },
        ),
    ]
""")
    
    print("✅ Onboarding initial migration created")
    return True

def disable_database_routers():
    """Temporarily disable database routers to allow migrations"""
    print("Disabling database routers...")
    
    from django.conf import settings
    original_routers = settings.DATABASE_ROUTERS
    settings.DATABASE_ROUTERS = []
    
    print("✅ Database routers disabled")
    return original_routers

def create_users_business_table():
    """Create the users_business table directly"""
    print("Creating users_business table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS users_business (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    """
    
    try:
        execute_sql(sql)
        print("✅ users_business table created")
        return True
    except Exception as e:
        print(f"❌ Error creating users_business table: {e}")
        return False

def mark_migrations_as_applied():
    """Mark migrations as applied without running them"""
    print("Marking migrations as applied...")
    
    try:
        # Mark onboarding initial migration as applied
        call_command('migrate', 'onboarding', '0001_initial', '--fake', verbosity=0)
        print("✅ Onboarding migration marked as applied")
        return True
    except Exception as e:
        print(f"❌ Error marking migrations as applied: {e}")
        return False

def fix_migrations():
    """Apply migrations in a controlled sequence"""
    print("Fixing migrations...")
    
    # Create the onboarding initial migration
    if not create_onboarding_initial_migration():
        return False
    
    # Disable DB routers to allow all migrations
    original_routers = disable_database_routers()
    
    try:
        # Create the Business table directly
        if not create_users_business_table():
            return False
        
        # Apply foundation migrations
        print("\nApplying foundation migrations...")
        call_command('migrate', 'contenttypes', verbosity=0)
        call_command('migrate', 'auth', verbosity=0)
        call_command('migrate', 'admin', verbosity=0)
        call_command('migrate', 'sessions', verbosity=0)
        
        # Mark initial migrations as applied
        if not mark_migrations_as_applied():
            return False
        
        # Apply the rest of the migrations
        print("\nApplying remaining migrations...")
        call_command('migrate', '--fake-initial', verbosity=0)
        
        print("✅ Migrations fixed successfully")
        return True
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False
    finally:
        # Restore original router configuration
        from django.conf import settings
        settings.DATABASE_ROUTERS = original_routers
        print("Original database routers restored")

def disable_taxes_db():
    """Temporarily disable taxes database connection"""
    print("Temporarily disabling taxes database...")
    
    # Save the original config
    taxes_db_config = None
    if 'taxes' in connections.databases:
        taxes_db_config = connections.databases['taxes'].copy()
        
        # Point to main database temporarily
        connections.databases['taxes'] = connections.databases['default'].copy()
        print("Redirected taxes database to use default database")
    
    return taxes_db_config

def create_onboarding_table():
    """Create the onboarding_onboardingprogress table directly"""
    print("Creating onboarding_onboardingprogress table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS onboarding_onboardingprogress (
        id UUID PRIMARY KEY,
        onboarding_status VARCHAR(256) NOT NULL,
        account_status VARCHAR(9) NOT NULL,
        user_role VARCHAR(10) NOT NULL,
        subscription_plan VARCHAR(12) NOT NULL,
        current_step VARCHAR(256) NOT NULL,
        next_step VARCHAR(256) NULL,
        completed_steps JSONB NOT NULL,
        last_active_step VARCHAR(256) NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        last_login TIMESTAMP WITH TIME ZONE NULL,
        access_token_expiration TIMESTAMP WITH TIME ZONE NULL,
        completed_at TIMESTAMP WITH TIME ZONE NULL,
        attribute_version VARCHAR(10) NOT NULL,
        preferences JSONB NOT NULL,
        setup_error TEXT NULL,
        selected_plan VARCHAR(12) NOT NULL,
        business_id UUID NULL,
        user_id UUID NOT NULL UNIQUE
    );
    """
    
    try:
        execute_sql(sql)
        print("✅ onboarding_onboardingprogress table created")
        return True
    except Exception as e:
        print(f"❌ Error creating onboarding table: {e}")
        return False

def main():
    print("=== Direct Migration Fix Script ===")
    print(f"Current directory: {current_dir}")
    print(f"Parent directory: {parent_dir}")
    
    # Disable taxes database first
    taxes_db_config = disable_taxes_db()
    
    # Fix migrations
    success = fix_migrations()
    
    # If still failing, try direct table creation
    if not success:
        print("\nTrying direct table creation as fallback...")
        create_onboarding_table()
    
    # Restore taxes database configuration
    if taxes_db_config:
        connections.databases['taxes'] = taxes_db_config
        print("Restored original taxes database configuration")
    
    if success:
        print("\n=== Migration fix complete! ===")
        print("Your database schema has been updated and dependencies have been resolved.")
    else:
        print("\n❌ Migration fix failed. Please check the errors above.")

if __name__ == "__main__":
    main()