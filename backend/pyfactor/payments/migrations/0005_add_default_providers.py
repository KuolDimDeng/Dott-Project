# Data migration to add default mobile money providers
from django.db import migrations


def add_default_providers(apps, schema_editor):
    MobileMoneyProvider = apps.get_model('payments', 'MobileMoneyProvider')
    
    providers = [
        {
            'name': 'MTN_MOMO',
            'code': 'MTN',
            'description': 'MTN Mobile Money',
            'primary_color': '#FFCC00',
            'secondary_color': '#000000',
            'countries': ['UG', 'GH', 'ZA', 'NG', 'CM', 'CI', 'BJ', 'GN', 'ZM', 'RW', 'SS'],
            'currencies': ['USD', 'UGX', 'GHS', 'ZAR', 'NGN', 'XAF', 'XOF', 'GNF', 'ZMW', 'RWF', 'SSP'],
            'is_active': True,
            'min_amount': 1.00,
            'max_amount': 10000.00,
            'daily_limit': 5000.00,
            'monthly_limit': 50000.00,
            'transaction_fee_percentage': 0.0100,
            'transaction_fee_fixed': 0.00,
            'sandbox_mode': True,
        },
        {
            'name': 'M_PESA',
            'code': 'MPESA',
            'description': 'M-Pesa Mobile Money',
            'primary_color': '#00B251',
            'secondary_color': '#ED1C24',
            'countries': ['KE', 'TZ', 'UG', 'MZ', 'CD', 'GH', 'EG', 'LS', 'IN'],
            'currencies': ['USD', 'KES', 'TZS', 'UGX', 'MZN', 'CDF', 'GHS', 'EGP', 'LSL', 'INR'],
            'is_active': True,
            'min_amount': 1.00,
            'max_amount': 15000.00,
            'daily_limit': 7000.00,
            'monthly_limit': 70000.00,
            'transaction_fee_percentage': 0.0150,
            'transaction_fee_fixed': 0.00,
            'sandbox_mode': True,
        },
    ]
    
    for provider_data in providers:
        MobileMoneyProvider.objects.get_or_create(
            name=provider_data['name'],
            defaults=provider_data
        )


def remove_default_providers(apps, schema_editor):
    MobileMoneyProvider = apps.get_model('payments', 'MobileMoneyProvider')
    MobileMoneyProvider.objects.filter(name__in=['MTN_MOMO', 'M_PESA']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_create_wallet_models'),
    ]

    operations = [
        migrations.RunPython(add_default_providers, remove_default_providers),
    ]