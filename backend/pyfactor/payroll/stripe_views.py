"""
Stripe payment views for payroll
"""
import stripe
import logging
from decimal import Decimal
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import Business, UserProfile
from hr.models import Employee
from .models import PayrollRun, PayrollTransaction
from .stripe_models import EmployeeStripeAccount, PayrollStripePayment, EmployeePayoutRecord

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_payroll_funding(request):
    """
    Create SetupIntent for ACH bank authorization
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response(
                {'error': 'No business associated with user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or retrieve Stripe customer
        if not business.stripe_customer_id:
            customer = stripe.Customer.create(
                email=request.user.email,
                name=business.name,
                metadata={
                    'business_id': str(business.id),
                    'type': 'employer_payroll'
                }
            )
            business.stripe_customer_id = customer.id
            business.save()
        
        # Create SetupIntent for ACH authorization
        setup_intent = stripe.SetupIntent.create(
            customer=business.stripe_customer_id,
            payment_method_types=['us_bank_account'],
            usage='off_session',  # Can charge later without customer present
            mandate_data={
                'customer_acceptance': {
                    'type': 'online',
                    'online': {
                        'ip_address': request.META.get('REMOTE_ADDR'),
                        'user_agent': request.META.get('HTTP_USER_AGENT'),
                    }
                }
            },
            metadata={
                'business_id': str(business.id),
                'purpose': 'payroll_funding'
            }
        )
        
        return Response({
            'client_secret': setup_intent.client_secret,
            'customer_id': business.stripe_customer_id
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error setting up payroll funding: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_funding_setup(request):
    """
    Confirm successful bank setup after Stripe redirect
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        setup_intent_id = request.data.get('setup_intent_id')
        if not setup_intent_id:
            return Response(
                {'error': 'Setup intent ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Retrieve the SetupIntent
        setup_intent = stripe.SetupIntent.retrieve(setup_intent_id)
        
        if setup_intent.status == 'succeeded':
            # Get the payment method
            payment_method = stripe.PaymentMethod.retrieve(
                setup_intent.payment_method
            )
            
            # Save bank details
            business.default_bank_token = payment_method.id
            business.ach_mandate_id = setup_intent.mandate
            business.save()
            
            # Set as default payment method
            stripe.Customer.modify(
                business.stripe_customer_id,
                invoice_settings={
                    'default_payment_method': payment_method.id
                }
            )
            
            return Response({
                'success': True,
                'bank_last4': payment_method.us_bank_account.last4,
                'bank_name': payment_method.us_bank_account.bank_name
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'success': False, 'error': 'Setup failed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
        
    except Exception as e:
        logger.error(f"Error confirming funding setup: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_funding_status(request):
    """
    Get current payroll funding setup status
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({
                'has_funding_setup': False,
                'message': 'No business associated with user'
            }, status=status.HTTP_200_OK)
        
        has_setup = bool(business.default_bank_token and business.ach_mandate_id)
        
        response_data = {
            'has_funding_setup': has_setup,
            'has_stripe_customer': bool(business.stripe_customer_id),
        }
        
        if has_setup and business.default_bank_token:
            try:
                # Get payment method details
                payment_method = stripe.PaymentMethod.retrieve(business.default_bank_token)
                response_data.update({
                    'bank_last4': payment_method.us_bank_account.last4,
                    'bank_name': payment_method.us_bank_account.bank_name,
                    'account_holder_type': payment_method.us_bank_account.account_holder_type,
                })
            except stripe.error.StripeError:
                # Payment method might be deleted or invalid
                pass
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error getting funding status: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def employee_bank_setup(request):
    """
    Employee adds their bank account to receive salary
    """
    try:
        # Get employee record through tenant
        tenant_id = request.user.userprofile.tenant_id
        employee = Employee.objects.filter(
            user=request.user,
            tenant_id=tenant_id
        ).first()
        
        if not employee:
            return Response(
                {'error': 'Employee record not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create employee's Stripe account
        stripe_account, created = EmployeeStripeAccount.objects.get_or_create(
            employee=employee,
            tenant_id=tenant_id,
            defaults={'verification_status': 'unverified'}
        )
        
        if not stripe_account.stripe_account_id:
            # Create a Connect account for the employee
            account = stripe.Account.create(
                type='express',
                country='US',
                capabilities={
                    'transfers': {'requested': True},
                    # Only transfers, no card payments needed
                },
                business_type='individual',
                email=employee.email,
                individual={
                    'first_name': employee.first_name,
                    'last_name': employee.last_name,
                    'email': employee.email,
                },
                metadata={
                    'employee_id': str(employee.id),
                    'type': 'employee_payroll',
                    'tenant_id': str(tenant_id)
                }
            )
            stripe_account.stripe_account_id = account.id
            stripe_account.save()
        
        # Create account link for onboarding
        account_link = stripe.AccountLink.create(
            account=stripe_account.stripe_account_id,
            refresh_url=f'{settings.FRONTEND_URL}/dashboard/payroll/employee/bank-setup?refresh=true',
            return_url=f'{settings.FRONTEND_URL}/dashboard/payroll/employee/bank-setup?success=true',
            type='account_onboarding',
        )
        
        return Response({
            'onboarding_url': account_link.url,
            'expires_at': account_link.expires_at
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error setting up employee bank: {str(e)}")
        return Response(
            {'error': 'Failed to setup bank account'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_bank_status(request):
    """
    Get employee's bank setup status
    """
    try:
        tenant_id = request.user.userprofile.tenant_id
        employee = Employee.objects.filter(
            user=request.user,
            tenant_id=tenant_id
        ).first()
        
        if not employee:
            return Response({
                'has_bank_setup': False,
                'message': 'Employee record not found'
            }, status=status.HTTP_200_OK)
        
        # Check if employee has Stripe account
        try:
            stripe_account = EmployeeStripeAccount.objects.get(
                employee=employee,
                tenant_id=tenant_id
            )
            
            # Update status from Stripe
            if stripe_account.stripe_account_id:
                account = stripe.Account.retrieve(stripe_account.stripe_account_id)
                
                stripe_account.onboarding_complete = account.details_submitted
                stripe_account.charges_enabled = account.charges_enabled
                stripe_account.payouts_enabled = account.payouts_enabled
                stripe_account.save()
                
                # Get external account info
                bank_info = None
                if account.external_accounts.data:
                    bank = account.external_accounts.data[0]
                    bank_info = {
                        'bank_name': bank.bank_name,
                        'last4': bank.last4,
                        'account_holder_name': bank.account_holder_name,
                    }
                
                return Response({
                    'has_bank_setup': stripe_account.onboarding_complete,
                    'onboarding_complete': stripe_account.onboarding_complete,
                    'payouts_enabled': stripe_account.payouts_enabled,
                    'verification_status': stripe_account.verification_status,
                    'bank_info': bank_info,
                    'requirements': {
                        'currently_due': account.requirements.currently_due,
                        'eventually_due': account.requirements.eventually_due,
                    } if not stripe_account.onboarding_complete else None
                }, status=status.HTTP_200_OK)
            
        except EmployeeStripeAccount.DoesNotExist:
            pass
        
        return Response({
            'has_bank_setup': False,
            'message': 'Bank account not set up'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting employee bank status: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )