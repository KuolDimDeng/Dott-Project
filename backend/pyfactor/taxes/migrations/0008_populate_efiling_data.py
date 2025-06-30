# Data migration to populate e-filing configuration for top 20 states

from django.db import migrations
from decimal import Decimal


def populate_state_efiling_data(apps, schema_editor):
    State = apps.get_model('taxes', 'State')
    
    # E-filing configuration for top 20 states by sales tax revenue
    state_configs = {
        'CA': {
            'name': 'California',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://onlineservices.cdtfa.ca.gov/api',
            'e_file_formats': 'XML,JSON',
            'base_tax_rate': Decimal('0.0725'),
            'filing_frequency_thresholds': {
                'monthly': 1000000,
                'quarterly': 100000,
                'annually': 0
            },
            'form_number': 'BOE-401-A',
            'form_name': 'State, Local and District Sales and Use Tax Return',
            'filing_due_day': 31,
            'vendor_discount_rate': Decimal('0'),
            'has_district_taxes': True,
            'has_local_taxes': True,
            'requires_location_reporting': True
        },
        'TX': {
            'name': 'Texas',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://webfile.comptroller.texas.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.0625'),
            'filing_frequency_thresholds': {
                'monthly': 500000,
                'quarterly': 20000,
                'annually': 0
            },
            'form_number': '01-114',
            'form_name': 'Texas Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0.005'),
            'has_local_taxes': True,
            'requires_location_reporting': True
        },
        'FL': {
            'name': 'Florida',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://floridarevenue.com/eservices/api',
            'e_file_formats': 'XML,EDI',
            'base_tax_rate': Decimal('0.06'),
            'filing_frequency_thresholds': {
                'monthly': 16667,  # Based on tax collected
                'quarterly': 1667,
                'annually': 0
            },
            'form_number': 'DR-15',
            'form_name': 'Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0.025'),
            'has_local_taxes': True,
            'has_district_taxes': True
        },
        'NY': {
            'name': 'New York',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://www.tax.ny.gov/online/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.04'),
            'filing_frequency_thresholds': {
                'monthly': 3000000,
                'quarterly': 300000,
                'annually': 0
            },
            'form_number': 'ST-100',
            'form_name': 'New York State and Local Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'has_district_taxes': True,
            'requires_location_reporting': True
        },
        'PA': {
            'name': 'Pennsylvania',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://mypath.pa.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.06'),
            'filing_frequency_thresholds': {
                'monthly': 600000,
                'quarterly': 75000,
                'annually': 0
            },
            'form_number': 'PA-3',
            'form_name': 'PA Sales, Use and Hotel Occupancy Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0.01'),
            'has_local_taxes': True
        },
        'IL': {
            'name': 'Illinois',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://mytax.illinois.gov/api',
            'e_file_formats': 'XML,CSV',
            'base_tax_rate': Decimal('0.0625'),
            'filing_frequency_thresholds': {
                'monthly': 16000,  # Based on monthly tax
                'quarterly': 3200,
                'annually': 0
            },
            'form_number': 'ST-1',
            'form_name': 'Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0.0175'),
            'has_local_taxes': True,
            'requires_location_reporting': True
        },
        'OH': {
            'name': 'Ohio',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://bizfile.ohio.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.0575'),
            'filing_frequency_thresholds': {
                'monthly': 167000,  # Based on annual tax
                'quarterly': 84000,
                'semi_annually': 0
            },
            'form_number': 'UST-1',
            'form_name': 'Universal Sales and Use Tax Return',
            'filing_due_day': 23,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'has_district_taxes': True
        },
        'NC': {
            'name': 'North Carolina',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://eservices.ncdor.gov/api',
            'e_file_formats': 'XML,CSV',
            'base_tax_rate': Decimal('0.0475'),
            'filing_frequency_thresholds': {
                'monthly': 25263,  # Based on monthly tax
                'quarterly': 5053,
                'annually': 0
            },
            'form_number': 'E-500',
            'form_name': 'Sales and Use Tax Return',
            'filing_due_day': 15,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True
        },
        'GA': {
            'name': 'Georgia',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://gtc.dor.ga.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.04'),
            'filing_frequency_thresholds': {
                'monthly': 5000000,
                'quarterly': 200000,
                'annually': 0
            },
            'form_number': 'ST-3',
            'form_name': 'State Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True
        },
        'NJ': {
            'name': 'New Jersey',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://www.state.nj.us/treasury/taxation/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.06625'),
            'filing_frequency_thresholds': {
                'monthly': 453000,  # Based on annual tax
                'quarterly': 7547,
                'annually': 0
            },
            'form_number': 'ST-51',
            'form_name': 'Monthly Remittance Statement for Sales and Use Tax',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_district_taxes': True  # Urban Enterprise Zones
        },
        'VA': {
            'name': 'Virginia',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://www.tax.virginia.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.043'),
            'filing_frequency_thresholds': {
                'monthly': 960000,
                'quarterly': 12000,
                'annually': 0
            },
            'form_number': 'ST-9',
            'form_name': 'Retail Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0.011'),
            'has_local_taxes': True
        },
        'WA': {
            'name': 'Washington',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://secure.dor.wa.gov/api',
            'e_file_formats': 'XML,EDI',
            'base_tax_rate': Decimal('0.065'),
            'filing_frequency_thresholds': {
                'monthly': 4800000,
                'quarterly': 28000,
                'annually': 0
            },
            'form_number': 'Combined Excise Tax Return',
            'form_name': 'Washington Combined Excise Tax Return',
            'filing_due_day': 25,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'requires_location_reporting': True
        },
        'MA': {
            'name': 'Massachusetts',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://mtc.smartfile.com/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.0625'),
            'filing_frequency_thresholds': {
                'monthly': 1200000,
                'quarterly': 100000,
                'annually': 0
            },
            'form_number': 'ST-9',
            'form_name': 'Massachusetts Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': False
        },
        'AZ': {
            'name': 'Arizona',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://aztaxes.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.056'),
            'filing_frequency_thresholds': {
                'monthly': 107000,  # Based on monthly tax
                'quarterly': 21400,
                'annually': 0
            },
            'form_number': 'TPT-2',
            'form_name': 'Transaction Privilege Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'has_district_taxes': True
        },
        'MD': {
            'name': 'Maryland',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://interactive.marylandtaxes.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.06'),
            'filing_frequency_thresholds': {
                'monthly': 3600000,
                'quarterly': 200000,
                'annually': 0
            },
            'form_number': 'Form 202',
            'form_name': 'Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0.012'),
            'has_local_taxes': False
        },
        'MI': {
            'name': 'Michigan',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://mto.treasury.michigan.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.06'),
            'filing_frequency_thresholds': {
                'monthly': 1000000,  # Based on annual tax
                'quarterly': 160000,
                'annually': 0
            },
            'form_number': '5080',
            'form_name': 'Monthly/Quarterly Sales, Use and Withholding Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': False
        },
        'TN': {
            'name': 'Tennessee',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://tntap.tn.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.07'),
            'filing_frequency_thresholds': {
                'monthly': 34286,  # Based on monthly tax
                'quarterly': 8571,
                'annually': 0
            },
            'form_number': 'SLS 450',
            'form_name': 'Sales and Use Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'requires_location_reporting': True
        },
        'IN': {
            'name': 'Indiana',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://intime.dor.in.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.07'),
            'filing_frequency_thresholds': {
                'monthly': 171429,  # Based on monthly tax
                'quarterly': 14286,
                'annually': 0
            },
            'form_number': 'ST-103',
            'form_name': 'Indiana Sales Tax Return',
            'filing_due_day': 30,
            'vendor_discount_rate': Decimal('0.007'),
            'has_local_taxes': False
        },
        'WI': {
            'name': 'Wisconsin',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://tap.revenue.wi.gov/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.05'),
            'filing_frequency_thresholds': {
                'monthly': 72000,  # Based on annual tax
                'quarterly': 12000,
                'annually': 0
            },
            'form_number': 'ST-12',
            'form_name': 'Sales and Use Tax Return',
            'filing_due_day': 31,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'has_district_taxes': True  # Stadium tax
        },
        'CO': {
            'name': 'Colorado',
            'e_file_supported': True,
            'e_file_api_base_url': 'https://www.colorado.gov/revenueonline/api',
            'e_file_formats': 'XML',
            'base_tax_rate': Decimal('0.029'),
            'filing_frequency_thresholds': {
                'monthly': 103448,  # Based on annual tax
                'quarterly': 10345,
                'annually': 0
            },
            'form_number': 'DR 0100',
            'form_name': 'Retail Sales Tax Return',
            'filing_due_day': 20,
            'vendor_discount_rate': Decimal('0'),
            'has_local_taxes': True,
            'has_home_rule_cities': True,
            'requires_location_reporting': True
        }
    }
    
    # Update or create states with e-filing configuration
    for code, config in state_configs.items():
        state, created = State.objects.update_or_create(
            code=code,
            defaults={
                'name': config['name'],
                'e_file_supported': config.get('e_file_supported', False),
                'e_file_api_base_url': config.get('e_file_api_base_url', ''),
                'e_file_api_version': 'v1',
                'e_file_formats': config.get('e_file_formats', 'XML'),
                'base_tax_rate': config.get('base_tax_rate', Decimal('0')),
                'filing_frequency_thresholds': config.get('filing_frequency_thresholds', {}),
                'form_number': config.get('form_number', ''),
                'form_name': config.get('form_name', ''),
                'filing_due_day': config.get('filing_due_day', 20),
                'vendor_discount_rate': config.get('vendor_discount_rate', Decimal('0')),
                'has_local_taxes': config.get('has_local_taxes', False),
                'has_district_taxes': config.get('has_district_taxes', False),
                'has_home_rule_cities': config.get('has_home_rule_cities', False),
                'requires_location_reporting': config.get('requires_location_reporting', False),
                'country': 'US',
                'is_active': True
            }
        )


def reverse_populate_state_efiling_data(apps, schema_editor):
    # Reverse operation - just clear the e-filing specific fields
    State = apps.get_model('taxes', 'State')
    State.objects.filter(code__in=[
        'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'NC', 'GA', 'NJ',
        'VA', 'WA', 'MA', 'AZ', 'MD', 'MI', 'TN', 'IN', 'WI', 'CO'
    ]).update(
        e_file_api_base_url=None,
        e_file_formats='XML',
        base_tax_rate=0,
        filing_frequency_thresholds={},
        form_number='',
        form_name='',
        filing_due_day=20,
        vendor_discount_rate=0,
        has_district_taxes=False,
        has_home_rule_cities=False,
        requires_location_reporting=False
    )


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0007_add_efiling_fields'),
    ]

    operations = [
        migrations.RunPython(
            populate_state_efiling_data,
            reverse_populate_state_efiling_data
        ),
    ]