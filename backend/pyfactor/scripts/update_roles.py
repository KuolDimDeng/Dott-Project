# update_roles.py
import os
import sys
import django

# Try to find the settings module by examining manage.py
try:
    with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'manage.py'), 'r') as f:
        manage_content = f.read()
        settings_line = next((line for line in manage_content.split('\n') if 'DJANGO_SETTINGS_MODULE' in line), None)
        if settings_line:
            import re
            settings_match = re.search(r"['\"]([^'\"]+)['\"]", settings_line)
            if settings_match:
                settings_module = settings_match.group(1)
                print(f"Found settings module in manage.py: {settings_module}")
            else:
                settings_module = 'pyfactor.settings'
                print(f"Using default settings module: {settings_module}")
        else:
            settings_module = 'pyfactor.settings'
            print(f"Using default settings module: {settings_module}")
except:
    settings_module = 'pyfactor.settings'
    print(f"Using default settings module: {settings_module}")

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
try:
    django.setup()
    print("Django setup successful")
except Exception as e:
    print(f"Django setup failed: {str(e)}")
    sys.exit(1)

# Now import Django models
from django.db import transaction
from custom_auth.models import User

def update_user_roles():
    """Update user roles from EMPLOYEE to OWNER"""
    users = User.objects.filter(role='EMPLOYEE')
    
    print(f"Found {users.count()} users with role 'EMPLOYEE'")
    updated_count = 0
    
    for user in users:
        try:
            print(f"Updating user: {user.email} from {user.role} to OWNER")
            with transaction.atomic():
                user.role = 'OWNER'
                user.occupation = 'OWNER'
                user.save(update_fields=['role', 'occupation'])
                updated_count += 1
        except Exception as e:
            print(f"Error updating user {user.email}: {str(e)}")
    
    print(f"Updated {updated_count} users to OWNER role")

if __name__ == "__main__":
    try:
        update_user_roles()
        print("Update complete!")
    except Exception as e:
        print(f"Error during update: {str(e)}")