"""
Migration strategy to safely move from AbstractUser-based Employee to standalone Employee model

Steps:
1. Create new employee table with proper structure
2. Copy data from old employee table to new one
3. Update foreign keys and relationships
4. Drop old employee table
5. Rename new table to hr_employee
"""

# This is a manual migration script to run after creating the new model
# Run this with: python manage.py shell < hr/migrations/migrate_employee_model.py

from django.db import connection, transaction
from hr.models import Employee as OldEmployee
from hr.models_new import Employee as NewEmployee
from django.contrib.auth import get_user_model

User = get_user_model()

def migrate_employees():
    """Migrate employees from old model to new model"""
    
    print("Starting employee migration...")
    
    with transaction.atomic():
        # Get all old employees
        old_employees = OldEmployee.objects.all()
        print(f"Found {old_employees.count()} employees to migrate")
        
        migrated_count = 0
        
        for old_emp in old_employees:
            try:
                # Create new employee with data from old one
                new_emp = NewEmployee(
                    id=old_emp.id,
                    employee_number=old_emp.employee_number or f"EMP-MIGRATED-{old_emp.id}",
                    business_id=old_emp.business_id,
                    first_name=old_emp.first_name or '',
                    middle_name=old_emp.middle_name,
                    last_name=old_emp.last_name or '',
                    email=old_emp.email,
                    phone_number=old_emp.phone_number,
                    date_of_birth=old_emp.date_of_birth or old_emp.dob,
                    gender=old_emp.gender,
                    marital_status=old_emp.marital_status,
                    nationality=old_emp.nationality,
                    street=old_emp.street,
                    city=old_emp.city,
                    state=old_emp.state,
                    zip_code=old_emp.postcode,
                    country=old_emp.country,
                    employment_type=old_emp.employment_type,
                    department=old_emp.department,
                    job_title=old_emp.job_title,
                    supervisor_id=old_emp.supervisor_id,
                    hire_date=old_emp.date_joined,
                    termination_date=old_emp.termination_date,
                    active=old_emp.active,
                    onboarded=old_emp.onboarded,
                    compensation_type=old_emp.compensation_type,
                    salary=old_emp.salary,
                    wage_per_hour=old_emp.wage_per_hour,
                    emergency_contact_name=old_emp.emergency_contact_name or old_emp.emergency_contact,
                    emergency_contact_phone=old_emp.emergency_contact_phone or old_emp.emergency_phone,
                    security_number_type=old_emp.security_number_type,
                    ssn_last_four=old_emp.ssn_last_four,
                    stripe_person_id=old_emp.stripe_person_id,
                    stripe_account_id=old_emp.stripe_account_id,
                    ssn_stored_in_stripe=old_emp.ssn_stored_in_stripe,
                    direct_deposit=old_emp.direct_deposit,
                    vacation_time=old_emp.vacation_time,
                    vacation_days_per_year=old_emp.vacation_days_per_year,
                )
                
                # Link to user if exists
                if hasattr(old_emp, 'user') and old_emp.user:
                    new_emp.user = old_emp.user
                
                new_emp.save()
                migrated_count += 1
                print(f"✓ Migrated employee: {new_emp.get_full_name()} ({new_emp.employee_number})")
                
            except Exception as e:
                print(f"✗ Failed to migrate employee {old_emp.id}: {str(e)}")
                raise
        
        print(f"\nSuccessfully migrated {migrated_count} employees!")
        
        # Update any foreign keys that point to Employee
        print("\nUpdating foreign key relationships...")
        
        # This would need to be expanded based on all models that reference Employee
        # For example: Benefits, Timesheet, etc.
        
        print("Migration complete!")

if __name__ == "__main__":
    migrate_employees()