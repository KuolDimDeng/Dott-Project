"""
Mobile payroll tax filing API endpoints
"""
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum, Count, Q

from users.models import Business, UserProfile
from hr.models import Employee
from .models import PayrollRun, PayrollTransaction
from taxes.models import GlobalPayrollTax

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_tax_summary(request):
    """
    Get payroll tax summary for mobile tax filing interface
    """
    try:
        # Get query parameters
        year = int(request.GET.get('year', timezone.now().year))
        quarter = request.GET.get('quarter', 'Q1')  # Q1, Q2, Q3, Q4
        
        # Calculate quarter date range
        quarter_map = {
            'Q1': (1, 3),
            'Q2': (4, 6), 
            'Q3': (7, 9),
            'Q4': (10, 12)
        }
        
        start_month, end_month = quarter_map.get(quarter, (1, 3))
        start_date = datetime(year, start_month, 1).date()
        
        # Calculate end date (last day of end month)
        if end_month == 12:
            end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(year, end_month + 1, 1).date() - timedelta(days=1)
        
        # Get payroll runs for the period
        payroll_runs = PayrollRun.objects.filter(
            tenant_id=request.user.business_id,
            pay_date__gte=start_date,
            pay_date__lte=end_date,
            status__in=['completed', 'funded', 'distributing']
        )
        
        # Get payroll transactions for the period
        transactions = PayrollTransaction.objects.filter(
            tenant_id=request.user.business_id,
            payroll_run__pay_date__gte=start_date,
            payroll_run__pay_date__lte=end_date,
            payroll_run__status__in=['completed', 'funded', 'distributing']
        )
        
        # Calculate totals
        totals = transactions.aggregate(
            total_gross=Sum('gross_pay') or Decimal('0'),
            total_net=Sum('net_pay') or Decimal('0'),
            total_taxes=Sum('taxes') or Decimal('0'),
            total_federal=Sum('federal_tax') or Decimal('0'),
            total_state=Sum('state_tax') or Decimal('0'),
            total_social_security=Sum('social_security_tax') or Decimal('0'),
            total_medicare=Sum('medicare_tax') or Decimal('0'),
            employee_count=Count('employee', distinct=True)
        )
        
        # Get business info for tax rates
        business = Business.objects.get(id=request.user.business_id)
        
        # Calculate employer taxes (match employee portion for SS/Medicare)
        employer_social_security = totals['total_social_security']  # Employer matches employee
        employer_medicare = totals['total_medicare']  # Employer matches employee
        
        # Calculate FUTA tax (first $7,000 per employee at 6.0% rate)
        active_employees = Employee.objects.filter(
            tenant_id=request.user.business_id,
            is_active=True
        ).count()
        
        # Simplified FUTA calculation (first $7,000 per employee)
        futa_wage_base = min(totals['total_gross'], Decimal('7000.00') * active_employees)
        futa_tax = futa_wage_base * Decimal('0.006')  # 0.6% after state credit
        
        # Calculate quarterly due dates
        due_dates = {
            'Q1': f'April 30, {year}',
            'Q2': f'July 31, {year}',
            'Q3': f'October 31, {year}',
            'Q4': f'January 31, {year + 1}'
        }
        
        return Response({
            'success': True,
            'tax_summary': {
                'period': {
                    'year': year,
                    'quarter': quarter,
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d')
                },
                'payroll_totals': {
                    'total_wages': float(totals['total_gross']),
                    'total_net_pay': float(totals['total_net']),
                    'total_employee_taxes': float(totals['total_taxes']),
                    'employee_count': totals['employee_count'],
                    'payroll_runs': payroll_runs.count()
                },
                'federal_taxes': {
                    'federal_income_tax': float(totals['total_federal']),
                    'social_security_employee': float(totals['total_social_security']),
                    'social_security_employer': float(employer_social_security),
                    'medicare_employee': float(totals['total_medicare']),
                    'medicare_employer': float(employer_medicare),
                    'total_employee_federal': float(totals['total_federal'] + totals['total_social_security'] + totals['total_medicare']),
                    'total_employer_federal': float(employer_social_security + employer_medicare)
                },
                'state_taxes': {
                    'state_income_tax': float(totals['total_state']),
                    'state_unemployment': float(futa_tax * Decimal('4.5')),  # Estimated SUI
                    'state_disability': float(totals['total_gross'] * Decimal('0.011'))  # Estimated SDI
                },
                'futa': {
                    'taxable_wages': float(futa_wage_base),
                    'tax_rate': 0.6,  # After state credit
                    'tax_due': float(futa_tax)
                },
                'forms': {
                    'form_941': {
                        'due_date': due_dates[quarter],
                        'status': 'due',  # due, filed, overdue
                        'total_liability': float(totals['total_federal'] + totals['total_social_security'] + totals['total_medicare'] + employer_social_security + employer_medicare)
                    },
                    'form_940': {
                        'due_date': f'January 31, {year + 1}',
                        'status': 'upcoming' if quarter != 'Q4' else 'due',
                        'estimated_tax': float(futa_tax)
                    }
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting payroll tax summary: {str(e)}")
        return Response({
            'error': 'Failed to get payroll tax summary',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_form_941_data(request):
    """
    Get detailed Form 941 data for a specific quarter
    """
    try:
        year = int(request.GET.get('year', timezone.now().year))
        quarter = request.GET.get('quarter', 'Q1')
        
        # Calculate quarter date range
        quarter_map = {
            'Q1': (1, 3),
            'Q2': (4, 6),
            'Q3': (7, 9), 
            'Q4': (10, 12)
        }
        
        start_month, end_month = quarter_map.get(quarter, (1, 3))
        start_date = datetime(year, start_month, 1).date()
        
        if end_month == 12:
            end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(year, end_month + 1, 1).date() - timedelta(days=1)
        
        # Get business info
        business = Business.objects.get(id=request.user.business_id)
        
        # Get transactions for the quarter
        transactions = PayrollTransaction.objects.filter(
            tenant_id=request.user.business_id,
            payroll_run__pay_date__gte=start_date,
            payroll_run__pay_date__lte=end_date,
            payroll_run__status__in=['completed', 'funded', 'distributing']
        )
        
        # Calculate Form 941 specific data
        form_data = transactions.aggregate(
            wages_tips_compensation=Sum('gross_pay') or Decimal('0'),
            federal_income_tax=Sum('federal_tax') or Decimal('0'),
            social_security_wages=Sum('gross_pay') or Decimal('0'),  # Usually same as gross
            social_security_tax=Sum('social_security_tax') or Decimal('0'),
            medicare_wages=Sum('gross_pay') or Decimal('0'),  # Usually same as gross
            medicare_tax=Sum('medicare_tax') or Decimal('0'),
            employee_count=Count('employee', distinct=True)
        )
        
        # Calculate employer portions (match employee)
        employer_ss_tax = form_data['social_security_tax']
        employer_medicare_tax = form_data['medicare_tax']
        
        # Total tax liability
        total_tax_liability = (
            form_data['federal_income_tax'] +
            form_data['social_security_tax'] +
            employer_ss_tax +
            form_data['medicare_tax'] +
            employer_medicare_tax
        )
        
        return Response({
            'success': True,
            'form_941': {
                'period': {
                    'year': year,
                    'quarter': quarter,
                    'start_date': start_date.strftime('%B %d, %Y'),
                    'end_date': end_date.strftime('%B %d, %Y')
                },
                'business_info': {
                    'name': business.name,
                    'ein': business.tax_id or 'Not provided',
                    'address': f"{business.address}, {business.city}, {business.region} {business.postal_code}"
                },
                'line_items': {
                    'line_1': float(form_data['employee_count']),  # Number of employees
                    'line_2': float(form_data['wages_tips_compensation']),  # Wages, tips, and compensation
                    'line_3': float(form_data['federal_income_tax']),  # Federal income tax withheld
                    'line_5a': float(form_data['social_security_wages']),  # Taxable social security wages
                    'line_5b': float(form_data['social_security_tax']),  # Social security tax withheld
                    'line_5c': float(form_data['medicare_wages']),  # Taxable Medicare wages
                    'line_5d': float(form_data['medicare_tax']),  # Medicare tax withheld
                    'line_6': float(total_tax_liability),  # Total taxes before adjustments
                    'line_13': float(total_tax_liability),  # Total taxes after adjustments
                    'line_14': float(total_tax_liability)   # Total taxes for quarter
                },
                'totals': {
                    'total_wages': float(form_data['wages_tips_compensation']),
                    'total_federal_tax': float(form_data['federal_income_tax']),
                    'employee_ss_tax': float(form_data['social_security_tax']),
                    'employer_ss_tax': float(employer_ss_tax),
                    'employee_medicare_tax': float(form_data['medicare_tax']),
                    'employer_medicare_tax': float(employer_medicare_tax),
                    'total_tax_liability': float(total_tax_liability)
                },
                'due_date': get_941_due_date(quarter, year),
                'status': 'needs_filing'
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting Form 941 data: {str(e)}")
        return Response({
            'error': 'Failed to get Form 941 data',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_941_due_date(quarter, year):
    """Get the due date for Form 941 based on quarter"""
    due_dates = {
        'Q1': f'April 30, {year}',
        'Q2': f'July 31, {year}',
        'Q3': f'October 31, {year}',
        'Q4': f'January 31, {year + 1}'
    }
    return due_dates.get(quarter, f'April 30, {year}')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_tax_filing_service(request):
    """
    Request professional tax filing service
    """
    try:
        service_type = request.data.get('service_type')  # 'full_service' or 'consultation'
        form_types = request.data.get('form_types', [])  # ['941', '940', 'state']
        contact_preference = request.data.get('contact_preference', 'email')
        
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        # Log the service request
        logger.info(f"Tax filing service requested by {business.name} (ID: {business.id})")
        logger.info(f"Service type: {service_type}, Forms: {form_types}")
        
        # In a real implementation, this would:
        # 1. Create a service request record
        # 2. Send notification to tax professionals
        # 3. Schedule consultation call
        # 4. Send confirmation email to user
        
        return Response({
            'success': True,
            'message': 'Tax filing service request submitted successfully',
            'request_details': {
                'service_type': service_type,
                'form_types': form_types,
                'business_name': business.name,
                'contact_preference': contact_preference,
                'estimated_response_time': '1-2 business hours'
            }
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error requesting tax filing service: {str(e)}")
        return Response({
            'error': 'Failed to submit service request',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)