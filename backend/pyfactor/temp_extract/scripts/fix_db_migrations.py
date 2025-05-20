#!/usr/bin/env python
import os
import sys
import django
from django.db import connections
from django.core.management import call_command

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_db_connection():
    """Check and attempt to repair database connections"""
    print("Checking database connection...")
    
    try:
        # Force close any existing connections
        for conn in connections.all():
            conn.close_if_unusable_or_obsolete()
        
        # Test connection
        with connections['default'].cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result[0] == 1:
                print("Database connection is working correctly.")
                return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

def fix_migration_order():
    """Create modified migration order with users.Business first"""
    print("Creating custom migration...")
    
    # Create a temporary migration for users that ensures Business model
    # is created before any foreign keys reference it
    with open('users/migrations/0001_initial_business.py', 'w') as f:
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
    print("Custom migration created.")

if __name__ == "__main__":
    if not check_db_connection():
        print("Connection issues detected. Attempting to fix...")
        # Reconnect logic would go here if needed
        sys.exit(1)
    
    # Create a temporary migration to fix order issues
    fix_migration_order()
    
    # Run migrations with the modified order
    try:
        print("Applying initial migrations...")
        call_command('migrate', 'contenttypes')
        call_command('migrate', 'auth')
        call_command('migrate', 'users', '0001_initial_business')
        
        print("Applying remaining migrations...")
        call_command('migrate')
        print("Migrations completed successfully!")
    except Exception as e:
        print(f"Migration error: {e}")
        sys.exit(1)