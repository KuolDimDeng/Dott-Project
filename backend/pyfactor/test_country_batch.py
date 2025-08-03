#!/usr/bin/env python3
"""
Test script to add sample filing information for a few countries.
"""
import os
import sys
import django
from decimal import Decimal

# Django setup
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from taxes.models import GlobalSalesTaxRate

# Sample filing information for major countries
SAMPLE_FILING_DATA = {
    'US': {
        'tax_authority_name': 'Internal Revenue Service (IRS)',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 15,
        'online_filing_available': True,
        'online_portal_name': 'IRS e-file',
        'online_portal_url': 'https://www.irs.gov/e-file-providers',
        'main_form_name': 'Form 1040',
        'filing_instructions': 'File quarterly estimated taxes using Form 1040-ES. Annual returns due April 15th. E-filing is recommended for faster processing.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 125.00
    },
    'GB': {
        'tax_authority_name': 'HM Revenue & Customs (HMRC)',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'online_filing_available': True,
        'online_portal_name': 'HMRC Online Services',
        'online_portal_url': 'https://www.gov.uk/log-in-register-hmrc-online-services',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit VAT returns quarterly through HMRC online services. Making Tax Digital (MTD) compliance required for VAT-registered businesses.',
        'manual_filing_fee': 65.00,
        'online_filing_fee': 95.00
    },
    'CA': {
        'tax_authority_name': 'Canada Revenue Agency (CRA)',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'online_filing_available': True,
        'online_portal_name': 'My Business Account',
        'online_portal_url': 'https://www.canada.ca/en/revenue-agency/services/e-services/e-services-businesses/business-account.html',
        'main_form_name': 'GST/HST Return',
        'filing_instructions': 'File GST/HST returns based on your reporting period (monthly, quarterly, or annually). Use CRA My Business Account for online filing.',
        'manual_filing_fee': 55.00,
        'online_filing_fee': 85.00
    },
    'AU': {
        'tax_authority_name': 'Australian Taxation Office (ATO)',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 28,
        'online_filing_available': True,
        'online_portal_name': 'Business Portal',
        'online_portal_url': 'https://www.ato.gov.au/business/business-activity-statements-(bas)/',
        'main_form_name': 'Business Activity Statement (BAS)',
        'filing_instructions': 'Lodge BAS quarterly by the 28th of the month following quarter end. Use the ATO Business Portal for online lodgment.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 90.00
    },
    'DE': {
        'tax_authority_name': 'Bundeszentralamt für Steuern',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 10,
        'online_filing_available': True,
        'online_portal_name': 'ELSTER',
        'online_portal_url': 'https://www.elster.de',
        'main_form_name': 'Umsatzsteuervoranmeldung',
        'filing_instructions': 'Submit monthly VAT returns by the 10th of the following month using ELSTER online portal. Annual reconciliation required.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 100.00
    },
    'FR': {
        'tax_authority_name': 'Direction générale des Finances publiques (DGFiP)',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 19,
        'online_filing_available': True,
        'online_portal_name': 'impots.gouv.fr',
        'online_portal_url': 'https://www.impots.gouv.fr/professionnel',
        'main_form_name': 'Déclaration de TVA',
        'filing_instructions': 'File monthly VAT returns by the 19th using the professional space on impots.gouv.fr. Electronic filing is mandatory for most businesses.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 105.00
    },
    'JP': {
        'tax_authority_name': 'National Tax Agency (国税庁)',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'online_filing_available': True,
        'online_portal_name': 'e-Tax',
        'online_portal_url': 'https://www.e-tax.nta.go.jp',
        'main_form_name': 'Consumption Tax Return',
        'filing_instructions': 'File consumption tax returns quarterly or annually depending on business size. E-Tax system available for electronic filing.',
        'manual_filing_fee': 80.00,
        'online_filing_fee': 110.00
    },
    'IN': {
        'tax_authority_name': 'Goods and Services Tax Network (GSTN)',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'online_filing_available': True,
        'online_portal_name': 'GST Portal',
        'online_portal_url': 'https://www.gst.gov.in',
        'main_form_name': 'GSTR-3B',
        'filing_instructions': 'File monthly GST returns (GSTR-3B) by the 20th of the following month. All filing must be done through the GST portal.',
        'manual_filing_fee': 35.00,
        'online_filing_fee': 50.00
    },
    'NZ': {
        'tax_authority_name': 'Inland Revenue Department (IRD)',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': 28,
        'online_filing_available': True,
        'online_portal_name': 'myIR',
        'online_portal_url': 'https://www.ird.govt.nz/myir',
        'main_form_name': 'GST Return',
        'filing_instructions': 'File GST returns every two months by the 28th. Use myIR online services for convenient filing and payment.',
        'manual_filing_fee': 50.00,
        'online_filing_fee': 75.00
    },
    'SG': {
        'tax_authority_name': 'Inland Revenue Authority of Singapore (IRAS)',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'online_filing_available': True,
        'online_portal_name': 'myTax Portal',
        'online_portal_url': 'https://mytax.iras.gov.sg',
        'main_form_name': 'GST F5 Return',
        'filing_instructions': 'Submit GST returns quarterly within one month after the end of each quarter. Use myTax Portal for e-filing.',
        'manual_filing_fee': 55.00,
        'online_filing_fee': 80.00
    }
}

def update_sample_countries():
    """Update filing information for sample countries."""
    
    success_count = 0
    error_count = 0
    
    print("Updating filing information for sample countries...")
    print("=" * 60)
    
    for country_code, filing_info in SAMPLE_FILING_DATA.items():
        # Get all records for this country
        tax_rates = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            is_current=True
        )
        
        if not tax_rates.exists():
            print(f"⚠️  No tax rate found for {country_code}")
            continue
            
        # Update first record for the country
        tax_rate = tax_rates.first()
        
        try:
            with transaction.atomic():
                tax_rate.tax_authority_name = filing_info['tax_authority_name']
                tax_rate.filing_frequency = filing_info['filing_frequency']
                tax_rate.filing_day_of_month = filing_info['filing_day_of_month']
                tax_rate.online_filing_available = filing_info['online_filing_available']
                tax_rate.online_portal_name = filing_info['online_portal_name']
                tax_rate.online_portal_url = filing_info['online_portal_url']
                tax_rate.main_form_name = filing_info['main_form_name']
                tax_rate.filing_instructions = filing_info['filing_instructions']
                tax_rate.manual_filing_fee = Decimal(str(filing_info['manual_filing_fee']))
                tax_rate.online_filing_fee = Decimal(str(filing_info['online_filing_fee']))
                
                tax_rate.save()
                success_count += 1
                print(f"✅ {tax_rate.country_name} ({country_code}) - Updated successfully")
                
        except Exception as e:
            error_count += 1
            print(f"❌ {country_code} - Error: {e}")
    
    print("\n" + "=" * 60)
    print(f"Update complete: {success_count} successful, {error_count} errors")
    
    # Show updated records
    print("\nUpdated records:")
    print("-" * 60)
    
    updated_rates = GlobalSalesTaxRate.objects.filter(
        country__in=SAMPLE_FILING_DATA.keys(),
        is_current=True,
        tax_authority_name__isnull=False
    ).order_by('country_name')
    
    for rate in updated_rates:
        print(f"\n{rate.country_name} ({rate.country}):")
        print(f"  Authority: {rate.tax_authority_name}")
        print(f"  Frequency: {rate.filing_frequency}")
        print(f"  Online: {'Yes' if rate.online_filing_available else 'No'}")
        if rate.online_portal_url:
            print(f"  Portal: {rate.online_portal_name} - {rate.online_portal_url}")
        print(f"  Fees: Manual ${rate.manual_filing_fee}, Online ${rate.online_filing_fee}")

if __name__ == "__main__":
    update_sample_countries()