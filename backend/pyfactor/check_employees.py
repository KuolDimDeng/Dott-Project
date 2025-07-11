#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from hr.models import Employee
from django.contrib.auth import get_user_model
from business.models import Business

User = get_user_model()

def check_employees():
    print("=" * 80)
    print("EMPLOYEE DATABASE CHECK")
    print("=" * 80)
    
    # Check total employees
    total_employees = Employee.objects.all().count()
    print(f"\nTotal employees in hr_employee table: {total_employees}")
    
    # List all employees
    print("\nAll employees in the database:")
    print("-" * 80)
    employees = Employee.objects.all().select_related('business')
    
    if not employees:
        print("No employees found in the database.")
    else:
        for emp in employees:
            print(f"ID: {emp.id}")
            print(f"  Employee Number: {emp.employee_number}")
            print(f"  Business ID: {emp.business_id}")
            print(f"  Business Name: {emp.business.business_name if emp.business else 'N/A'}")
            print(f"  Email: {emp.email}")
            print(f"  Name: {emp.first_name} {emp.last_name}")
            print(f"  Status: {emp.status}")
            print(f"  Created: {emp.created_at}")
            print("-" * 40)
    
    # Check for support@dottapps.com user
    print("\nChecking for support@dottapps.com user:")
    print("-" * 80)
    try:
        support_user = User.objects.get(email='support@dottapps.com')
        print(f"User found: {support_user.email}")
        print(f"  User ID: {support_user.id}")
        print(f"  Business ID: {support_user.business_id}")
        
        # Check if this user has any employees
        if support_user.business_id:
            user_employees = Employee.objects.filter(business_id=support_user.business_id)
            print(f"  Employees for this business: {user_employees.count()}")
            
            # Also check the business directly
            try:
                business = Business.objects.get(id=support_user.business_id)
                print(f"\nBusiness details:")
                print(f"  Business Name: {business.business_name}")
                print(f"  Business ID: {business.id}")
                print(f"  Owner ID: {business.owner_id}")
            except Business.DoesNotExist:
                print("  Business not found!")
                
    except User.DoesNotExist:
        print("User support@dottapps.com not found!")
    
    # Raw SQL query to double-check
    print("\nRaw SQL query check:")
    print("-" * 80)
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM hr_employee")
        count = cursor.fetchone()[0]
        print(f"Raw count from hr_employee table: {count}")
        
        cursor.execute("""
            SELECT id, employee_number, business_id, email, first_name, last_name 
            FROM hr_employee 
            LIMIT 10
        """)
        rows = cursor.fetchall()
        if rows:
            print("\nFirst 10 employees (raw query):")
            for row in rows:
                print(f"  {row}")
        else:
            print("No employees found via raw query.")
    
    # Check for any businesses
    print("\nAll businesses in the database:")
    print("-" * 80)
    businesses = Business.objects.all()
    for biz in businesses:
        employee_count = Employee.objects.filter(business_id=biz.id).count()
        print(f"Business: {biz.business_name} (ID: {biz.id})")
        print(f"  Owner ID: {biz.owner_id}")
        print(f"  Employee Count: {employee_count}")
        print("-" * 40)

if __name__ == '__main__':
    check_employees()