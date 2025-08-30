"""
Mobile payroll API endpoints for staff payroll management
"""
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction as db_transaction

from users.models import Business, UserProfile
from hr.models import Employee, Timesheet
from banking.models import BankAccount
from .models import PayrollRun, PayrollTransaction
from .payroll_service import PayrollService
from .tax_calculation_service import PayrollTaxCalculator

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_mobile_payroll(request):
    """
    Calculate payroll for mobile interface
    Preview payroll amounts before creating actual payroll run
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse pay period dates
        pay_period_start = datetime.strptime(request.data.get('pay_period_start'), '%Y-%m-%d').date()
        pay_period_end = datetime.strptime(request.data.get('pay_period_end'), '%Y-%m-%d').date()
        
        if pay_period_start >= pay_period_end:
            return Response({
                'error': 'Pay period start must be before end date'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize services
        payroll_service = PayrollService(business_id=business.id)
        tax_calculator = PayrollTaxCalculator(business.id)
        
        # Get active employees
        active_employees = Employee.objects.filter(
            tenant_id=request.user.business_id,
            is_active=True
        )
        
        if not active_employees:
            return Response({
                'error': 'No active employees found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate preview data
        preview_data = []
        total_gross = Decimal('0.00')
        total_net = Decimal('0.00')
        total_taxes = Decimal('0.00')
        total_employer_cost = Decimal('0.00')
        
        for employee in active_employees:
            # Get timesheet data
            timesheet = Timesheet.objects.filter(
                employee=employee,
                tenant_id=request.user.business_id,
                week_ending__gte=pay_period_start,
                week_ending__lte=pay_period_end,
                status='approved'
            ).first()
            
            # Calculate gross pay
            if employee.employment_type == 'salary':
                days_in_period = (pay_period_end - pay_period_start).days + 1
                days_in_month = 30
                gross_pay = (employee.salary / days_in_month) * days_in_period
            else:  # hourly
                if timesheet:
                    regular_hours = timesheet.regular_hours or Decimal('0')
                    overtime_hours = timesheet.overtime_hours or Decimal('0')
                    gross_pay = (regular_hours * employee.hourly_rate) + \
                               (overtime_hours * employee.hourly_rate * Decimal('1.5'))
                else:
                    gross_pay = Decimal('0.00')
            
            if gross_pay <= 0:
                continue
            
            # Get YTD for tax calculations
            current_year = pay_period_end.year
            ytd_payments = PayrollTransaction.objects.filter(
                employee=employee,
                tenant_id=request.user.business_id,
                payroll_run__pay_date__year=current_year,
                payroll_run__status__in=['completed', 'funded', 'distributing']
            )
            ytd_gross = sum(p.gross_pay for p in ytd_payments)
            
            # Calculate taxes
            tax_summary = tax_calculator.get_tax_summary(gross_pay, ytd_gross)
            
            employee_data = {
                'employee_id': str(employee.id),
                'employee_name': f\"{employee.first_name} {employee.last_name}\",
                'employment_type': employee.employment_type,
                'gross_pay': float(gross_pay),
                'net_pay': float(tax_summary['net_pay']),
                'total_taxes': float(tax_summary['employee_taxes']['total_employee_taxes']),
                'employer_cost': float(tax_summary['total_employer_cost']),
                'tax_breakdown': {
                    'federal_income_tax': float(tax_summary['employee_taxes']['federal_income_tax']),
                    'state_tax': float(tax_summary['employee_taxes']['state_tax']),
                    'social_security_tax': float(tax_summary['employee_taxes']['social_security_tax']),
                    'medicare_tax': float(tax_summary['employee_taxes']['medicare_tax']),
                    'unemployment_tax': float(tax_summary['employee_taxes']['unemployment_tax']),
                    'other_tax': float(tax_summary['employee_taxes']['other_tax'])
                },
                'timesheet_info': {
                    'has_timesheet': timesheet is not None,
                    'regular_hours': float(timesheet.regular_hours) if timesheet else 0,
                    'overtime_hours': float(timesheet.overtime_hours) if timesheet else 0,
                    'approval_status': timesheet.status if timesheet else 'no_timesheet'
                } if employee.employment_type == 'hourly' else None
            }
            
            preview_data.append(employee_data)
            
            # Update totals
            total_gross += gross_pay
            total_net += tax_summary['net_pay']
            total_taxes += tax_summary['employee_taxes']['total_employee_taxes']
            total_employer_cost += tax_summary['total_employer_cost']
        
        # Calculate platform fees
        platform_fee_rate = Decimal('0.024')  # 2.4%
        platform_fee = total_net * platform_fee_rate
        total_funding_needed = total_employer_cost + platform_fee
        
        return Response({
            'success': True,
            'payroll_preview': {
                'pay_period_start': pay_period_start.strftime('%Y-%m-%d'),
                'pay_period_end': pay_period_end.strftime('%Y-%m-%d'),
                'employee_count': len(preview_data),
                'total_gross_pay': float(total_gross),
                'total_net_pay': float(total_net),
                'total_employee_taxes': float(total_taxes),
                'total_employer_cost': float(total_employer_cost),
                'platform_fee': float(platform_fee),
                'total_funding_needed': float(total_funding_needed),
                'currency': business.currency or 'USD',
                'employees': preview_data
            }
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({
            'error': f'Invalid date format: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f\"Error calculating mobile payroll: {str(e)}\")
        return Response({
            'error': 'Failed to calculate payroll',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_mobile_payroll_run(request):
    """
    Create actual payroll run from mobile interface
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate required fields
        pay_period_start = datetime.strptime(request.data.get('pay_period_start'), '%Y-%m-%d').date()
        pay_period_end = datetime.strptime(request.data.get('pay_period_end'), '%Y-%m-%d').date()
        
        # Create payroll run
        payroll_service = PayrollService(business_id=business.id)
        
        with db_transaction.atomic():
            payroll_run = payroll_service.calculate_payroll(
                business=business,
                pay_period_start=pay_period_start,
                pay_period_end=pay_period_end,
                tenant_id=request.user.business_id
            )
        
        return Response({
            'success': True,
            'payroll_run': {
                'id': str(payroll_run.id),
                'status': payroll_run.status,
                'total_amount': float(payroll_run.total_amount),
                'employee_count': payroll_run.payrolltransaction_set.count(),
                'pay_date': payroll_run.pay_date.strftime('%Y-%m-%d'),
                'currency': payroll_run.currency_code
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f\"Error creating mobile payroll run: {str(e)}\")
        return Response({
            'error': 'Failed to create payroll run',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mobile_payroll_runs(request):
    """
    Get list of payroll runs for mobile interface
    """
    try:
        # Get recent payroll runs
        payroll_runs = PayrollRun.objects.filter(
            tenant_id=request.user.business_id
        ).order_by('-created_at')[:10]  # Last 10 runs
        
        runs_data = []
        for run in payroll_runs:
            runs_data.append({
                'id': str(run.id),
                'status': run.status,
                'status_display': run.get_status_display() if hasattr(run, 'get_status_display') else run.status.title(),
                'pay_period_start': run.start_date.strftime('%Y-%m-%d'),
                'pay_period_end': run.end_date.strftime('%Y-%m-%d'),
                'pay_date': run.pay_date.strftime('%Y-%m-%d'),
                'total_amount': float(run.total_amount) if run.total_amount else 0,
                'employee_count': run.payrolltransaction_set.count(),
                'currency': run.currency_code,
                'created_at': run.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return Response({
            'success': True,
            'payroll_runs': runs_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f\"Error getting mobile payroll runs: {str(e)}\")
        return Response({
            'error': 'Failed to get payroll runs'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_bank_accounts(request):
    """
    Get available bank accounts for payroll funding
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        # Get business bank accounts
        bank_accounts = BankAccount.objects.filter(
            tenant_id=request.user.business_id,
            is_active=True
        )
        
        accounts_data = []
        for account in bank_accounts:
            accounts_data.append({
                'id': str(account.id),
                'name': account.name,
                'institution': account.institution_name,
                'last_four': account.account_id[-4:] if account.account_id else None,
                'account_type': account.type,
                'available_balance': float(account.available_balance) if account.available_balance else None,
                'is_payroll_account': business.payroll_bank_account_id == account.id if business else False
            })
        
        return Response({
            'success': True,
            'bank_accounts': accounts_data,
            'has_payroll_account': business.payroll_bank_account_id is not None if business else False
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f\"Error getting payroll bank accounts: {str(e)}\")
        return Response({
            'error': 'Failed to get bank accounts'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_mobile_payroll(request):
    """
    Approve and process payroll run from mobile interface
    """
    try:
        payroll_run_id = request.data.get('payroll_run_id')
        signature_name = request.data.get('signature_name')
        bank_account_id = request.data.get('bank_account_id')
        
        if not all([payroll_run_id, signature_name, bank_account_id]):
            return Response({
                'error': 'Missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get payroll run
        payroll_run = PayrollRun.objects.get(
            id=payroll_run_id,
            tenant_id=request.user.business_id
        )
        
        if payroll_run.status != 'draft':
            return Response({
                'error': 'Payroll run cannot be approved in current status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify bank account belongs to business
        bank_account = BankAccount.objects.get(
            id=bank_account_id,
            tenant_id=request.user.business_id
        )
        
        # Initialize payroll service and approve
        payroll_service = PayrollService(business_id=request.user.business_id)
        
        approval_success = payroll_service.approve_payroll(
            payroll_run_id=payroll_run_id,
            approved_by=request.user,
            signature_name=signature_name,
            signature_date=timezone.now(),
            selected_bank_account_id=bank_account_id,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        if not approval_success:
            return Response({
                'error': 'Failed to approve payroll run'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Start funding process
        try:
            funding_result = payroll_service.collect_payroll_funds(payroll_run)
            
            return Response({
                'success': True,
                'message': 'Payroll approved and funding initiated',
                'payroll_run': {
                    'id': str(payroll_run.id),
                    'status': payroll_run.status,
                    'funding_status': 'processing'
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as funding_error:
            logger.error(f"Funding failed for payroll {payroll_run_id}: {str(funding_error)}")
            return Response({
                'success': True,
                'message': 'Payroll approved but funding failed',
                'payroll_run': {
                    'id': str(payroll_run.id),
                    'status': payroll_run.status,
                    'funding_status': 'failed'
                },
                'funding_error': str(funding_error)
            }, status=status.HTTP_200_OK)
        
    except PayrollRun.DoesNotExist:
        return Response({
            'error': 'Payroll run not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except BankAccount.DoesNotExist:
        return Response({
            'error': 'Bank account not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error approving mobile payroll: {str(e)}")
        return Response({
            'error': 'Failed to approve payroll',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mobile_payroll_status(request, payroll_run_id):
    """
    Get current status of a payroll run for mobile interface
    """
    try:
        payroll_run = PayrollRun.objects.get(
            id=payroll_run_id,
            tenant_id=request.user.business_id
        )
        
        # Get payment transactions
        transactions = PayrollTransaction.objects.filter(
            payroll_run=payroll_run
        )
        
        # Calculate status summary
        total_employees = transactions.count()
        paid_employees = transactions.filter(
            payout_record__payout_status__in=['processing', 'paid']
        ).count()
        failed_employees = transactions.filter(
            payout_record__payout_status='failed'
        ).count()
        
        return Response({
            'success': True,
            'payroll_run': {
                'id': str(payroll_run.id),
                'status': payroll_run.status,
                'status_display': payroll_run.get_status_display() if hasattr(payroll_run, 'get_status_display') else payroll_run.status.title(),
                'total_amount': float(payroll_run.total_amount) if payroll_run.total_amount else 0,
                'pay_date': payroll_run.pay_date.strftime('%Y-%m-%d'),
                'created_at': payroll_run.created_at.strftime('%Y-%m-%d %H:%M'),
                'employee_summary': {
                    'total': total_employees,
                    'paid': paid_employees,
                    'failed': failed_employees,
                    'pending': total_employees - paid_employees - failed_employees
                }
            }
        }, status=status.HTTP_200_OK)
        
    except PayrollRun.DoesNotExist:
        return Response({
            'error': 'Payroll run not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error getting mobile payroll status: {str(e)}")
        return Response({
            'error': 'Failed to get payroll status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)