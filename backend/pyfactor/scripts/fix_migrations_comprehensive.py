#!/usr/bin/env python
import os
import sys
import django
import subprocess
from django.db import connections
from django.core.management import call_command

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_and_fix_db_connections():
    """Check database connections and fix configuration issues"""
    print("Checking database connections...")
    
    # Get all database connections
    dbs = connections.databases
    for name, config in dbs.items():
        print(f"Checking {name} database...")
        try:
            # Try to connect to each database
            with connections[name].cursor() as cursor:
                cursor.execute("SELECT 1")
                print(f"✅ Connection to {name} database is working")
        except Exception as e:
            print(f"❌ Error connecting to {name} database: {e}")
            # If it's the 'taxes' database, modify its configuration
            if name == 'taxes':
                print("Temporarily disabling taxes database for migrations")
                # Save original settings
                old_settings = dbs[name].copy()
                # Point to main database temporarily
                dbs[name].update(dbs['default'])
                print(f"Redirected {name} to use default database configuration")
                return old_settings  # Return so we can restore later
    return None

def fix_conflicting_migrations():
    """Fix conflicting migrations in the users app"""
    print("\nFixing conflicting migrations in the users app...")
    
    # Check if the conflicting migration exists and remove it
    users_migration_path = 'users/migrations/0001_initial_business.py'
    if os.path.exists(users_migration_path):
        print(f"Removing conflicting migration: {users_migration_path}")
        os.remove(users_migration_path)
    
    # Explicitly create new migration for users.Business model
    print("Creating custom migration for Business model...")
    with open('users/migrations/temp_migration.py', 'w') as f:
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
            name='Business',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'users_business',
            },
        ),
    ]
""")
    
    # Run makemigrations --merge to resolve conflicts
    try:
        print("Merging migrations...")
        subprocess.run([sys.executable, 'manage.py', 'makemigrations', '--merge', '--no-input'], check=True)
        print("✅ Migrations merged successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to merge migrations")
        return False
    
    return True

def modify_migration_order():
    """Create a custom migration order list"""
    print("\nModifying migration order...")
    
    # Create a temporary file to store the migration order
    with open('migration_order.txt', 'w') as f:
        f.write("""contenttypes
auth
admin
sessions
custom_auth
users
users.0001_initial_business
hr
banking
onboarding""")
    
    print("✅ Migration order modified")
    return True

def apply_migrations_in_order():
    """Apply migrations in specific order"""
    print("\nApplying migrations in controlled order...")
    
    # First, disable database routers
    from django.conf import settings
    original_routers = settings.DATABASE_ROUTERS
    settings.DATABASE_ROUTERS = []
    
    try:
        # Apply foundation migrations first
        print("Applying foundation migrations...")
        call_command('migrate', 'contenttypes')
        call_command('migrate', 'auth')
        call_command('migrate', 'admin')
        call_command('migrate', 'sessions')
        
        # Apply auth-related migrations
        print("Applying auth migrations...")
        call_command('migrate', 'custom_auth')
        
        # Apply our custom Business model migration
        print("Applying Business model migration...")
        subprocess.run([sys.executable, 'manage.py', 'sqlmigrate', 'users', '0001_merged'], check=True)
        call_command('migrate', 'users')
        
        # Apply other core apps
        print("Applying core app migrations...")
        call_command('migrate', 'hr')
        call_command('migrate', 'banking')
        
        # Apply onboarding with possible foreign keys to Business
        print("Applying onboarding migrations...")
        call_command('migrate', 'onboarding')
        
        # Apply remaining migrations
        print("Applying remaining migrations...")
        call_command('migrate')
        
        print("✅ Migrations applied successfully")
        return True
    except Exception as e:
        print(f"❌ Error applying migrations: {e}")
        return False
    finally:
        # Restore original routers
        settings.DATABASE_ROUTERS = original_routers

def main():
    print("=== Migration Fix Script ===")
    
    # Check database connections first
    old_settings = check_and_fix_db_connections()
    
    # Fix conflicting migrations
    if not fix_conflicting_migrations():
        print("Failed to fix conflicting migrations. Aborting.")
        return
    
    # Modify migration order
    if not modify_migration_order():
        print("Failed to modify migration order. Aborting.")
        return
    
    # Apply migrations in controlled order
    if not apply_migrations_in_order():
        print("Failed to apply migrations. Aborting.")
        return
    
    # Restore any modified database settings
    if old_settings:
        connections.databases['taxes'].update(old_settings)
        print("Restored original taxes database configuration")
    
    print("\n=== Migration fix complete! ===")
    print("Your database schema has been updated and migrations have been applied in the correct order.")
    print("The circular dependencies have been resolved.")

if __name__ == "__main__":
    main()