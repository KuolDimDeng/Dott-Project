"""
Banking Information API for Employees
Handles secure storage and retrieval of employee banking details
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from .models import Employee
from pyfactor.logging_config import get_logger
import stripe
from django.conf import settings

logger = get_logger()
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_banking_info(request, employee_id):
    """
    GET: Retrieve employee's banking information (masked)
    POST: Update employee's banking information (secure storage in Stripe)
    """
    try:
        # Get employee - ensure user has access
        try:
            employee = Employee.objects.get(
                id=employee_id,
                business_id=request.user.userprofile.business_id
            )
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            # Return masked banking information
            data = {
                'bank_account_name': employee.bank_account_name,
                'bank_name': employee.bank_name,
                'account_number_last4': employee.account_number_last4,
                'routing_number_last4': employee.routing_number_last4,
                'mobile_money_provider': employee.mobile_money_provider,
                'mobile_money_number': employee.mobile_money_number,
                'prefer_mobile_money': employee.prefer_mobile_money,
                'has_banking_info': bool(employee.stripe_bank_account_id),
                'country': employee.country
            }
            
            return Response(data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Update banking information
            data = request.data
            
            with transaction.atomic():
                # Update simple fields
                if 'bank_account_name' in data:
                    employee.bank_account_name = data['bank_account_name']
                if 'bank_name' in data:
                    employee.bank_name = data['bank_name']
                if 'mobile_money_provider' in data:
                    employee.mobile_money_provider = data['mobile_money_provider']
                if 'mobile_money_number' in data:
                    employee.mobile_money_number = data['mobile_money_number']
                if 'prefer_mobile_money' in data:
                    employee.prefer_mobile_money = data['prefer_mobile_money']
                
                # Handle sensitive account information
                if 'account_number' in data and data['account_number']:
                    # Store last 4 digits locally
                    account_number = data['account_number']
                    employee.account_number_last4 = account_number[-4:] if len(account_number) >= 4 else account_number
                    
                    # Store full number in Stripe if routing number also provided
                    if 'routing_number' in data and data['routing_number']:
                        routing_number = data['routing_number']
                        employee.routing_number_last4 = routing_number[-4:] if len(routing_number) >= 4 else routing_number
                        
                        # Create or update Stripe bank account
                        try:
                            if settings.STRIPE_EXPRESS_ACCOUNT_ID:
                                # Create bank account token
                                bank_account_token = stripe.Token.create(
                                    bank_account={
                                        'country': employee.country or 'US',
                                        'currency': 'usd',
                                        'account_holder_name': employee.bank_account_name or employee.get_full_name(),
                                        'account_holder_type': 'individual',
                                        'routing_number': routing_number,
                                        'account_number': account_number,
                                    }
                                )
                                
                                # Attach to Stripe Connect account
                                if employee.stripe_account_id:
                                    external_account = stripe.Account.create_external_account(
                                        employee.stripe_account_id,
                                        external_account=bank_account_token.id
                                    )
                                    employee.stripe_bank_account_id = external_account.id
                                    logger.info(f"Created Stripe bank account for employee {employee.id}")
                                
                        except stripe.error.StripeError as e:
                            logger.error(f"Stripe error storing bank account: {e}")
                            # Continue anyway - store locally even if Stripe fails
                
                elif 'routing_number' in data and data['routing_number']:
                    # Just update routing number
                    routing_number = data['routing_number']
                    employee.routing_number_last4 = routing_number[-4:] if len(routing_number) >= 4 else routing_number
                
                employee.save()
                
                logger.info(f"Updated banking information for employee {employee.id}")
                
                return Response(
                    {
                        'success': True,
                        'message': 'Banking information updated successfully',
                        'account_number_last4': employee.account_number_last4,
                        'routing_number_last4': employee.routing_number_last4
                    },
                    status=status.HTTP_200_OK
                )
    
    except Exception as e:
        logger.error(f"Error handling banking information: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to process banking information'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )