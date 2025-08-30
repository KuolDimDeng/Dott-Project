"""
Payment service for marketplace transactions
Handles Stripe (worldwide) and M-Pesa (Kenya) payments
"""
import stripe
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

class MarketplacePaymentService:
    """
    Handles payment processing for marketplace orders
    """
    
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.platform_fee_percentage = Decimal('0.025')  # 2.5% platform fee
        
    def create_payment_intent(self, order, payment_method='card'):
        """
        Create a Stripe payment intent for an order
        """
        try:
            # Calculate platform fee
            platform_fee = int(order.total_amount * self.platform_fee_percentage * 100)
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(order.total_amount * 100),  # Convert to cents
                currency='usd',
                payment_method_types=[payment_method],
                metadata={
                    'order_id': str(order.id),
                    'order_number': order.order_number,
                    'consumer_id': str(order.consumer.id),
                    'business_id': str(order.business.id),
                },
                # Platform fee configuration for Stripe Connect
                application_fee_amount=platform_fee,
                transfer_data={
                    'destination': self.get_business_stripe_account(order.business),
                } if self.get_business_stripe_account(order.business) else None
            )
            
            return {
                'success': True,
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'amount': order.total_amount,
                'platform_fee': platform_fee / 100
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to create payment intent'
            }
    
    def get_business_stripe_account(self, business_user):
        """
        Get the Stripe Connect account ID for a business
        """
        try:
            from users.models import UserProfile
            profile = UserProfile.objects.get(user=business_user)
            return profile.stripe_connect_account_id
        except:
            return None
    
    def process_mpesa_payment(self, order, phone_number):
        """
        Process M-Pesa payment for Kenya
        """
        try:
            # TODO: Integrate with M-Pesa API
            # For now, return a mock response
            logger.info(f"Processing M-Pesa payment for order {order.order_number}")
            
            return {
                'success': True,
                'transaction_id': f'MPESA_{order.order_number}',
                'message': 'Payment request sent to your phone',
                'amount': order.total_amount,
                'phone_number': phone_number
            }
            
        except Exception as e:
            logger.error(f"Error processing M-Pesa payment: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to process M-Pesa payment'
            }
    
    def confirm_payment(self, order, payment_intent_id=None, transaction_id=None):
        """
        Confirm payment completion
        """
        try:
            if payment_intent_id:
                # Verify Stripe payment
                intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                if intent.status == 'succeeded':
                    order.payment_status = 'paid'
                    order.payment_intent_id = payment_intent_id
                    order.paid_at = timezone.now()
                    order.save()
                    return {'success': True, 'status': 'paid'}
                else:
                    return {'success': False, 'status': intent.status}
                    
            elif transaction_id:
                # Verify M-Pesa payment (would check with M-Pesa API)
                order.payment_status = 'paid'
                order.payment_transaction_id = transaction_id
                order.paid_at = timezone.now()
                order.save()
                return {'success': True, 'status': 'paid'}
                
            return {'success': False, 'error': 'No payment identifier provided'}
            
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def refund_payment(self, order, amount=None, reason=''):
        """
        Process a refund for an order
        """
        try:
            if not amount:
                amount = order.total_amount
                
            if order.payment_intent_id:
                # Stripe refund
                refund = stripe.Refund.create(
                    payment_intent=order.payment_intent_id,
                    amount=int(amount * 100),
                    reason=reason or 'requested_by_customer',
                    metadata={
                        'order_id': str(order.id),
                        'order_number': order.order_number
                    }
                )
                
                if refund.status == 'succeeded':
                    order.payment_status = 'refunded'
                    order.refunded_at = timezone.now()
                    order.refund_amount = amount
                    order.save()
                    
                return {
                    'success': refund.status == 'succeeded',
                    'refund_id': refund.id,
                    'amount': amount
                }
                
            elif order.payment_transaction_id and 'MPESA' in order.payment_transaction_id:
                # M-Pesa refund (would integrate with M-Pesa API)
                order.payment_status = 'refunded'
                order.refunded_at = timezone.now()
                order.refund_amount = amount
                order.save()
                
                return {
                    'success': True,
                    'transaction_id': f'REFUND_{order.payment_transaction_id}',
                    'amount': amount
                }
                
            return {'success': False, 'error': 'No payment found to refund'}
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing refund: {str(e)}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def calculate_platform_fee(self, amount):
        """
        Calculate the platform fee for a transaction
        """
        return amount * self.platform_fee_percentage
    
    def get_payment_methods_for_country(self, country_code):
        """
        Get available payment methods for a country
        """
        payment_methods = ['card']  # Card available everywhere
        
        if country_code == 'KE':
            payment_methods.append('mpesa')
        
        # Add more payment methods as we expand
        # if country_code == 'NG':
        #     payment_methods.append('flutterwave')
        
        return payment_methods