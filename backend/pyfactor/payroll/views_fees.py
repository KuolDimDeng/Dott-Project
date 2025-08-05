from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction as db_transaction, models
from decimal import Decimal
import logging

from .models import PayrollRun, PayrollTransaction
from .fee_calculator import PayrollFeeCalculator
from hr.models import Employee

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_payroll_fees(request):
    """
    Calculate payroll with 2.4% processing fee
    
    Request body:
    {
        "employees": [
            {
                "employee_id": "uuid",
                "gross_salary": 1000.00
            }
        ],
        "pay_period_start": "2024-12-01",
        "pay_period_end": "2024-12-31"
    }
    """
    try:
        tenant = request.user.profile.tenant
        calculator = PayrollFeeCalculator(tenant=tenant)
        
        employees_data = request.data.get('employees', [])
        
        # Get country code from business settings
        country_code = tenant.country_code if hasattr(tenant, 'country_code') else 'US'
        state_code = tenant.state_code if hasattr(tenant, 'state_code') else None
        
        # Add country/state to each employee
        for emp in employees_data:
            emp['country_code'] = country_code
            emp['state_code'] = state_code
        
        # Calculate payroll with fees
        results = calculator.calculate_bulk_payroll(employees_data)
        
        return Response({
            'success': True,
            'payroll_calculation': results
        })
        
    except Exception as e:
        logger.error(f"Error calculating payroll fees: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_payroll_with_fees(request):
    """
    Process complete payroll including fee collection
    
    This creates the payroll run and transactions with all fees included
    """
    try:
        tenant = request.user.profile.tenant
        calculator = PayrollFeeCalculator(tenant=tenant)
        
        # Extract data
        pay_period_start = request.data.get('pay_period_start')
        pay_period_end = request.data.get('pay_period_end')
        pay_date = request.data.get('pay_date')
        employees_data = request.data.get('employees', [])
        
        # Get country code
        country_code = tenant.country_code if hasattr(tenant, 'country_code') else 'US'
        state_code = tenant.state_code if hasattr(tenant, 'state_code') else None
        
        # Calculate payroll
        for emp in employees_data:
            emp['country_code'] = country_code
            emp['state_code'] = state_code
        
        calculation = calculator.calculate_bulk_payroll(employees_data)
        summary = calculation['summary']
        
        with db_transaction.atomic():
            # Create payroll run
            payroll_run = PayrollRun.objects.create(
                tenant=tenant,
                start_date=pay_period_start,
                end_date=pay_period_end,
                pay_date=pay_date,
                total_amount=summary['total_gross'],
                country_code=country_code,
                status='pending_approval',
                total_processing_fee=summary['total_processing_fee'],
                total_direct_deposit_fees=summary['total_direct_deposit_fees'],
                employer_total_cost=summary['employer_total_payment']
            )
            
            # Create individual transactions
            for emp_calc in calculation['employees']:
                employee_id = emp_calc['employee_id']
                calc = emp_calc['calculation']
                
                PayrollTransaction.objects.create(
                    tenant=tenant,
                    payroll_run=payroll_run,
                    employee_id=employee_id,
                    gross_pay=calc['gross_salary'],
                    net_pay=calc['net_salary'],
                    taxes=calc['total_employee_tax'],
                    federal_tax=calc['employee_tax'],
                    medicare_tax=calc['employee_medicare'],
                    social_security_tax=calc['employee_social_security'],
                    employer_social_security_tax=calc['employer_social_security'],
                    employer_medicare_tax=calc['employer_medicare'],
                    processing_fee=calc['processing_fee'],
                    direct_deposit_fee=calc['direct_deposit_fee']
                )
            
            # Create payment breakdown for display
            payment_breakdown = {
                'payroll_run_id': str(payroll_run.id),
                'status': payroll_run.status,
                'summary': {
                    'gross_salaries': float(summary['total_gross']),
                    'employee_taxes': float(summary['total_employee_tax']),
                    'employer_taxes': float(summary['total_employer_tax']),
                    'net_pay': float(summary['total_net_pay']),
                    'processing_fee': float(summary['total_processing_fee']),
                    'direct_deposit_fees': float(summary['total_direct_deposit_fees']),
                    'total_charge': float(summary['employer_total_payment'])
                },
                'breakdown_by_destination': {
                    'to_employees': float(summary['employees_receive']),
                    'to_government': float(summary['government_receives']),
                    'to_dott': float(summary['dott_revenue'])
                },
                'next_steps': {
                    'message': 'Review and approve payroll to proceed with payment',
                    'approve_endpoint': f'/api/payroll/approve/{payroll_run.id}/'
                }
            }
            
            return Response({
                'success': True,
                'payroll': payment_breakdown
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error processing payroll: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_payroll_with_payment(request, payroll_run_id):
    """
    Approve payroll and initiate payment collection
    """
    try:
        tenant = request.user.profile.tenant
        payroll_run = PayrollRun.objects.get(id=payroll_run_id, tenant=tenant)
        
        if payroll_run.status != 'pending_approval':
            return Response({
                'success': False,
                'error': 'Payroll is not in pending approval status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status
        payroll_run.status = 'approved'
        payroll_run.save()
        
        # Here you would integrate with Stripe or other payment processor
        # to collect the employer_total_cost amount
        
        return Response({
            'success': True,
            'message': 'Payroll approved successfully',
            'payment_required': float(payroll_run.employer_total_cost),
            'payment_intent': 'stripe_payment_intent_id'  # Replace with actual Stripe integration
        })
        
    except PayrollRun.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Payroll run not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error approving payroll: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_fee_breakdown(request, payroll_run_id):
    """
    Get detailed fee breakdown for a payroll run
    """
    try:
        tenant = request.user.profile.tenant
        payroll_run = PayrollRun.objects.get(id=payroll_run_id, tenant=tenant)
        
        transactions = PayrollTransaction.objects.filter(payroll_run=payroll_run)
        
        # Calculate totals
        total_gross = transactions.aggregate(total=models.Sum('gross_pay'))['total'] or 0
        total_employee_tax = transactions.aggregate(total=models.Sum('taxes'))['total'] or 0
        total_processing_fee = transactions.aggregate(total=models.Sum('processing_fee'))['total'] or 0
        total_dd_fees = transactions.aggregate(total=models.Sum('direct_deposit_fee'))['total'] or 0
        
        # Get employer taxes
        total_employer_ss = transactions.aggregate(
            total=models.Sum('employer_social_security_tax')
        )['total'] or 0
        total_employer_medicare = transactions.aggregate(
            total=models.Sum('employer_medicare_tax')
        )['total'] or 0
        
        total_employer_tax = total_employer_ss + total_employer_medicare
        
        breakdown = {
            'payroll_run': {
                'id': str(payroll_run.id),
                'period': f"{payroll_run.start_date} to {payroll_run.end_date}",
                'pay_date': str(payroll_run.pay_date),
                'status': payroll_run.status,
                'employee_count': transactions.count()
            },
            'cost_breakdown': {
                'gross_salaries': float(total_gross),
                'employee_taxes_withheld': float(total_employee_tax),
                'employer_taxes': float(total_employer_tax),
                'subtotal': float(total_gross + total_employer_tax),
                'processing_fees': {
                    'tax_filing_fee': float(total_processing_fee),
                    'direct_deposit_fees': float(total_dd_fees),
                    'total_fees': float(total_processing_fee + total_dd_fees)
                },
                'total_to_pay': float(payroll_run.employer_total_cost)
            },
            'fee_explanation': {
                'tax_filing_fee': f"2.4% of ${float(total_employee_tax + total_employer_tax):.2f} in taxes",
                'direct_deposit_fee': f"$2.00 × {transactions.count()} employees"
            }
        }
        
        return Response({
            'success': True,
            'breakdown': breakdown
        })
        
    except PayrollRun.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Payroll run not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error getting fee breakdown: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)