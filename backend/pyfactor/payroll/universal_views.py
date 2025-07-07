"""
Universal Payroll API Views
Handles multi-provider payroll operations
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.decorators import login_required
import logging

from users.models import UserProfile
from hr.models import Employee
from .payment_providers import get_available_payment_methods, get_optimal_provider
from .universal_processor import UniversalPayrollProcessor
from .stripe_models import EmployeePaymentSetup

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_options(request, country_code):
    """
    Get available payment methods for a specific country
    """
    try:
        # Get available methods
        methods = get_available_payment_methods(country_code)
        
        # Check if employee has existing setup
        current_setup = None
        try:
            employee = Employee.objects.get(
                user=request.user,
                tenant_id=request.user.userprofile.tenant_id
            )
            
            setup = EmployeePaymentSetup.objects.filter(
                employee=employee,
                setup_status='active'
            ).first()
            
            if setup:
                current_setup = {
                    'method': 'mobile_money' if setup.payment_provider == 'mobile_money' else 'bank_transfer',
                    'provider': setup.payment_provider,
                    'status': setup.setup_status,
                    'phone_display': setup.mobile_money_number[-4:] if setup.mobile_money_number else None
                }
        except Employee.DoesNotExist:
            pass
        
        return Response({
            'country': country_code,
            'methods': methods,
            'current_setup': current_setup,
            'optimal_provider': get_optimal_provider(country_code)
        })
        
    except Exception as e:
        logger.error(f"Error getting payment options: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_mobile_money(request):
    """
    Set up mobile money for employee
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        employee = Employee.objects.get(
            user=request.user,
            tenant_id=user_profile.tenant_id
        )
        
        phone_number = request.data.get('phone_number')
        provider = request.data.get('provider', 'auto')
        
        if not phone_number:
            return Response(
                {'error': 'Phone number required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use mobile money processor
        from .mobile_money_processor import MobileMoneyProcessor
        processor = MobileMoneyProcessor()
        
        result = processor.setup_employee(employee)
        
        if result['success']:
            # Update employee phone if needed
            if not employee.phone_number:
                employee.phone_number = phone_number
                employee.save()
            
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Employee.DoesNotExist:
        return Response(
            {'error': 'Employee record not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error setting up mobile money: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_employee_wise(request):
    """
    Send Wise invitation to employee
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        employee = Employee.objects.get(
            user=request.user,
            tenant_id=user_profile.tenant_id
        )
        
        # Use Wise processor
        from .wise_processor import WisePayrollProcessor
        processor = WisePayrollProcessor()
        
        result = processor.invite_employee(employee)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Employee.DoesNotExist:
        return Response(
            {'error': 'Employee record not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error inviting to Wise: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_payroll_cost(request):
    """
    Calculate total payroll cost with consistent 2.4% platform fee
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response(
                {'error': 'No business associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get payroll data
        payroll_data = request.data
        total_salaries = payroll_data.get('total_salaries', 0)
        employee_count = payroll_data.get('employee_count', 0)
        
        # Use universal processor for calculation
        processor = UniversalPayrollProcessor()
        
        # Create mock payroll run for calculation
        class MockPayrollRun:
            def __init__(self, total, count):
                self.total_amount = total
                self.employee_count = count
                self.payrolltransaction_set = MockQuerySet(count)
        
        class MockQuerySet:
            def __init__(self, count):
                self._count = count
            
            def all(self):
                return []
            
            def count(self):
                return self._count
        
        mock_run = MockPayrollRun(total_salaries, employee_count)
        cost_breakdown = processor.calculate_total_cost(mock_run, detailed=True)
        
        return Response(cost_breakdown)
        
    except Exception as e:
        logger.error(f"Error calculating payroll cost: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_payment_setup_status(request):
    """
    Check if all employees have payment methods set up
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        
        # Get all active employees
        employees = Employee.objects.filter(
            tenant_id=user_profile.tenant_id,
            is_active=True
        )
        
        setup_status = []
        for employee in employees:
            # Check for any active payment setup
            has_stripe = hasattr(employee, 'stripe_account') and employee.stripe_account.payouts_enabled
            
            payment_setup = EmployeePaymentSetup.objects.filter(
                employee=employee,
                setup_status='active'
            ).first()
            
            has_other = payment_setup is not None
            
            setup_status.append({
                'employee_id': str(employee.id),
                'employee_name': f"{employee.first_name} {employee.last_name}",
                'country': employee.country,
                'has_payment_method': has_stripe or has_other,
                'payment_provider': payment_setup.payment_provider if payment_setup else ('stripe' if has_stripe else None),
                'optimal_provider': get_optimal_provider(employee.country)
            })
        
        total = len(setup_status)
        ready = sum(1 for s in setup_status if s['has_payment_method'])
        
        return Response({
            'total_employees': total,
            'ready_employees': ready,
            'pending_employees': total - ready,
            'all_ready': ready == total,
            'employee_status': setup_status
        })
        
    except Exception as e:
        logger.error(f"Error checking payment setup: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )