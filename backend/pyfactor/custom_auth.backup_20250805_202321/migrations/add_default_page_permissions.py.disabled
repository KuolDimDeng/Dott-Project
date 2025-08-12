# Manual migration to add default page permissions
# Run this script with: python manage.py shell < custom_auth/migrations/add_default_page_permissions.py

from custom_auth.models import PagePermission

# Define default pages that should exist in the system
DEFAULT_PAGES = [
    # Sales Module
    {
        'name': 'Sales Dashboard',
        'path': '/dashboard/sales',
        'category': 'Sales',
        'description': 'Sales overview and metrics'
    },
    {
        'name': 'Products',
        'path': '/dashboard/products',
        'category': 'Sales',
        'description': 'Product management'
    },
    {
        'name': 'Services',
        'path': '/dashboard/services',
        'category': 'Sales',
        'description': 'Service management'
    },
    {
        'name': 'Customers',
        'path': '/dashboard/customers',
        'category': 'Sales',
        'description': 'Customer management'
    },
    {
        'name': 'Invoices',
        'path': '/dashboard/invoices',
        'category': 'Sales',
        'description': 'Invoice management'
    },
    {
        'name': 'Estimates',
        'path': '/dashboard/estimates',
        'category': 'Sales',
        'description': 'Estimate and quote management'
    },
    
    # HR Module
    {
        'name': 'HR Dashboard',
        'path': '/dashboard/hr',
        'category': 'HR',
        'description': 'HR overview and metrics'
    },
    {
        'name': 'Employees',
        'path': '/dashboard/employees',
        'category': 'HR',
        'description': 'Employee management'
    },
    {
        'name': 'Payroll',
        'path': '/dashboard/payroll',
        'category': 'HR',
        'description': 'Payroll processing'
    },
    {
        'name': 'Benefits',
        'path': '/dashboard/benefits',
        'category': 'HR',
        'description': 'Benefits management'
    },
    {
        'name': 'Leave Management',
        'path': '/dashboard/leave',
        'category': 'HR',
        'description': 'Leave and time-off management'
    },
    {
        'name': 'Timesheets',
        'path': '/dashboard/timesheets',
        'category': 'HR',
        'description': 'Timesheet management'
    },
    
    # Finance Module
    {
        'name': 'Finance Dashboard',
        'path': '/dashboard/finance',
        'category': 'Finance',
        'description': 'Financial overview'
    },
    {
        'name': 'Accounting',
        'path': '/dashboard/accounting',
        'category': 'Finance',
        'description': 'Accounting management'
    },
    {
        'name': 'Expenses',
        'path': '/dashboard/expenses',
        'category': 'Finance',
        'description': 'Expense tracking'
    },
    {
        'name': 'Reports',
        'path': '/dashboard/reports',
        'category': 'Finance',
        'description': 'Financial reports'
    },
    {
        'name': 'Taxes',
        'path': '/dashboard/taxes',
        'category': 'Finance',
        'description': 'Tax management'
    },
    
    # Inventory Module
    {
        'name': 'Inventory',
        'path': '/dashboard/inventory',
        'category': 'Inventory',
        'description': 'Inventory management'
    },
    
    # Purchases Module
    {
        'name': 'Purchases',
        'path': '/dashboard/purchases',
        'category': 'Purchases',
        'description': 'Purchase management'
    },
    {
        'name': 'Vendors',
        'path': '/dashboard/vendors',
        'category': 'Purchases',
        'description': 'Vendor management'
    },
    {
        'name': 'Bills',
        'path': '/dashboard/bills',
        'category': 'Purchases',
        'description': 'Bill management'
    },
    
    # CRM Module
    {
        'name': 'CRM Dashboard',
        'path': '/dashboard/crm',
        'category': 'CRM',
        'description': 'Customer relationship management'
    },
    {
        'name': 'Contacts',
        'path': '/dashboard/contacts',
        'category': 'CRM',
        'description': 'Contact management'
    },
    {
        'name': 'Leads',
        'path': '/dashboard/leads',
        'category': 'CRM',
        'description': 'Lead management'
    },
    
    # Payments Module
    {
        'name': 'Payments',
        'path': '/dashboard/payments',
        'category': 'Payments',
        'description': 'Payment processing'
    },
    
    # Analysis Module
    {
        'name': 'Smart Business',
        'path': '/dashboard/smart-business',
        'category': 'Analysis',
        'description': 'Business intelligence and insights'
    },
    {
        'name': 'Import/Export',
        'path': '/dashboard/import-export',
        'category': 'Analysis',
        'description': 'Data import and export'
    },
]

# Create page permissions
created_count = 0
updated_count = 0

for page_data in DEFAULT_PAGES:
    page, created = PagePermission.objects.update_or_create(
        path=page_data['path'],
        defaults={
            'name': page_data['name'],
            'category': page_data['category'],
            'description': page_data['description'],
            'is_active': True
        }
    )
    
    if created:
        created_count += 1
        print(f"✅ Created page permission: {page.name} ({page.path})")
    else:
        updated_count += 1
        print(f"📝 Updated page permission: {page.name} ({page.path})")

print(f"\n✅ Summary: Created {created_count} new page permissions, updated {updated_count} existing ones.")
print(f"Total page permissions in system: {PagePermission.objects.count()}")