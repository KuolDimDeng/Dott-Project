from django.core.management.base import BaseCommand
from django.db import connection
from hr.models import Employee
from django.contrib.auth import get_user_model
from business.models import Business

User = get_user_model()

class Command(BaseCommand):
    help = 'Check employees in the hr_employee table'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("EMPLOYEE DATABASE CHECK")
        self.stdout.write("=" * 80)
        
        # Check total employees
        total_employees = Employee.objects.all().count()
        self.stdout.write(f"\nTotal employees in hr_employee table: {total_employees}")
        
        # List all employees
        self.stdout.write("\nAll employees in the database:")
        self.stdout.write("-" * 80)
        employees = Employee.objects.all().select_related('business')
        
        if not employees:
            self.stdout.write("No employees found in the database.")
        else:
            for emp in employees:
                self.stdout.write(f"ID: {emp.id}")
                self.stdout.write(f"  Employee Number: {emp.employee_number}")
                self.stdout.write(f"  Business ID: {emp.business_id}")
                self.stdout.write(f"  Business Name: {emp.business.business_name if emp.business else 'N/A'}")
                self.stdout.write(f"  Email: {emp.email}")
                self.stdout.write(f"  Name: {emp.first_name} {emp.last_name}")
                self.stdout.write(f"  Status: {emp.status}")
                self.stdout.write(f"  Created: {emp.created_at}")
                self.stdout.write("-" * 40)
        
        # Check for support@dottapps.com user
        self.stdout.write("\nChecking for support@dottapps.com user:")
        self.stdout.write("-" * 80)
        try:
            support_user = User.objects.get(email='support@dottapps.com')
            self.stdout.write(f"User found: {support_user.email}")
            self.stdout.write(f"  User ID: {support_user.id}")
            self.stdout.write(f"  Business ID: {support_user.business_id}")
            
            # Check if this user has any employees
            if support_user.business_id:
                user_employees = Employee.objects.filter(business_id=support_user.business_id)
                self.stdout.write(f"  Employees for this business: {user_employees.count()}")
                
                # Also check the business directly
                try:
                    business = Business.objects.get(id=support_user.business_id)
                    self.stdout.write(f"\nBusiness details:")
                    self.stdout.write(f"  Business Name: {business.business_name}")
                    self.stdout.write(f"  Business ID: {business.id}")
                    self.stdout.write(f"  Owner ID: {business.owner_id}")
                except Business.DoesNotExist:
                    self.stdout.write("  Business not found!")
                    
        except User.DoesNotExist:
            self.stdout.write("User support@dottapps.com not found!")
        
        # Raw SQL query to double-check
        self.stdout.write("\nRaw SQL query check:")
        self.stdout.write("-" * 80)
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM hr_employee")
            count = cursor.fetchone()[0]
            self.stdout.write(f"Raw count from hr_employee table: {count}")
            
            cursor.execute("""
                SELECT id, employee_number, business_id, email, first_name, last_name 
                FROM hr_employee 
                LIMIT 10
            """)
            rows = cursor.fetchall()
            if rows:
                self.stdout.write("\nFirst 10 employees (raw query):")
                for row in rows:
                    self.stdout.write(f"  {row}")
            else:
                self.stdout.write("No employees found via raw query.")
        
        # Check for any businesses
        self.stdout.write("\nAll businesses in the database:")
        self.stdout.write("-" * 80)
        businesses = Business.objects.all()
        for biz in businesses:
            employee_count = Employee.objects.filter(business_id=biz.id).count()
            self.stdout.write(f"Business: {biz.business_name} (ID: {biz.id})")
            self.stdout.write(f"  Owner ID: {biz.owner_id}")
            self.stdout.write(f"  Employee Count: {employee_count}")
            self.stdout.write("-" * 40)