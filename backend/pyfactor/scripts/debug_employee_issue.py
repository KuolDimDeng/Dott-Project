"""
Debug script to check employee and user business_id issues
"""
from custom_auth.models import User
from hr.models import Employee
from business.models import Business

# Check the support user
try:
    user = User.objects.get(email='support@dottapps.com')
    print(f"\n=== USER INFO ===")
    print(f"Email: {user.email}")
    print(f"User ID: {user.id}")
    print(f"Business ID: {user.business_id}")
    print(f"Tenant ID: {user.tenant.id if user.tenant else 'No tenant'}")
    print(f"Tenant Name: {user.tenant.name if user.tenant else 'No tenant'}")
    
    # Check if business_id matches tenant_id
    if user.business_id and user.tenant:
        if str(user.business_id) == str(user.tenant.id):
            print("✓ business_id matches tenant_id")
        else:
            print("✗ business_id does NOT match tenant_id!")
    
    # Check all employees
    print(f"\n=== ALL EMPLOYEES IN DATABASE ===")
    all_employees = Employee.objects.all()
    print(f"Total employees: {all_employees.count()}")
    
    for emp in all_employees:
        print(f"\nEmployee: {emp.first_name} {emp.last_name}")
        print(f"  - ID: {emp.id}")
        print(f"  - Email: {emp.email}")
        print(f"  - Business ID: {emp.business_id}")
        print(f"  - Created: {emp.created_at}")
    
    # Check employees for this business
    if user.business_id:
        print(f"\n=== EMPLOYEES FOR BUSINESS {user.business_id} ===")
        business_employees = Employee.objects.filter(business_id=user.business_id)
        print(f"Count: {business_employees.count()}")
        for emp in business_employees:
            print(f"- {emp.first_name} {emp.last_name} ({emp.email})")
    
    # Check if there's a Business record
    print(f"\n=== BUSINESS RECORDS ===")
    if user.business_id:
        try:
            business = Business.objects.get(id=user.business_id)
            print(f"Business found: {business.name}")
            print(f"Business ID: {business.id}")
        except Business.DoesNotExist:
            print(f"No Business record found for ID: {user.business_id}")
    
    businesses = Business.objects.all()
    print(f"\nTotal businesses: {businesses.count()}")
    for biz in businesses:
        print(f"- {biz.name} (ID: {biz.id})")
        
except User.DoesNotExist:
    print("User support@dottapps.com not found!")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()