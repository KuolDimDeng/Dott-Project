#!/usr/bin/env python
"""
Quick script to check hourly_rate for support@dottapps.com
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee

User = get_user_model()

email = 'support@dottapps.com'
user = User.objects.get(email=email)
employee = Employee.objects.get(user=user)

print(f"Employee: {employee.employee_number}")
print(f"Name: {employee.first_name} {employee.last_name}")

# Check all rate-related fields
for field in dir(employee):
    if 'rate' in field.lower() or 'pay' in field.lower() or 'wage' in field.lower() or 'salary' in field.lower():
        if not field.startswith('_'):
            try:
                value = getattr(employee, field)
                if not callable(value):
                    print(f"{field}: {value}")
            except:
                pass