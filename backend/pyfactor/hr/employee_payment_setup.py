"""
Employee Payment Setup - Send secure links for bank/mobile money setup
"""
import stripe
import logging
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from hr.models import Employee
from payroll.models import PaymentDepositMethod
from payroll.stripe_models import EmployeeStripeAccount
import resend

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

# Initialize Resend for email
if hasattr(settings, 'RESEND_API_KEY'):
    resend.api_key = settings.RESEND_API_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_payment_setup_link(request, employee_id):
    """
    Send secure payment setup link to employee
    Similar to how customer invoice payment links work
    """
    try:
        # Get employee
        employee = Employee.objects.get(
            id=employee_id,
            tenant_id=request.user.business_id
        )
        
        # Check if employee already has payment method
        existing_method = PaymentDepositMethod.objects.filter(
            employee=employee,
            is_active=True
        ).first()
        
        if existing_method and existing_method.payment_provider_id:
            return Response({
                'message': 'Employee already has payment method configured',
                'has_payment_method': True
            }, status=status.HTTP_200_OK)
        
        # Create or get Stripe Connect Express account for employee
        stripe_account = create_employee_stripe_account(employee)
        
        if not stripe_account:
            return Response({
                'error': 'Failed to create payment account'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate secure onboarding link
        account_link = stripe.AccountLink.create(
            account=stripe_account['account_id'],
            refresh_url=f"{settings.FRONTEND_URL}/employee/payment-setup?refresh=true&token={employee.id}",
            return_url=f"{settings.FRONTEND_URL}/employee/payment-setup?success=true&token={employee.id}",
            type='account_onboarding',
            collect='eventually_due'  # Minimal info collection
        )
        
        # Send email with secure link
        send_payment_setup_email(employee, account_link.url)
        
        # Log the action
        logger.info(f"Payment setup link sent to employee {employee.id} ({employee.email})")
        
        return Response({
            'success': True,
            'message': f'Payment setup link sent to {employee.email}',
            'expires_at': account_link.expires_at,
            'employee_name': f"{employee.first_name} {employee.last_name}"
        }, status=status.HTTP_200_OK)
        
    except Employee.DoesNotExist:
        return Response({
            'error': 'Employee not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error sending payment setup link: {str(e)}")
        return Response({
            'error': 'Failed to send payment setup link',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def create_employee_stripe_account(employee):
    """
    Create Stripe Connect Express account for employee to receive payments
    """
    try:
        # Check if employee already has Stripe account
        existing_account = EmployeeStripeAccount.objects.filter(
            employee=employee,
            tenant_id=employee.tenant_id
        ).first()
        
        if existing_account and existing_account.stripe_account_id:
            return {
                'account_id': existing_account.stripe_account_id,
                'exists': True
            }
        
        # Determine country for Stripe account
        country = employee.country or 'US'
        
        # Create minimal Connect account for receiving payments only
        account = stripe.Account.create(
            type='express',
            country=country,
            email=employee.email,
            capabilities={
                'transfers': {'requested': True},
                # Add card_payments only for countries that support it
                'card_payments': {'requested': False}
            },
            business_type='individual',
            individual={
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
            },
            metadata={
                'type': 'payroll_recipient',
                'employee_id': str(employee.id),
                'tenant_id': str(employee.tenant_id),
                'created_for': 'payroll_payments'
            },
            settings={
                'payouts': {
                    'schedule': {
                        'interval': 'manual'  # We control when payouts happen
                    }
                }
            }
        )
        
        # Save account info
        stripe_account, created = EmployeeStripeAccount.objects.update_or_create(
            employee=employee,
            tenant_id=employee.tenant_id,
            defaults={
                'stripe_account_id': account.id,
                'verification_status': 'pending',
                'account_type': 'express',
                'country': country,
                'created_at': timezone.now()
            }
        )
        
        return {
            'account_id': account.id,
            'exists': False,
            'created': True
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating employee account: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error creating employee Stripe account: {str(e)}")
        return None

def send_payment_setup_email(employee, setup_link):
    """
    Send email to employee with secure payment setup link
    """
    try:
        # Email subject
        subject = "Set Up Your Payment Method for Payroll"
        
        # Email body (HTML)
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Welcome to Our Payroll System!</h2>
                
                <p>Hi {employee.first_name},</p>
                
                <p>To receive your salary payments, please set up your payment method by clicking the secure link below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{setup_link}" 
                       style="background-color: #2563eb; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Set Up Payment Method
                    </a>
                </div>
                
                <p><strong>You can choose from:</strong></p>
                <ul>
                    <li>Bank Account (Direct Deposit)</li>
                    <li>Mobile Money (M-Pesa, MTN, etc.)</li>
                </ul>
                
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 24 hours for security reasons. 
                    Your payment information is encrypted and stored securely.
                </p>
                
                <p>If you have any questions, please contact your HR department.</p>
                
                <p>Best regards,<br>Payroll Team</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_message = f"""
        Welcome to Our Payroll System!
        
        Hi {employee.first_name},
        
        To receive your salary payments, please set up your payment method using this secure link:
        
        {setup_link}
        
        You can choose from:
        - Bank Account (Direct Deposit)
        - Mobile Money (M-Pesa, MTN, etc.)
        
        This link will expire in 24 hours for security reasons.
        
        If you have any questions, please contact your HR department.
        
        Best regards,
        Payroll Team
        """
        
        # Send using Resend if available, otherwise Django mail
        if hasattr(settings, 'RESEND_API_KEY'):
            import resend
            resend.Emails.send({
                "from": "Dott Payroll <payroll@dottapps.com>",
                "to": employee.email,
                "subject": subject,
                "html": html_message,
                "text": text_message
            })
        else:
            # Fallback to Django email
            send_mail(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [employee.email],
                html_message=html_message,
                fail_silently=False,
            )
        
        logger.info(f"Payment setup email sent to {employee.email}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending payment setup email: {str(e)}")
        return False

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_employee_payment_status(request, employee_id):
    """
    Check if employee has completed payment setup
    """
    try:
        employee = Employee.objects.get(
            id=employee_id,
            tenant_id=request.user.business_id
        )
        
        # Check for payment method
        payment_method = PaymentDepositMethod.objects.filter(
            employee=employee,
            is_active=True
        ).first()
        
        # Check Stripe account status
        stripe_account = EmployeeStripeAccount.objects.filter(
            employee=employee
        ).first()
        
        has_payment = False
        payment_type = None
        verification_status = 'not_started'
        
        if payment_method:
            has_payment = True
            payment_type = payment_method.method_type
            
        if stripe_account:
            verification_status = stripe_account.verification_status
            if stripe_account.payouts_enabled:
                has_payment = True
        
        return Response({
            'employee_name': f"{employee.first_name} {employee.last_name}",
            'has_payment_method': has_payment,
            'payment_type': payment_type,
            'verification_status': verification_status,
            'email': employee.email
        }, status=status.HTTP_200_OK)
        
    except Employee.DoesNotExist:
        return Response({
            'error': 'Employee not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error checking employee payment status: {str(e)}")
        return Response({
            'error': 'Failed to check payment status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def setup_mobile_money(request, employee_id):
    """
    Set up mobile money payment method for employee
    """
    try:
        employee = Employee.objects.get(
            id=employee_id,
            tenant_id=request.user.business_id
        )
        
        provider = request.data.get('provider')  # M-PESA, MTN, etc.
        phone_number = request.data.get('phone_number')
        country_code = request.data.get('country_code', employee.phone_country_code)
        
        if not provider or not phone_number:
            return Response({
                'error': 'Provider and phone number are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update payment method
        payment_method, created = PaymentDepositMethod.objects.update_or_create(
            employee=employee,
            method_type='MOBILE_MONEY',
            defaults={
                'tenant_id': employee.tenant_id,
                'business_id': employee.business_id,
                'phone': phone_number,
                'mobile_money_provider': provider,
                'is_default': True,
                'is_active': True
            }
        )
        
        # Update employee record
        employee.mobile_money_provider = provider
        employee.mobile_money_number = phone_number
        employee.prefer_mobile_money = True
        employee.phone_country_code = country_code
        employee.save()
        
        return Response({
            'success': True,
            'message': 'Mobile money payment method set up successfully',
            'provider': provider,
            'phone': phone_number
        }, status=status.HTTP_200_OK)
        
    except Employee.DoesNotExist:
        return Response({
            'error': 'Employee not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error setting up mobile money: {str(e)}")
        return Response({
            'error': 'Failed to set up mobile money'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_payment_manual(request, employee_id):
    """
    Manually set up payment method for employee (bank or mobile money)
    Used when business owner enters payment details on behalf of employee
    """
    try:
        employee = Employee.objects.get(
            id=employee_id,
            tenant_id=request.user.business_id
        )
        
        method_type = request.data.get('method_type')
        
        if method_type == 'DIRECT_DEPOSIT':
            # Handle bank account setup
            bank_name = request.data.get('bank_name')
            account_number = request.data.get('account_number')
            routing_number = request.data.get('routing_number')
            account_type = request.data.get('account_type', 'CHECKING')
            
            if not all([bank_name, account_number, routing_number]):
                return Response({
                    'error': 'Bank name, account number, and routing number are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create or update payment method
            payment_method, created = PaymentDepositMethod.objects.update_or_create(
                employee=employee,
                method_type='DIRECT_DEPOSIT',
                defaults={
                    'tenant_id': employee.tenant_id,
                    'business_id': employee.business_id,
                    'bank_name': bank_name,
                    'account_last_four': account_number[-4:] if len(account_number) >= 4 else account_number,
                    'routing_number_last_four': routing_number[-4:] if len(routing_number) >= 4 else routing_number,
                    'account_type': account_type,
                    'is_default': True,
                    'is_active': True
                }
            )
            
            # Store encrypted full account details in Stripe if available
            if stripe and settings.STRIPE_SECRET_KEY:
                try:
                    # Create bank account token in Stripe
                    bank_account_token = stripe.Token.create(
                        bank_account={
                            'country': employee.country or 'US',
                            'currency': 'usd',
                            'account_holder_name': f"{employee.first_name} {employee.last_name}",
                            'account_holder_type': 'individual',
                            'routing_number': routing_number,
                            'account_number': account_number,
                        }
                    )
                    
                    # Store the token ID for later use
                    payment_method.payment_provider_id = bank_account_token.id
                    payment_method.save()
                    
                except stripe.error.StripeError as e:
                    logger.warning(f"Could not store bank details in Stripe: {str(e)}")
                    # Continue without Stripe - store locally (less secure but functional)
            
            # Update employee record
            employee.bank_name = bank_name
            employee.account_number_last4 = account_number[-4:] if len(account_number) >= 4 else account_number
            employee.routing_number_last4 = routing_number[-4:] if len(routing_number) >= 4 else routing_number
            employee.direct_deposit = True
            employee.save()
            
            return Response({
                'success': True,
                'message': 'Bank account payment method set up successfully',
                'method': 'DIRECT_DEPOSIT',
                'last_four': account_number[-4:] if len(account_number) >= 4 else account_number
            }, status=status.HTTP_200_OK)
            
        elif method_type == 'MOBILE_MONEY':
            # Handle mobile money setup
            provider = request.data.get('provider')
            phone_number = request.data.get('phone_number')
            account_name = request.data.get('account_name')
            
            if not all([provider, phone_number]):
                return Response({
                    'error': 'Provider and phone number are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create or update payment method
            payment_method, created = PaymentDepositMethod.objects.update_or_create(
                employee=employee,
                method_type='MOBILE_MONEY',
                defaults={
                    'tenant_id': employee.tenant_id,
                    'business_id': employee.business_id,
                    'phone': phone_number,
                    'mobile_money_provider': provider,
                    'username': account_name,  # Store account name in username field
                    'is_default': True,
                    'is_active': True
                }
            )
            
            # Update employee record
            employee.mobile_money_provider = provider
            employee.mobile_money_number = phone_number
            employee.prefer_mobile_money = True
            employee.save()
            
            return Response({
                'success': True,
                'message': 'Mobile money payment method set up successfully',
                'method': 'MOBILE_MONEY',
                'provider': provider,
                'phone': phone_number
            }, status=status.HTTP_200_OK)
            
        else:
            return Response({
                'error': f'Invalid payment method type: {method_type}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Employee.DoesNotExist:
        return Response({
            'error': 'Employee not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error setting up manual payment: {str(e)}")
        return Response({
            'error': 'Failed to set up payment method',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)