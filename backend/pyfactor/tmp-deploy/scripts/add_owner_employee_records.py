
import os
import django
import sys
from django.utils import timezone

# Set up Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from django.db import transaction

User = get_user_model()

def add_owner_employee_records():
    # Get all users with owner role
    owners = User.objects.filter(role='owner')
    print(f"Found {owners.count()} users with owner role")
    
    for owner in owners:
        # Check if employee record already exists
        if not hasattr(owner, 'employee_profile'):
            # Create employee record
            employee = Employee.objects.create(
                user=owner,
                username=owner.email,  # Required by AbstractUser
                email=owner.email,
                first_name=owner.first_name,
                last_name=owner.last_name,
                job_title='Owner',
                employment_type='FT',  # Full-time
                active=True,
                areManager=True,
                ID_verified=True,
                date_joined=owner.date_joined,
                role='employee',  # Set role to employee since this is an employee record
                is_active=True,
                is_staff=False,
                is_superuser=False
            )
            print(f"Created employee record for owner: {owner.email}")
        else:
            print(f"Employee record already exists for owner: {owner.email}")

if __name__ == '__main__':
    with transaction.atomic():
        add_owner_employee_records()
    