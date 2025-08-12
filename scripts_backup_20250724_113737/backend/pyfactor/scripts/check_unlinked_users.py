#!/usr/bin/env python3
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from hr.models import Employee

def check_unlinked_users():
    print("=" * 80)
    print("CHECKING UNLINKED USERS")
    print("=" * 80)
    
    # Get all users
    all_users = User.objects.all()
    print(f'\nTotal users: {all_users.count()}')
    
    # Get users with employee records
    users_with_employees = User.objects.filter(employee_profile__isnull=False)
    print(f'Users with employee records: {users_with_employees.count()}')
    
    # Get unlinked users (users without employee records)
    unlinked_users = User.objects.filter(employee_profile__isnull=True)
    print(f'Unlinked users (no employee record): {unlinked_users.count()}')
    
    print('\n' + '-' * 40)
    print('UNLINKED USERS:')
    print('-' * 40)
    
    if unlinked_users.exists():
        for user in unlinked_users:
            print(f'\nEmail: {user.email}')
            print(f'  ID: {user.id}')
            print(f'  Role: {user.role}')
            print(f'  Active: {user.is_active}')
            if hasattr(user, 'tenant'):
                print(f'  Tenant: {user.tenant.name if user.tenant else "None"}')
    else:
        print("No unlinked users found.")
    
    # Check if there are any employees without users
    print('\n' + '-' * 40)
    print('EMPLOYEES WITHOUT USER ACCOUNTS:')
    print('-' * 40)
    
    employees_without_users = Employee.objects.filter(user__isnull=True)
    print(f'\nTotal employees without user accounts: {employees_without_users.count()}')
    
    if employees_without_users.exists():
        for emp in employees_without_users[:5]:
            print(f'\nEmployee: {emp.first_name} {emp.last_name}')
            print(f'  Email: {emp.email}')
            print(f'  ID: {emp.id}')

if __name__ == '__main__':
    check_unlinked_users()