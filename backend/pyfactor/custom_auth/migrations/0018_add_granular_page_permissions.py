# Generated manually to add granular page permissions

from django.db import migrations


def add_granular_page_permissions(apps, schema_editor):
    PagePermission = apps.get_model('custom_auth', 'PagePermission')
    
    # Define all granular pages that frontend expects
    granular_pages = [
        # Sales - Create pages
        {'name': 'Create Product', 'path': '/dashboard/products/create-new-product', 'category': 'Sales', 'description': 'Create new products'},
        {'name': 'Create Service', 'path': '/dashboard/services/create-new-service', 'category': 'Sales', 'description': 'Create new services'},
        {'name': 'Create Customer', 'path': '/dashboard/customers/create-new-customer', 'category': 'Sales', 'description': 'Create new customers'},
        {'name': 'Create Vendor', 'path': '/dashboard/vendors/create-new-vendor', 'category': 'Sales', 'description': 'Create new vendors'},
        
        # Sales - Sub-pages
        {'name': 'Sales Dashboard', 'path': '/dashboard/sales', 'category': 'Sales', 'description': 'Sales overview dashboard'},
        {'name': 'Sales Products', 'path': '/dashboard/sales/products', 'category': 'Sales', 'description': 'Manage sales products'},
        {'name': 'Sales Services', 'path': '/dashboard/sales/services', 'category': 'Sales', 'description': 'Manage sales services'},
        {'name': 'Sales Customers', 'path': '/dashboard/sales/customers', 'category': 'Sales', 'description': 'Manage sales customers'},
        {'name': 'Sales Estimates', 'path': '/dashboard/sales/estimates', 'category': 'Sales', 'description': 'Manage sales estimates'},
        {'name': 'Sales Orders', 'path': '/dashboard/sales/orders', 'category': 'Sales', 'description': 'Manage sales orders'},
        {'name': 'Sales Invoices', 'path': '/dashboard/sales/invoices', 'category': 'Sales', 'description': 'Manage sales invoices'},
        {'name': 'Sales Reports', 'path': '/dashboard/sales/reports', 'category': 'Sales', 'description': 'Sales reports and analytics'},
        
        # Inventory sub-pages
        {'name': 'Inventory Dashboard', 'path': '/dashboard/inventory', 'category': 'Inventory', 'description': 'Inventory overview'},
        {'name': 'Stock Adjustments', 'path': '/dashboard/inventory/stock', 'category': 'Inventory', 'description': 'Manage stock levels'},
        {'name': 'Inventory Locations', 'path': '/dashboard/inventory/locations', 'category': 'Inventory', 'description': 'Manage warehouse locations'},
        {'name': 'Inventory Suppliers', 'path': '/dashboard/inventory/suppliers', 'category': 'Inventory', 'description': 'Manage suppliers'},
        {'name': 'Inventory Reports', 'path': '/dashboard/inventory/reports', 'category': 'Inventory', 'description': 'Inventory reports'},
        
        # Payments sub-pages
        {'name': 'Payments Dashboard', 'path': '/dashboard/payments', 'category': 'Finance', 'description': 'Payments overview'},
        {'name': 'Receive Payments', 'path': '/dashboard/payments/receive', 'category': 'Finance', 'description': 'Record received payments'},
        {'name': 'Make Payments', 'path': '/dashboard/payments/make', 'category': 'Finance', 'description': 'Record outgoing payments'},
        {'name': 'Payment Methods', 'path': '/dashboard/payments/methods', 'category': 'Finance', 'description': 'Manage payment methods'},
        {'name': 'Recurring Payments', 'path': '/dashboard/payments/recurring', 'category': 'Finance', 'description': 'Manage recurring payments'},
        {'name': 'Payment Refunds', 'path': '/dashboard/payments/refunds', 'category': 'Finance', 'description': 'Process refunds'},
        
        # HR sub-pages
        {'name': 'HR Dashboard', 'path': '/dashboard/hr', 'category': 'HR', 'description': 'HR overview'},
        {'name': 'HR Employees', 'path': '/dashboard/hr/employees', 'category': 'HR', 'description': 'Employee management'},
        {'name': 'HR Timesheets', 'path': '/dashboard/hr/timesheets', 'category': 'HR', 'description': 'Timesheet management'},
        {'name': 'HR Benefits', 'path': '/dashboard/hr/benefits', 'category': 'HR', 'description': 'Benefits administration'},
        {'name': 'HR Performance', 'path': '/dashboard/hr/performance', 'category': 'HR', 'description': 'Performance management'},
        
        # Banking sub-pages
        {'name': 'Banking Dashboard', 'path': '/dashboard/banking', 'category': 'Finance', 'description': 'Banking overview'},
        {'name': 'Connect Bank', 'path': '/dashboard/banking/connect', 'category': 'Finance', 'description': 'Connect bank accounts'},
        {'name': 'Bank Transactions', 'path': '/dashboard/banking/transactions', 'category': 'Finance', 'description': 'View bank transactions'},
        {'name': 'Bank Reconciliation', 'path': '/dashboard/banking/reconciliation', 'category': 'Finance', 'description': 'Reconcile bank accounts'},
        {'name': 'Bank Reports', 'path': '/dashboard/banking/bank-reports', 'category': 'Finance', 'description': 'Banking reports'},
        
        # Purchases sub-pages
        {'name': 'Purchases Dashboard', 'path': '/dashboard/purchases', 'category': 'Finance', 'description': 'Purchases overview'},
        {'name': 'Purchase Orders', 'path': '/dashboard/purchases/orders', 'category': 'Finance', 'description': 'Manage purchase orders'},
        {'name': 'Bills', 'path': '/dashboard/bills', 'category': 'Finance', 'description': 'Manage bills'},
        {'name': 'Purchases Expenses', 'path': '/dashboard/purchases/expenses', 'category': 'Finance', 'description': 'Track expenses'},
        {'name': 'Purchases Vendors', 'path': '/dashboard/purchases/vendors', 'category': 'Finance', 'description': 'Manage vendors'},
        {'name': 'Purchase Reports', 'path': '/dashboard/purchases/reports', 'category': 'Finance', 'description': 'Purchase reports'},
        
        # Payroll sub-pages
        {'name': 'Payroll Dashboard', 'path': '/dashboard/payroll', 'category': 'HR', 'description': 'Payroll overview'},
        {'name': 'Run Payroll', 'path': '/dashboard/payroll/run', 'category': 'HR', 'description': 'Process payroll'},
        {'name': 'Payroll Schedule', 'path': '/dashboard/payroll/schedule', 'category': 'HR', 'description': 'Manage payroll schedule'},
        {'name': 'Payroll Settings', 'path': '/dashboard/payroll/settings', 'category': 'HR', 'description': 'Configure payroll settings'},
        {'name': 'Payroll Reports', 'path': '/dashboard/payroll/reports', 'category': 'HR', 'description': 'Payroll reports'},
        {'name': 'Export Payroll Reports', 'path': '/dashboard/payroll/export-report', 'category': 'HR', 'description': 'Export payroll data'},
        
        # Taxes sub-pages
        {'name': 'Taxes Dashboard', 'path': '/dashboard/taxes', 'category': 'Finance', 'description': 'Tax overview'},
        {'name': 'Tax Forms', 'path': '/dashboard/taxes/forms', 'category': 'Finance', 'description': 'Manage tax forms'},
        {'name': 'Tax Filing', 'path': '/dashboard/taxes/filing', 'category': 'Finance', 'description': 'File taxes'},
        {'name': 'Tax Deadlines', 'path': '/dashboard/taxes/deadlines', 'category': 'Finance', 'description': 'Track tax deadlines'},
        {'name': 'Tax Settings', 'path': '/dashboard/taxes/settings', 'category': 'Finance', 'description': 'Configure tax settings'},
        {'name': 'Tax Reports', 'path': '/dashboard/taxes/reports', 'category': 'Finance', 'description': 'Tax reports'},
        
        # Analytics sub-pages
        {'name': 'Analytics Dashboard', 'path': '/dashboard/analytics', 'category': 'Reports', 'description': 'Analytics overview'},
        {'name': 'Business Analytics', 'path': '/dashboard/analytics/business', 'category': 'Reports', 'description': 'Business performance analytics'},
        {'name': 'Financial Analytics', 'path': '/dashboard/analytics/financial', 'category': 'Reports', 'description': 'Financial analytics'},
        {'name': 'Sales Analytics', 'path': '/dashboard/analytics/sales', 'category': 'Reports', 'description': 'Sales analytics'},
        {'name': 'Customer Analytics', 'path': '/dashboard/analytics/customer', 'category': 'Reports', 'description': 'Customer analytics'},
        {'name': 'Inventory Analytics', 'path': '/dashboard/analytics/inventory', 'category': 'Reports', 'description': 'Inventory analytics'},
        
        # Smart Insights
        {'name': 'Smart Insights Dashboard', 'path': '/dashboard/smart-insights', 'category': 'Intelligence', 'description': 'AI-powered insights'},
        {'name': 'Business Insights', 'path': '/dashboard/smart-insights/business', 'category': 'Intelligence', 'description': 'Business intelligence'},
        {'name': 'Tax Insights', 'path': '/dashboard/smart-insights/tax', 'category': 'Intelligence', 'description': 'Tax optimization insights'},
        {'name': 'Financial Insights', 'path': '/dashboard/smart-insights/financial', 'category': 'Intelligence', 'description': 'Financial insights'},
        {'name': 'Operational Insights', 'path': '/dashboard/smart-insights/operational', 'category': 'Intelligence', 'description': 'Operational efficiency insights'},
        
        # Reports
        {'name': 'Reports Dashboard', 'path': '/dashboard/reports', 'category': 'Reports', 'description': 'All reports overview'},
        {'name': 'Financial Reports', 'path': '/dashboard/reports/financial', 'category': 'Reports', 'description': 'Financial statements'},
        {'name': 'Tax Reports', 'path': '/dashboard/reports/tax', 'category': 'Reports', 'description': 'Tax reports'},
        {'name': 'Sales Reports', 'path': '/dashboard/reports/sales', 'category': 'Reports', 'description': 'Sales performance reports'},
        {'name': 'Customer Reports', 'path': '/dashboard/reports/customer', 'category': 'Reports', 'description': 'Customer analysis reports'},
        {'name': 'Vendor Reports', 'path': '/dashboard/reports/vendor', 'category': 'Reports', 'description': 'Vendor analysis reports'},
        {'name': 'Employee Reports', 'path': '/dashboard/reports/employee', 'category': 'Reports', 'description': 'Employee reports'},
        {'name': 'Custom Reports', 'path': '/dashboard/reports/custom', 'category': 'Reports', 'description': 'Create custom reports'},
    ]
    
    # Create only if not exists
    for page_data in granular_pages:
        # Check if page already exists by path
        if not PagePermission.objects.filter(path=page_data['path']).exists():
            PagePermission.objects.create(**page_data)
    
    # Also add slug-based lookups for existing pages
    # This maps frontend IDs to backend paths
    slug_mappings = {
        # Map frontend string IDs to actual paths
        'create-new-product': '/dashboard/products/create-new-product',
        'create-new-service': '/dashboard/services/create-new-service',
        'create-new-customer': '/dashboard/customers/create-new-customer',
        'create-new-vendor': '/dashboard/vendors/create-new-vendor',
        'sales-products': '/dashboard/sales/products',
        'sales-services': '/dashboard/sales/services',
        'sales-customers': '/dashboard/sales/customers',
        'sales-estimates': '/dashboard/sales/estimates',
        'sales-orders': '/dashboard/sales/orders',
        'sales-invoices': '/dashboard/sales/invoices',
        'inventory-stock': '/dashboard/inventory/stock',
        'inventory-locations': '/dashboard/inventory/locations',
        'inventory-suppliers': '/dashboard/inventory/suppliers',
        'payments-receive': '/dashboard/payments/receive',
        'payments-make': '/dashboard/payments/make',
        'payments-methods': '/dashboard/payments/methods',
        'payments-recurring': '/dashboard/payments/recurring',
        'payments-refunds': '/dashboard/payments/refunds',
        'hr-employees': '/dashboard/hr/employees',
        'hr-timesheets': '/dashboard/hr/timesheets',
        'hr-benefits': '/dashboard/hr/benefits',
        'hr-performance': '/dashboard/hr/performance',
        'banking-transactions': '/dashboard/banking/transactions',
        'banking-reconciliation': '/dashboard/banking/reconciliation',
        'purchases-orders': '/dashboard/purchases/orders',
        'purchases-bills': '/dashboard/bills',
        'purchases-expenses': '/dashboard/purchases/expenses',
        'purchases-vendors': '/dashboard/purchases/vendors',
        'payroll-run': '/dashboard/payroll/run',
        'payroll-schedule': '/dashboard/payroll/schedule',
        'taxes-forms': '/dashboard/taxes/forms',
        'taxes-filing': '/dashboard/taxes/filing',
    }


def reverse_add_granular_page_permissions(apps, schema_editor):
    PagePermission = apps.get_model('custom_auth', 'PagePermission')
    # Delete only the granular pages we added
    paths_to_delete = [
        '/dashboard/products/create-new-product',
        '/dashboard/services/create-new-service',
        '/dashboard/customers/create-new-customer',
        '/dashboard/vendors/create-new-vendor',
        '/dashboard/sales',
        '/dashboard/sales/products',
        '/dashboard/sales/services',
        '/dashboard/sales/customers',
        '/dashboard/sales/estimates',
        '/dashboard/sales/orders',
        '/dashboard/sales/invoices',
        '/dashboard/sales/reports',
        '/dashboard/inventory',
        '/dashboard/inventory/stock',
        '/dashboard/inventory/locations',
        '/dashboard/inventory/suppliers',
        '/dashboard/inventory/reports',
        '/dashboard/payments',
        '/dashboard/payments/receive',
        '/dashboard/payments/make',
        '/dashboard/payments/methods',
        '/dashboard/payments/recurring',
        '/dashboard/payments/refunds',
        '/dashboard/hr',
        '/dashboard/hr/employees',
        '/dashboard/hr/timesheets',
        '/dashboard/hr/benefits',
        '/dashboard/hr/performance',
        '/dashboard/banking',
        '/dashboard/banking/connect',
        '/dashboard/banking/transactions',
        '/dashboard/banking/reconciliation',
        '/dashboard/banking/bank-reports',
        '/dashboard/purchases',
        '/dashboard/purchases/orders',
        '/dashboard/bills',
        '/dashboard/purchases/expenses',
        '/dashboard/purchases/vendors',
        '/dashboard/purchases/reports',
        '/dashboard/payroll',
        '/dashboard/payroll/run',
        '/dashboard/payroll/schedule',
        '/dashboard/payroll/settings',
        '/dashboard/payroll/reports',
        '/dashboard/payroll/export-report',
        '/dashboard/taxes',
        '/dashboard/taxes/forms',
        '/dashboard/taxes/filing',
        '/dashboard/taxes/deadlines',
        '/dashboard/taxes/settings',
        '/dashboard/taxes/reports',
        '/dashboard/analytics',
        '/dashboard/analytics/business',
        '/dashboard/analytics/financial',
        '/dashboard/analytics/sales',
        '/dashboard/analytics/customer',
        '/dashboard/analytics/inventory',
        '/dashboard/smart-insights',
        '/dashboard/smart-insights/business',
        '/dashboard/smart-insights/tax',
        '/dashboard/smart-insights/financial',
        '/dashboard/smart-insights/operational',
        '/dashboard/reports',
        '/dashboard/reports/financial',
        '/dashboard/reports/tax',
        '/dashboard/reports/sales',
        '/dashboard/reports/customer',
        '/dashboard/reports/vendor',
        '/dashboard/reports/employee',
        '/dashboard/reports/custom',
    ]
    PagePermission.objects.filter(path__in=paths_to_delete).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0017_merge'),
    ]

    operations = [
        migrations.RunPython(add_granular_page_permissions, reverse_add_granular_page_permissions),
    ]