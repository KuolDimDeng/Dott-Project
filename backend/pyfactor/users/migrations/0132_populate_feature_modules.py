# Data migration to populate initial feature modules

from django.db import migrations


def create_initial_features(apps, schema_editor):
    FeatureModule = apps.get_model('users', 'FeatureModule')
    
    # Core features (always free)
    core_features = [
        {
            'code': 'dashboard',
            'name': 'Dashboard',
            'description': 'Business analytics dashboard and overview',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'pos',
            'name': 'POS Terminal',
            'description': 'Full-featured point of sale system with business-specific features',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'inventory',
            'name': 'Inventory Management',
            'description': 'Complete inventory tracking and management system',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'customers',
            'name': 'Customer Management',
            'description': 'Customer database and relationship management',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'invoicing',
            'name': 'Invoicing',
            'description': 'Professional invoicing and billing',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'banking',
            'name': 'Banking',
            'description': 'Bank account connections and reconciliation',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'menu',
            'name': 'Menu Management',
            'description': 'Digital menu for restaurants and food businesses',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
        {
            'code': 'orders',
            'name': 'Order Management',
            'description': 'Manage customer orders and fulfillment',
            'category': 'core',
            'monthly_price': 0.00,
            'developing_country_price': 0.00,
            'is_core': True,
        },
    ]
    
    # À la carte paid modules
    paid_features = [
        # HR & Payroll Bundle ($15/month)
        {
            'code': 'payroll',
            'name': 'Payroll & HR',
            'description': 'Complete payroll processing with tax calculations, timesheets, and HR management',
            'category': 'hr',
            'monthly_price': 15.00,
            'developing_country_price': 7.50,
            'is_core': False,
        },
        {
            'code': 'timesheets',
            'name': 'Timesheets & Attendance',
            'description': 'Time tracking, attendance management, and scheduling',
            'category': 'hr',
            'monthly_price': 15.00,
            'developing_country_price': 7.50,
            'is_core': False,
            'required_features': ['payroll'],
        },
        {
            'code': 'recruitment',
            'name': 'Recruitment & Onboarding',
            'description': 'Applicant tracking and employee onboarding',
            'category': 'hr',
            'monthly_price': 15.00,
            'developing_country_price': 7.50,
            'is_core': False,
            'required_features': ['payroll'],
        },
        
        # Analytics Bundle ($5/month)
        {
            'code': 'analytics',
            'name': 'Advanced Analytics',
            'description': 'Advanced business analytics, reports, and insights',
            'category': 'analytics',
            'monthly_price': 5.00,
            'developing_country_price': 2.50,
            'is_core': False,
        },
        {
            'code': 'smart_insights',
            'name': 'AI Smart Insights',
            'description': 'AI-powered business insights and recommendations',
            'category': 'analytics',
            'monthly_price': 5.00,
            'developing_country_price': 2.50,
            'is_core': False,
            'required_features': ['analytics'],
        },
        
        # Accounting Pro ($10/month)
        {
            'code': 'accounting',
            'name': 'Accounting Pro',
            'description': 'Full double-entry accounting with financial statements',
            'category': 'financial',
            'monthly_price': 10.00,
            'developing_country_price': 5.00,
            'is_core': False,
        },
        
        # Marketing Suite ($6/month)
        {
            'code': 'marketing',
            'name': 'Marketing Automation',
            'description': 'Email campaigns, SMS marketing, and customer segmentation',
            'category': 'marketing',
            'monthly_price': 6.00,
            'developing_country_price': 3.00,
            'is_core': False,
        },
        {
            'code': 'whatsapp_business',
            'name': 'WhatsApp Business API',
            'description': 'WhatsApp Business integration for customer communication',
            'category': 'marketing',
            'monthly_price': 6.00,
            'developing_country_price': 3.00,
            'is_core': False,
            'required_features': ['marketing'],
        },
        
        # Operations ($12/month)
        {
            'code': 'jobs',
            'name': 'Jobs & Projects',
            'description': 'Job management, project tracking, and workflow automation',
            'category': 'operations',
            'monthly_price': 12.00,
            'developing_country_price': 6.00,
            'is_core': False,
        },
        {
            'code': 'transport',
            'name': 'Transport Management',
            'description': 'Fleet management, route planning, and logistics',
            'category': 'operations',
            'monthly_price': 12.00,
            'developing_country_price': 6.00,
            'is_core': False,
        },
        {
            'code': 'courier',
            'name': 'Courier Services',
            'description': 'Delivery management and courier dispatch',
            'category': 'operations',
            'monthly_price': 12.00,
            'developing_country_price': 6.00,
            'is_core': False,
        },
        
        # Other modules
        {
            'code': 'multi_location',
            'name': 'Multi-Location Management',
            'description': 'Manage multiple business locations from one account',
            'category': 'enterprise',
            'monthly_price': 10.00,
            'developing_country_price': 5.00,
            'is_core': False,
        },
        {
            'code': 'ecommerce',
            'name': 'E-commerce Pro',
            'description': 'Online store, shopping cart, and payment processing',
            'category': 'sales',
            'monthly_price': 10.00,
            'developing_country_price': 5.00,
            'is_core': False,
        },
        {
            'code': 'workflow_automation',
            'name': 'Workflow Automation',
            'description': 'Custom workflows, approvals, and business rules',
            'category': 'enterprise',
            'monthly_price': 8.00,
            'developing_country_price': 4.00,
            'is_core': False,
        },
    ]
    
    # Create all features
    for feature_data in core_features + paid_features:
        # Handle required_features field
        required_features = feature_data.pop('required_features', [])
        feature = FeatureModule.objects.create(**feature_data)
        if required_features:
            feature.required_features = required_features
            feature.save()


def remove_features(apps, schema_editor):
    FeatureModule = apps.get_model('users', 'FeatureModule')
    FeatureModule.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0131_add_feature_modules'),
    ]

    operations = [
        migrations.RunPython(create_initial_features, remove_features),
    ]