"""
Stripe Payment Processing Service for Dott Platform
Handles invoice payments, vendor payments, and fee collection
"""
import stripe
from django.conf import settings
from django.db import transaction as db_transaction
from pyfactor.logging_config import get_logger
from .stripe_fees import calculate_platform_fee
from hr.stripe_config import STRIPE_EXPRESS_ACCOUNT_ID
from decimal import Decimal
import json

logger = get_logger()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripePaymentService:
    """Service for processing payments through Stripe Connect"""
    
    @staticmethod
    def create_invoice_payment_intent(invoice, connected_account_id=None):
        """
        Create a payment intent for customer to pay an invoice
        
        Args:
            invoice: Invoice object with amount, currency, etc.
            connected_account_id: Stripe Connect account ID of the business receiving payment
                                If None, uses platform's Express account
        
        Returns:
            dict: Payment intent details including client_secret for frontend
        """
        try:
            # Use platform Express account if no connected account specified
            if not connected_account_id:
                connected_account_id = STRIPE_EXPRESS_ACCOUNT_ID
            
            amount_cents = int(invoice.amount * 100)  # Convert to cents
            
            # Calculate fees
            fee_info = calculate_platform_fee(amount_cents, 'invoice_payment')
            
            logger.info(f"[Payment] Creating invoice payment - Amount: ${amount_cents/100:.2f}, "
                       f"Platform fee: ${fee_info['platform_fee']/100:.2f}, "
                       f"Our profit: ${fee_info['platform_profit']/100:.2f}")
            
            # Create payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,  # Amount the merchant receives
                currency=invoice.currency or 'usd',
                description=f"Invoice #{invoice.invoice_number}",
                
                # Platform fee - this is what we collect
                application_fee_amount=fee_info['platform_fee'],
                
                # Transfer to connected account
                transfer_data={
                    'destination': connected_account_id
                },
                
                # Metadata for tracking
                metadata={
                    'invoice_id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'business_id': str(invoice.business_id),
                    'fee_structure': fee_info['fee_description'],
                    'platform_fee': fee_info['platform_fee'],
                    'platform_profit': fee_info['platform_profit'],
                    'payment_type': 'invoice'
                },
                
                # Allow customer to save payment method
                setup_future_usage='off_session',
                
                # Customer will be charged: amount + platform_fee
                # But Stripe API only sees the base amount
                # The platform fee is added automatically
            )
            
            logger.info(f"[Payment] Created payment intent: {payment_intent.id}")
            
            return {
                'success': True,
                'payment_intent_id': payment_intent.id,
                'client_secret': payment_intent.client_secret,
                'amount': amount_cents,
                'platform_fee': fee_info['platform_fee'],
                'total_charge': amount_cents + fee_info['platform_fee'],
                'fee_breakdown': {
                    'subtotal': f"${amount_cents/100:.2f}",
                    'processing_fee': f"${fee_info['platform_fee']/100:.2f}",
                    'total': f"${(amount_cents + fee_info['platform_fee'])/100:.2f}",
                    'fee_description': fee_info['fee_description']
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"[Payment] Stripe error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'stripe_error'
            }
        except Exception as e:
            logger.error(f"[Payment] Unexpected error: {str(e)}")
            return {
                'success': False,
                'error': 'Payment processing failed',
                'error_type': 'system_error'
            }
    
    @staticmethod
    def create_vendor_payment(vendor_payment_data, connected_account_id=None):
        """
        Create a payment to a vendor/supplier
        
        Args:
            vendor_payment_data: dict with amount, vendor details, etc.
            connected_account_id: Business's Stripe account making the payment
        
        Returns:
            dict: Payment details
        """
        try:
            # Use platform Express account if not specified
            if not connected_account_id:
                connected_account_id = STRIPE_EXPRESS_ACCOUNT_ID
            
            amount_cents = int(vendor_payment_data['amount'] * 100)
            
            # Calculate fees
            fee_info = calculate_platform_fee(amount_cents, 'vendor_payment')
            
            # For vendor payments, the business pays the fee
            total_charge = amount_cents + fee_info['platform_fee']
            
            logger.info(f"[Payment] Creating vendor payment - Amount: ${amount_cents/100:.2f}, "
                       f"Fee: ${fee_info['platform_fee']/100:.2f}, "
                       f"Total: ${total_charge/100:.2f}")
            
            # Create a charge on the connected account
            charge = stripe.Charge.create(
                amount=total_charge,  # Business pays amount + fee
                currency=vendor_payment_data.get('currency', 'usd'),
                description=f"Payment to {vendor_payment_data.get('vendor_name', 'Vendor')}",
                
                # Charge the connected account's default payment source
                # This assumes the business has a payment method on file
                source=vendor_payment_data.get('payment_source'),
                
                # Application fee goes to platform
                application_fee_amount=fee_info['platform_fee'],
                
                # Process on behalf of connected account
                stripe_account=connected_account_id,
                
                metadata={
                    'vendor_id': vendor_payment_data.get('vendor_id', ''),
                    'vendor_name': vendor_payment_data.get('vendor_name', ''),
                    'invoice_number': vendor_payment_data.get('invoice_number', ''),
                    'business_id': str(vendor_payment_data.get('business_id', '')),
                    'fee_structure': fee_info['fee_description'],
                    'platform_fee': fee_info['platform_fee'],
                    'payment_type': 'vendor_payment'
                }
            )
            
            logger.info(f"[Payment] Created vendor payment: {charge.id}")
            
            # Create a transfer to the vendor if they have a Stripe account
            transfer = None
            if vendor_payment_data.get('vendor_stripe_account'):
                transfer = stripe.Transfer.create(
                    amount=amount_cents,  # Vendor receives the base amount
                    currency=vendor_payment_data.get('currency', 'usd'),
                    destination=vendor_payment_data['vendor_stripe_account'],
                    description=f"Payment for invoice {vendor_payment_data.get('invoice_number', '')}",
                    source_transaction=charge.id,
                    metadata={
                        'vendor_name': vendor_payment_data.get('vendor_name', ''),
                        'invoice_number': vendor_payment_data.get('invoice_number', '')
                    }
                )
                logger.info(f"[Payment] Created transfer to vendor: {transfer.id}")
            
            return {
                'success': True,
                'charge_id': charge.id,
                'transfer_id': transfer.id if transfer else None,
                'amount': amount_cents,
                'platform_fee': fee_info['platform_fee'],
                'total_charged': total_charge,
                'fee_breakdown': {
                    'payment_amount': f"${amount_cents/100:.2f}",
                    'processing_fee': f"${fee_info['platform_fee']/100:.2f}",
                    'total_charged': f"${total_charge/100:.2f}",
                    'fee_description': fee_info['fee_description']
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"[Payment] Stripe error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'stripe_error'
            }
        except Exception as e:
            logger.error(f"[Payment] Unexpected error: {str(e)}")
            return {
                'success': False,
                'error': 'Payment processing failed',
                'error_type': 'system_error'
            }
    
    @staticmethod
    def get_payment_status(payment_intent_id):
        """Check the status of a payment intent"""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                'success': True,
                'status': payment_intent.status,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                'metadata': payment_intent.metadata,
                'charges': [
                    {
                        'id': charge.id,
                        'amount': charge.amount,
                        'status': charge.status,
                        'created': charge.created
                    }
                    for charge in payment_intent.charges.data
                ]
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"[Payment] Error retrieving payment status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def create_platform_payout(amount_cents, description="Platform earnings payout"):
        """
        Create a payout from platform balance to bank account
        This is how you get your fees out of Stripe
        """
        try:
            payout = stripe.Payout.create(
                amount=amount_cents,
                currency='usd',
                description=description,
                metadata={
                    'type': 'platform_fees',
                    'description': description
                }
            )
            
            logger.info(f"[Payment] Created platform payout: {payout.id} for ${amount_cents/100:.2f}")
            
            return {
                'success': True,
                'payout_id': payout.id,
                'amount': amount_cents,
                'arrival_date': payout.arrival_date,
                'status': payout.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"[Payment] Payout error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }