from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Q
from django.utils import timezone
from decimal import Decimal
import json
import logging

from ..models import GlobalPayrollTax, TenantTaxSettings, TaxFiling
from hr.models import Employee
from payroll.models import PayrollRun, PayrollTransaction

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_payroll_tax(request):
    """Calculate payroll taxes based on location and wages"""
    try:
        country_code = request.data.get('country_code', 'US')
        state_code = request.data.get('state_code')
        gross_wages = Decimal(str(request.data.get('gross_wages', 0)))
        pay_period = request.data.get('pay_period', 'monthly')
        year_to_date_wages = Decimal(str(request.data.get('year_to_date_wages', 0)))
        
        # Get global payroll tax rates
        if country_code == 'US' and state_code:
            payroll_tax = GlobalPayrollTax.objects.filter(
                country_code='US',
                state_or_province=state_code
            ).first()
        else:
            payroll_tax = GlobalPayrollTax.objects.filter(
                country_code=country_code,
                state_or_province__isnull=True
            ).first()
            
        if not payroll_tax:
            return Response({
                'error': 'Payroll tax rates not found for the specified location'
            }, status=status.HTTP_404_NOT_FOUND)
            
        # Get tenant-specific overrides
        tenant_settings = TenantTaxSettings.objects.filter(
            tenant=request.user.profile.tenant
        ).first()
        
        # Apply overrides if available
        employee_rate = payroll_tax.employee_rate
        employer_rate = payroll_tax.employer_rate
        
        if tenant_settings:
            if tenant_settings.payroll_employee_rate is not None:
                employee_rate = tenant_settings.payroll_employee_rate
            if tenant_settings.payroll_employer_rate is not None:
                employer_rate = tenant_settings.payroll_employer_rate
                
        # Calculate taxes
        employee_tax = gross_wages * (employee_rate / 100)
        employer_tax = gross_wages * (employer_rate / 100)
        
        # Check thresholds
        if payroll_tax.employee_wage_threshold and year_to_date_wages > payroll_tax.employee_wage_threshold:
            employee_tax = Decimal('0')
        if payroll_tax.employer_wage_threshold and year_to_date_wages > payroll_tax.employer_wage_threshold:
            employer_tax = Decimal('0')
            
        response_data = {
            'gross_wages': str(gross_wages),
            'employee_tax': str(employee_tax),
            'employer_tax': str(employer_tax),
            'total_tax': str(employee_tax + employer_tax),
            'employee_rate': str(employee_rate),
            'employer_rate': str(employer_rate),
            'tax_authority': payroll_tax.tax_authority_name,
            'filing_frequency': payroll_tax.filing_frequency,
            'online_portal_url': payroll_tax.online_portal_url,
            'country_code': country_code,
            'state_code': state_code
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error calculating payroll tax: {str(e)}")
        return Response({
            'error': f'Failed to calculate payroll tax: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_tax_settings(request):
    """Get payroll tax settings for the tenant"""
    try:
        country_code = request.query_params.get('country_code', 'US')
        state_code = request.query_params.get('state_code')
        
        # Get global payroll tax rates
        if country_code == 'US' and state_code:
            payroll_tax = GlobalPayrollTax.objects.filter(
                country_code='US',
                state_or_province=state_code
            ).first()
        else:
            payroll_tax = GlobalPayrollTax.objects.filter(
                country_code=country_code,
                state_or_province__isnull=True
            ).first()
            
        if not payroll_tax:
            return Response({
                'error': 'Payroll tax rates not found for the specified location'
            }, status=status.HTTP_404_NOT_FOUND)
            
        # Get tenant-specific settings
        tenant_settings = TenantTaxSettings.objects.filter(
            tenant=request.user.profile.tenant
        ).first()
        
        response_data = {
            'global_settings': {
                'employee_rate': str(payroll_tax.employee_rate),
                'employer_rate': str(payroll_tax.employer_rate),
                'employee_wage_threshold': str(payroll_tax.employee_wage_threshold) if payroll_tax.employee_wage_threshold else None,
                'employer_wage_threshold': str(payroll_tax.employer_wage_threshold) if payroll_tax.employer_wage_threshold else None,
                'tax_authority_name': payroll_tax.tax_authority_name,
                'filing_frequency': payroll_tax.filing_frequency,
                'online_portal_url': payroll_tax.online_portal_url,
                'required_forms': payroll_tax.required_forms,
                'payment_methods': payroll_tax.payment_methods,
                'filing_deadline_notes': payroll_tax.filing_deadline_notes
            }
        }
        
        if tenant_settings:
            response_data['tenant_overrides'] = {
                'employee_rate': str(tenant_settings.payroll_employee_rate) if tenant_settings.payroll_employee_rate else None,
                'employer_rate': str(tenant_settings.payroll_employer_rate) if tenant_settings.payroll_employer_rate else None,
                'registration_number': tenant_settings.payroll_registration_number,
                'filing_frequency': tenant_settings.payroll_filing_frequency
            }
        else:
            response_data['tenant_overrides'] = None
            
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting payroll tax settings: {str(e)}")
        return Response({
            'error': f'Failed to get payroll tax settings: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payroll_tax_filing(request):
    """Create a new payroll tax filing"""
    try:
        tenant = request.user.profile.tenant
        filing_data = request.data
        
        # Get payroll data for the period
        start_date = filing_data.get('start_date')
        end_date = filing_data.get('end_date')
        country_code = filing_data.get('country_code', 'US')
        state_code = filing_data.get('state_code')
        service_type = filing_data.get('service_type', 'self_service')
        
        # Calculate total wages and taxes from payroll transactions
        payroll_runs = PayrollRun.objects.filter(
            tenant=tenant,
            pay_date__gte=start_date,
            pay_date__lte=end_date,
            status__in=['completed', 'distributing', 'funded']
        )
        
        # Get all transactions for these payroll runs
        transactions = PayrollTransaction.objects.filter(
            payroll_run__in=payroll_runs,
            tenant=tenant
        )
        
        total_gross_wages = transactions.aggregate(
            total=Sum('gross_pay')
        )['total'] or Decimal('0')
        
        # Calculate total employee taxes (sum of all tax components)
        total_employee_tax = transactions.aggregate(
            total=Sum('taxes')
        )['total'] or Decimal('0')
        
        # Get payroll tax rates to calculate employer portion
        if country_code == 'US' and state_code:
            payroll_tax = GlobalPayrollTax.objects.filter(
                country_code='US',
                state_or_province=state_code
            ).first()
        else:
            payroll_tax = GlobalPayrollTax.objects.filter(
                country_code=country_code,
                state_or_province__isnull=True
            ).first()
            
        # Get tenant overrides if available
        tenant_settings = TenantTaxSettings.objects.filter(tenant=tenant).first()
        employer_rate = payroll_tax.employer_rate if payroll_tax else Decimal('7.65')  # Default US employer rate
        
        if tenant_settings and tenant_settings.payroll_employer_rate:
            employer_rate = tenant_settings.payroll_employer_rate
            
        # Calculate employer tax portion based on gross wages and employer rate
        total_employer_tax = total_gross_wages * (employer_rate / 100)
        
        # Determine fee based on service type
        # NEW FEE STRUCTURE: 2.4% of total taxes + direct deposit fees
        if filing_data.get('use_percentage_fee', False):
            # New percentage-based fee structure
            processing_fee_rate = Decimal('0.024')  # 2.4%
            direct_deposit_fee_per_employee = Decimal('2.00')
            
            processing_fee = (total_employee_tax + total_employer_tax) * processing_fee_rate
            direct_deposit_fee = transactions.values('employee').distinct().count() * direct_deposit_fee_per_employee
            fee = processing_fee + direct_deposit_fee
            
            fee_breakdown = {
                'processing_fee': str(processing_fee),
                'direct_deposit_fee': str(direct_deposit_fee),
                'total_fee': str(fee),
                'fee_type': 'percentage_based'
            }
        else:
            # Original flat fee structure for tax filing service
            if service_type == 'full_service':
                if total_gross_wages < 10000:
                    fee = Decimal('125.00')
                elif total_gross_wages < 50000:
                    fee = Decimal('225.00')
                elif total_gross_wages < 100000:
                    fee = Decimal('325.00')
                else:
                    fee = Decimal('450.00')
            else:  # self_service
                if total_gross_wages < 10000:
                    fee = Decimal('65.00')
                elif total_gross_wages < 50000:
                    fee = Decimal('125.00')
                elif total_gross_wages < 100000:
                    fee = Decimal('175.00')
                else:
                    fee = Decimal('250.00')
                    
            fee_breakdown = {
                'filing_fee': str(fee),
                'fee_type': 'flat_rate'
            }
                
        # Create the filing record
        filing = TaxFiling.objects.create(
            tenant=tenant,
            filing_type='payroll',
            tax_type='payroll',
            filing_period_start=start_date,
            filing_period_end=end_date,
            jurisdiction=f"{country_code}-{state_code}" if state_code else country_code,
            gross_sales=total_gross_wages,  # Using gross_sales field for wages
            taxable_sales=total_gross_wages,
            tax_rate=(total_employee_tax + total_employer_tax) / total_gross_wages * 100 if total_gross_wages > 0 else 0,
            tax_collected=total_employee_tax,
            tax_due=total_employee_tax + total_employer_tax,
            service_type=service_type,
            service_fee=fee,
            status='draft',
            filing_data={
                'employee_count': transactions.values('employee').distinct().count(),
                'total_employee_tax': str(total_employee_tax),
                'total_employer_tax': str(total_employer_tax),
                'payroll_run_ids': list(payroll_runs.values_list('id', flat=True)),
                'transaction_ids': list(transactions.values_list('id', flat=True)),
                'fee_breakdown': fee_breakdown
            }
        )
        
        response_data = {
            'filing_id': filing.id,
            'status': filing.status,
            'total_gross_wages': str(total_gross_wages),
            'total_employee_tax': str(total_employee_tax),
            'total_employer_tax': str(total_employer_tax),
            'total_tax_due': str(total_employee_tax + total_employer_tax),
            'service_fee': str(fee),
            'employee_count': filing.filing_data['employee_count']
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating payroll tax filing: {str(e)}")
        return Response({
            'error': f'Failed to create payroll tax filing: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_tax_filing_history(request):
    """Get payroll tax filing history for the tenant"""
    try:
        tenant = request.user.profile.tenant
        
        filings = TaxFiling.objects.filter(
            tenant=tenant,
            filing_type='payroll'
        ).order_by('-created_at')
        
        filing_data = []
        for filing in filings:
            filing_data.append({
                'id': filing.id,
                'period': f"{filing.filing_period_start} to {filing.filing_period_end}",
                'jurisdiction': filing.jurisdiction,
                'gross_wages': str(filing.gross_sales),
                'total_tax': str(filing.tax_due),
                'status': filing.status,
                'service_type': filing.service_type,
                'service_fee': str(filing.service_fee),
                'created_at': filing.created_at.isoformat(),
                'employee_count': filing.filing_data.get('employee_count', 0) if filing.filing_data else 0
            })
            
        return Response({
            'filings': filing_data,
            'total_count': len(filing_data)
        })
        
    except Exception as e:
        logger.error(f"Error getting payroll tax filing history: {str(e)}")
        return Response({
            'error': f'Failed to get filing history: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_tax_filing_status(request, filing_id):
    """Get status of a specific payroll tax filing"""
    try:
        tenant = request.user.profile.tenant
        
        filing = get_object_or_404(
            TaxFiling,
            id=filing_id,
            tenant=tenant,
            filing_type='payroll'
        )
        
        response_data = {
            'id': filing.id,
            'status': filing.status,
            'period': f"{filing.filing_period_start} to {filing.filing_period_end}",
            'jurisdiction': filing.jurisdiction,
            'gross_wages': str(filing.gross_sales),
            'employee_tax': str(filing.filing_data.get('total_employee_tax', 0)),
            'employer_tax': str(filing.filing_data.get('total_employer_tax', 0)),
            'total_tax': str(filing.tax_due),
            'service_type': filing.service_type,
            'service_fee': str(filing.service_fee),
            'created_at': filing.created_at.isoformat(),
            'submitted_at': filing.submitted_at.isoformat() if filing.submitted_at else None,
            'payment_confirmation': filing.payment_confirmation_number,
            'notes': filing.notes,
            'employee_count': filing.filing_data.get('employee_count', 0)
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting payroll tax filing status: {str(e)}")
        return Response({
            'error': f'Failed to get filing status: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)