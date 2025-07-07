"""
Stripe Payroll Processor
Handles payments in Stripe-supported countries
"""
import stripe
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripePayrollProcessor:
    """
    Process payroll payments via Stripe for supported countries
    """
    
    def setup_employee_bank(self, employee):
        """
        Set up Stripe Connect account for employee to receive payments
        """
        try:
            # Create minimal Connect account for payouts only
            account = stripe.Account.create(
                type='express',
                country=employee.country,
                email=employee.email,
                capabilities={
                    'transfers': {'requested': True},
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
                    'tenant_id': str(employee.tenant_id)
                },
                settings={
                    'payouts': {
                        'schedule': {
                            'interval': 'manual'
                        }
                    }
                }
            )
            
            # Generate onboarding link
            account_link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=f"{settings.FRONTEND_URL}/dashboard/payroll/employee/bank-setup?refresh=true",
                return_url=f"{settings.FRONTEND_URL}/dashboard/payroll/employee/bank-setup?success=true",
                type='account_onboarding',
                collect='eventually_due'
            )
            
            # Store account ID
            from .stripe_models import EmployeeStripeAccount
            stripe_account, created = EmployeeStripeAccount.objects.get_or_create(
                employee=employee,
                tenant_id=employee.tenant_id,
                defaults={
                    'stripe_account_id': account.id,
                    'verification_status': 'pending'
                }
            )
            
            if not created:
                stripe_account.stripe_account_id = account.id
                stripe_account.save()
            
            return {
                'success': True,
                'onboarding_url': account_link.url,
                'account_id': account.id,
                'expires_at': account_link.expires_at
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error setting up employee: {str(e)}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error setting up employee bank: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def process_batch(self, payments, payroll_run):
        """
        Process batch of payments via Stripe
        """
        successful = 0
        failed = 0
        errors = []
        
        for payment in payments:
            try:
                result = self._process_single_payment(payment, payroll_run)
                if result['success']:
                    successful += 1
                else:
                    failed += 1
                    errors.append(result['error'])
            except Exception as e:
                logger.error(f"Error processing Stripe payment: {str(e)}")
                failed += 1
                errors.append(str(e))
        
        return {
            'successful': successful,
            'failed': failed,
            'errors': errors
        }
    
    def _process_single_payment(self, payment, payroll_run):
        """
        Process a single payment via Stripe
        """
        try:
            employee = payment.employee
            
            # Get employee's Stripe account
            from .stripe_models import EmployeeStripeAccount
            stripe_account = EmployeeStripeAccount.objects.get(
                employee=employee,
                tenant_id=payment.tenant_id
            )
            
            if not stripe_account.stripe_account_id or not stripe_account.payouts_enabled:
                return {
                    'success': False,
                    'error': f"Employee {employee.id} has not completed bank setup"
                }
            
            # Create transfer to employee's Connect account
            transfer = stripe.Transfer.create(
                amount=int(payment.net_pay * 100),  # Convert to cents
                currency=payroll_run.currency_code or 'USD',
                destination=stripe_account.stripe_account_id,
                description=f'Salary - {employee.first_name} {employee.last_name}',
                metadata={
                    'payroll_payment_id': str(payment.id),
                    'employee_id': str(employee.id),
                    'pay_period': f"{payroll_run.start_date} to {payroll_run.end_date}",
                    'type': 'salary'
                },
                transfer_group=f'payroll_{payroll_run.id}',
            )
            
            # Trigger payout to employee's bank
            payout = stripe.Payout.create(
                amount=int(payment.net_pay * 100),
                currency=payroll_run.currency_code or 'USD',
                stripe_account=stripe_account.stripe_account_id,
                description=f'Salary payout - {payroll_run.pay_date}',
                metadata={
                    'payroll_payment_id': str(payment.id),
                }
            )
            
            # Track the payment
            from .stripe_models import EmployeePayoutRecord
            payout_record, created = EmployeePayoutRecord.objects.get_or_create(
                payroll_transaction=payment,
                employee=payment.employee,
                tenant_id=payment.tenant_id,
                defaults={
                    'stripe_transfer_id': transfer.id,
                    'stripe_payout_id': payout.id,
                    'payout_amount': payment.net_pay,
                    'payout_status': 'processing',
                    'initiated_at': timezone.now(),
                    'expected_arrival_date': timezone.now().date() + timezone.timedelta(days=2),
                    'payment_provider': 'stripe'
                }
            )
            
            return {'success': True, 'transfer_id': transfer.id, 'payout_id': payout.id}
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment error: {str(e)}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Payment processing error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def collect_funds_from_employer(self, business, amount):
        """
        Collect funds from employer's bank via ACH
        Used before distributing to employees
        """
        try:
            if not business.stripe_customer_id or not business.default_bank_token:
                raise ValueError("Business has not set up payroll funding")
            
            # Create payment intent to charge employer
            payment_intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency='usd',
                customer=business.stripe_customer_id,
                payment_method=business.default_bank_token,
                payment_method_types=['us_bank_account'],
                confirm=True,
                mandate=business.ach_mandate_id,
                description=f'Payroll funding - {business.name}',
                metadata={
                    'business_id': str(business.id),
                    'type': 'payroll_funding',
                    'includes_platform_fee': 'true'
                },
                statement_descriptor='PAYROLL',
            )
            
            return {
                'success': True,
                'payment_intent_id': payment_intent.id,
                'status': payment_intent.status,
                'amount': amount
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe funding collection error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_employee_status(self, employee):
        """
        Check if employee's Stripe account is ready
        """
        try:
            from .stripe_models import EmployeeStripeAccount
            stripe_account = EmployeeStripeAccount.objects.get(
                employee=employee
            )
            
            if not stripe_account.stripe_account_id:
                return {'ready': False, 'status': 'not_setup'}
            
            # Get latest status from Stripe
            account = stripe.Account.retrieve(stripe_account.stripe_account_id)
            
            # Update local record
            stripe_account.onboarding_complete = account.details_submitted
            stripe_account.charges_enabled = account.charges_enabled
            stripe_account.payouts_enabled = account.payouts_enabled
            stripe_account.save()
            
            return {
                'ready': account.payouts_enabled,
                'status': 'active' if account.payouts_enabled else 'pending',
                'requirements': account.requirements.currently_due if not account.payouts_enabled else []
            }
            
        except EmployeeStripeAccount.DoesNotExist:
            return {'ready': False, 'status': 'not_setup'}
        except Exception as e:
            logger.error(f"Error checking employee status: {str(e)}")
            return {'ready': False, 'status': 'error', 'error': str(e)}