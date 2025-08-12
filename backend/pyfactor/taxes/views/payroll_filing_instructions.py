from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from decimal import Decimal
import logging
from datetime import datetime, timedelta

from ..models import GlobalPayrollTax, TaxFiling
from payroll.models import PayrollRun, PayrollTransaction

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_filing_instructions(request, filing_id):
    """
    Generate comprehensive self-service filing instructions for a payroll tax filing
    """
    try:
        tenant = request.user.profile.tenant
        filing = TaxFiling.objects.get(id=filing_id, tenant=tenant, filing_type='payroll')
        
        # Extract location info
        jurisdiction = filing.jurisdiction
        if '-' in jurisdiction:
            country, state = jurisdiction.split('-')
        else:
            country = jurisdiction
            state = None
            
        # Get tax authority info
        if country == 'US' and state:
            tax_info = GlobalPayrollTax.objects.filter(
                country='US',
                region_code=state
            ).first()
        else:
            tax_info = GlobalPayrollTax.objects.filter(
                country=country,
                region_code__isnull=True
            ).first()
            
        if not tax_info:
            return Response({
                'error': 'Tax information not found for this jurisdiction'
            }, status=status.HTTP_404_NOT_FOUND)
            
        # Build comprehensive instructions
        instructions = {
            'filing_summary': {
                'filing_id': str(filing.id),
                'period': f"{filing.filing_period_start} to {filing.filing_period_end}",
                'jurisdiction': filing.jurisdiction,
                'status': filing.status,
                'created_date': filing.created_at.strftime('%Y-%m-%d'),
                'service_type': 'self_service'
            },
            
            'tax_calculations': {
                'gross_wages': str(filing.gross_sales),
                'total_employee_tax': str(filing.filing_data.get('total_employee_tax', 0)),
                'total_employer_tax': str(filing.filing_data.get('total_employer_tax', 0)),
                'total_tax_due': str(filing.tax_due),
                'employee_count': filing.filing_data.get('employee_count', 0),
                'breakdown': _get_detailed_tax_breakdown(filing)
            },
            
            'where_to_file': {
                'tax_authority': tax_info.tax_authority_name,
                'online_portal': tax_info.online_portal_url if tax_info.online_filing_available else None,
                'online_available': tax_info.online_filing_available,
                'portal_name': tax_info.online_portal_name,
                'physical_address': _get_physical_filing_address(country, state),
                'phone': _get_tax_authority_phone(country, state),
                'business_hours': _get_business_hours(country)
            },
            
            'forms_needed': {
                'employer_return': tax_info.employer_return_form or _get_default_form(country, 'return'),
                'payment_voucher': _get_payment_voucher_form(country, state),
                'supporting_docs': _get_supporting_documents(country, filing.filing_period_start),
                'where_to_download': _get_form_download_url(country, state)
            },
            
            'deadlines': {
                'filing_frequency': tax_info.filing_frequency,
                'due_date': _calculate_due_date(filing.filing_period_end, tax_info),
                'deposit_schedule': tax_info.deposit_schedule,
                'late_filing_penalty': _get_penalty_info(country, 'filing'),
                'late_payment_penalty': _get_penalty_info(country, 'payment')
            },
            
            'payment_instructions': {
                'payment_methods': _get_payment_methods(country),
                'reference_number': _generate_reference_number(filing),
                'payment_amount': str(filing.tax_due),
                'bank_details': _get_tax_payment_bank_details(country, state),
                'online_payment_url': _get_online_payment_url(country, state)
            },
            
            'step_by_step_guide': _generate_step_by_step_guide(
                country, state, tax_info, filing
            ),
            
            'common_mistakes': tax_info.common_mistakes or _get_default_common_mistakes(),
            
            'help_resources': {
                'official_website': tax_info.online_portal_url,
                'phone_support': _get_tax_authority_phone(country, state),
                'email_support': _get_tax_authority_email(country, state),
                'faq_url': _get_faq_url(country, state),
                'video_guides': _get_video_guide_urls(country)
            }
        }
        
        return Response({
            'success': True,
            'instructions': instructions
        })
        
    except TaxFiling.DoesNotExist:
        return Response({
            'error': 'Filing not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error generating filing instructions: {str(e)}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _get_detailed_tax_breakdown(filing):
    """Get detailed breakdown of all tax components"""
    breakdown = []
    data = filing.filing_data
    
    # Add each tax component
    if data.get('total_employee_tax'):
        breakdown.append({
            'component': 'Employee Income Tax',
            'amount': data.get('total_employee_tax'),
            'description': 'Withheld from employee salaries'
        })
    
    if data.get('total_employer_tax'):
        breakdown.append({
            'component': 'Employer Payroll Tax',
            'amount': data.get('total_employer_tax'),
            'description': 'Paid by employer in addition to salaries'
        })
        
    return breakdown


def _calculate_due_date(period_end, tax_info):
    """Calculate the actual due date based on filing frequency"""
    period_end_date = datetime.strptime(str(period_end), '%Y-%m-%d')
    
    if tax_info.filing_frequency == 'monthly':
        # Usually 15th of next month
        next_month = period_end_date.replace(day=1) + timedelta(days=32)
        due_date = next_month.replace(day=tax_info.filing_day_of_month or 15)
    elif tax_info.filing_frequency == 'quarterly':
        # Usually 30 days after quarter end
        due_date = period_end_date + timedelta(days=tax_info.quarter_end_filing_days or 30)
    else:
        # Default to 15 days after period end
        due_date = period_end_date + timedelta(days=15)
        
    return due_date.strftime('%Y-%m-%d')


def _generate_step_by_step_guide(country, state, tax_info, filing):
    """Generate detailed step-by-step filing instructions"""
    steps = []
    
    if tax_info.online_filing_available:
        steps.extend([
            {
                'step': 1,
                'title': 'Access Online Portal',
                'instructions': f"Go to {tax_info.online_portal_url}",
                'tips': ['Have your employer ID ready', 'Use Chrome or Firefox for best results']
            },
            {
                'step': 2,
                'title': 'Login or Register',
                'instructions': 'Login with your employer credentials or register if first time',
                'tips': ['Keep your password secure', 'Save your username for future filings']
            },
            {
                'step': 3,
                'title': 'Select Filing Period',
                'instructions': f"Select period: {filing.filing_period_start} to {filing.filing_period_end}",
                'tips': ['Ensure correct tax year', 'Verify the period matches your payroll']
            },
            {
                'step': 4,
                'title': 'Enter Tax Amounts',
                'instructions': 'Enter the calculated tax amounts from this report',
                'tips': [
                    f'Employee taxes: {filing.filing_data.get("total_employee_tax", 0)}',
                    f'Employer taxes: {filing.filing_data.get("total_employer_tax", 0)}'
                ]
            },
            {
                'step': 5,
                'title': 'Review and Submit',
                'instructions': 'Review all entries carefully before submitting',
                'tips': ['Print confirmation for your records', 'Note the confirmation number']
            },
            {
                'step': 6,
                'title': 'Make Payment',
                'instructions': f'Pay ${filing.tax_due} using available payment methods',
                'tips': ['Pay by due date to avoid penalties', 'Keep payment confirmation']
            }
        ])
    else:
        steps.extend([
            {
                'step': 1,
                'title': 'Download Forms',
                'instructions': f'Download form {tax_info.employer_return_form or "employer return form"}',
                'tips': ['Use latest version', 'Print extra copies']
            },
            {
                'step': 2,
                'title': 'Complete Form',
                'instructions': 'Fill out all required fields with information from this report',
                'tips': ['Use black ink', 'Write clearly', 'Double-check calculations']
            },
            {
                'step': 3,
                'title': 'Prepare Payment',
                'instructions': f'Prepare payment for ${filing.tax_due}',
                'tips': ['Include payment voucher', 'Write employer ID on check']
            },
            {
                'step': 4,
                'title': 'Submit Filing',
                'instructions': 'Mail or deliver form with payment to tax authority',
                'tips': ['Use certified mail', 'Keep copies', 'Get receipt']
            }
        ])
        
    return steps


def _generate_reference_number(filing):
    """Generate a reference number for the payment"""
    return f"DOTT-{filing.id.hex[:8].upper()}-{filing.filing_period_end.strftime('%Y%m')}"


# Default helper functions for common scenarios
def _get_physical_filing_address(country, state):
    """Get physical address for paper filing"""
    addresses = {
        'US': {
            'default': 'Internal Revenue Service, Cincinnati, OH 45999',
            'CA': 'California EDD, PO Box 989067, West Sacramento, CA 95798',
            'NY': 'NYS Tax Department, W.A. Harriman Campus, Albany, NY 12227',
            'TX': 'Texas Workforce Commission, Austin, TX 78778',
        },
        'CA': 'Canada Revenue Agency, Ottawa, ON K1A 0L5',
        'GB': 'HM Revenue & Customs, Pay As You Earn, BX9 1AS',
        'AU': 'Australian Taxation Office, GPO Box 9990, Sydney NSW 2001',
    }
    
    if country == 'US' and state:
        return addresses.get('US', {}).get(state, addresses['US']['default'])
    return addresses.get(country, 'Contact local tax authority')


def _get_tax_authority_phone(country, state):
    """Get phone number for tax authority"""
    phones = {
        'US': '1-800-829-4933',
        'CA': '1-800-959-5525',
        'GB': '+44 300 200 3300',
        'AU': '13 28 65',
        'DE': '+49 30 18 681 0',
    }
    return phones.get(country, 'See tax authority website')


def _get_payment_methods(country):
    """Get available payment methods"""
    methods = {
        'US': ['Electronic funds transfer (EFT)', 'Credit/debit card', 'Check', 'EFTPS'],
        'CA': ['Online banking', 'Pre-authorized debit', 'Credit card', 'Cheque'],
        'GB': ['Direct debit', 'Bank transfer', 'Debit/credit card', 'Cheque'],
        'default': ['Bank transfer', 'Check', 'Online payment']
    }
    return methods.get(country, methods['default'])


def _get_default_form(country, form_type):
    """Get default form numbers by country"""
    forms = {
        'US': {'return': 'Form 941', 'payment': 'Form 941-V'},
        'CA': {'return': 'PD7A', 'payment': 'PD7A-V'},
        'GB': {'return': 'P30', 'payment': 'P30'},
    }
    return forms.get(country, {}).get(form_type, 'See tax authority website')


def _get_penalty_info(country, penalty_type):
    """Get penalty information"""
    penalties = {
        'US': {
            'filing': '5% per month up to 25%',
            'payment': '0.5% per month plus interest'
        },
        'default': {
            'filing': 'Varies by jurisdiction',
            'payment': 'Interest and penalties may apply'
        }
    }
    return penalties.get(country, penalties['default']).get(penalty_type)


def _get_default_common_mistakes():
    """Default list of common mistakes to avoid"""
    return [
        'Using outdated forms',
        'Missing filing deadlines',
        'Incorrect employer identification number',
        'Math errors in calculations',
        'Forgetting to sign forms',
        'Not keeping copies for records',
        'Using wrong tax period',
        'Missing payment voucher'
    ]


def _get_business_hours(country):
    """Get typical business hours for tax offices"""
    hours = {
        'US': 'Monday-Friday 8:00 AM - 5:00 PM local time',
        'GB': 'Monday-Friday 8:00 AM - 6:00 PM GMT',
        'CA': 'Monday-Friday 8:00 AM - 4:00 PM local time',
    }
    return hours.get(country, 'Check local tax authority website')


def _get_form_download_url(country, state):
    """Get URL for downloading forms"""
    urls = {
        'US': 'https://www.irs.gov/forms-instructions',
        'CA': 'https://www.canada.ca/en/revenue-agency/services/forms-publications.html',
        'GB': 'https://www.gov.uk/government/collections/hm-revenue-customs-forms',
    }
    return urls.get(country, 'Search for tax forms on government website')


def _get_supporting_documents(country, period_start):
    """List required supporting documents"""
    return [
        'Payroll register for the period',
        'Employee list with tax withholdings',
        'Previous filing confirmation',
        'Bank statements showing tax deposits',
        'Calculation worksheets'
    ]


def _get_tax_payment_bank_details(country, state):
    """Get bank details for tax payments"""
    return {
        'note': 'Use official payment methods from tax authority',
        'warning': 'Never send payments to unofficial accounts'
    }


def _get_online_payment_url(country, state):
    """Get URL for online payments"""
    urls = {
        'US': 'https://www.eftps.gov',
        'CA': 'https://www.canada.ca/en/revenue-agency/services/e-services/payment.html',
        'GB': 'https://www.gov.uk/pay-paye-tax',
    }
    return urls.get(country)


def _get_tax_authority_email(country, state):
    """Get email for tax authority support"""
    # Most tax authorities prefer phone or secure message portal
    return 'Use secure message center in online portal'


def _get_faq_url(country, state):
    """Get FAQ URL for common questions"""
    urls = {
        'US': 'https://www.irs.gov/faqs',
        'CA': 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll.html',
        'GB': 'https://www.gov.uk/browse/tax/paye',
    }
    return urls.get(country, 'Check tax authority website')


def _get_video_guide_urls(country):
    """Get video guide URLs if available"""
    # Most tax authorities have YouTube channels
    return {
        'official': 'Check tax authority YouTube channel',
        'search': f'Search YouTube for "{country} payroll tax filing guide"'
    }