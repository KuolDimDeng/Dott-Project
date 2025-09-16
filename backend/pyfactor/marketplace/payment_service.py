"""
Payment service for handling marketplace order payments and settlements.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from banking.models import PaymentSettlement, BankAccount
from couriers.models import CourierProfile, CourierEarnings
from payments.models import POSTransaction
import stripe
import logging

logger = logging.getLogger(__name__)


class MarketplacePaymentService:
    """Service for handling marketplace payment operations."""

    @staticmethod
    def calculate_platform_fees(amount):
        """
        Calculate platform fees for a transaction.

        Returns:
            dict: Contains stripe_fee, platform_fee, and net_amount
        """
        amount = Decimal(str(amount))

        # Stripe fee: 2.9% + $0.30
        stripe_fee = (amount * Decimal('0.029')) + Decimal('0.30')

        # Platform fee: 2.5% for marketplace transactions
        platform_fee = amount * Decimal('0.025')

        # Net amount after fees
        net_amount = amount - stripe_fee - platform_fee

        return {
            'stripe_fee': stripe_fee,
            'platform_fee': platform_fee,
            'net_amount': net_amount,
            'total_fees': stripe_fee + platform_fee
        }

    @staticmethod
    @transaction.atomic
    def create_payment_settlement(order, payment_intent_id=None):
        """
        Create a payment settlement record for an order.

        Args:
            order: ConsumerOrder instance
            payment_intent_id: Stripe payment intent ID

        Returns:
            PaymentSettlement instance
        """
        try:
            # Calculate fees
            fees = MarketplacePaymentService.calculate_platform_fees(order.total)

            # Get business's default bank account for payouts
            bank_account = BankAccount.objects.filter(
                user=order.business,
                is_default_for_pos=True
            ).first()

            if not bank_account:
                # Try to get any active bank account
                bank_account = BankAccount.objects.filter(
                    user=order.business,
                    is_active=True
                ).first()

            # Create settlement record
            settlement = PaymentSettlement.objects.create(
                user=order.business,
                stripe_payment_intent_id=payment_intent_id or f"order_{order.id}",
                original_amount=order.total,
                stripe_fee=fees['stripe_fee'],
                platform_fee=fees['platform_fee'],
                settlement_amount=fees['net_amount'],
                bank_account=bank_account,
                status='pending',
                pos_transaction_id=str(order.id),
                customer_email=order.consumer.email,
                notes=f"Marketplace Order #{order.order_number}"
            )

            logger.info(f"Created payment settlement {settlement.id} for order {order.order_number}")
            return settlement

        except Exception as e:
            logger.error(f"Error creating payment settlement: {str(e)}")
            raise

    @staticmethod
    @transaction.atomic
    def release_restaurant_payment(order, pickup_pin):
        """
        Release payment to restaurant after pickup PIN verification.

        Args:
            order: ConsumerOrder instance
            pickup_pin: The PIN to verify

        Returns:
            tuple: (success: bool, message: str, settlement: PaymentSettlement or None)
        """
        try:
            # Verify the pickup PIN
            if str(order.pickup_pin) != str(pickup_pin):
                return False, "Invalid pickup PIN", None

            # Check if payment already released
            existing_settlement = PaymentSettlement.objects.filter(
                pos_transaction_id=str(order.id),
                user=order.business
            ).first()

            if existing_settlement and existing_settlement.status != 'pending':
                return False, "Payment already processed", existing_settlement

            # Create or update settlement
            if not existing_settlement:
                settlement = MarketplacePaymentService.create_payment_settlement(
                    order,
                    payment_intent_id=order.stripe_payment_intent_id if hasattr(order, 'stripe_payment_intent_id') else None
                )
            else:
                settlement = existing_settlement

            # Mark settlement for processing
            settlement.status = 'processing'
            settlement.processed_at = timezone.now()
            settlement.save()

            # Update order status
            order.pickup_verified = True
            order.pickup_verified_at = timezone.now()
            order.order_status = 'picked'
            order.restaurant_payment_status = 'processing'
            order.save()

            # TODO: Trigger actual bank transfer via Wise API
            # This would be handled by a background job/cron that processes all 'processing' settlements

            logger.info(f"Restaurant payment released for order {order.order_number}")
            return True, "Payment released to restaurant", settlement

        except Exception as e:
            logger.error(f"Error releasing restaurant payment: {str(e)}")
            return False, f"Error processing payment: {str(e)}", None

    @staticmethod
    @transaction.atomic
    def release_courier_payment(order, delivery_pin, courier):
        """
        Release payment to courier after delivery PIN verification.

        Args:
            order: ConsumerOrder instance
            delivery_pin: The PIN to verify
            courier: CourierProfile instance

        Returns:
            tuple: (success: bool, message: str, earnings: CourierEarnings or None)
        """
        try:
            # Verify the delivery PIN (consumer's PIN)
            if str(order.consumer_delivery_pin) != str(delivery_pin):
                return False, "Invalid delivery PIN", None

            # Check if payment already released
            existing_earnings = CourierEarnings.objects.filter(
                order_id=str(order.id),
                courier=courier
            ).first()

            if existing_earnings and existing_earnings.payout_status != 'pending':
                return False, "Payment already processed", existing_earnings

            # Calculate courier earnings (usually from order.delivery_fee)
            courier_fee = order.delivery_fee
            platform_commission = courier_fee * Decimal('0.25')  # 25% platform commission
            courier_earnings = courier_fee - platform_commission

            # Create or update courier earnings
            if not existing_earnings:
                earnings = CourierEarnings.objects.create(
                    courier=courier,
                    order_id=str(order.id),
                    order_number=order.order_number,
                    gross_amount=courier_fee,
                    platform_commission=platform_commission,
                    net_amount=courier_earnings,
                    payout_method=courier.preferred_payout_method,
                    payout_status='processing',
                    currency='USD'
                )
            else:
                earnings = existing_earnings
                earnings.payout_status = 'processing'
                earnings.save()

            # Update order status
            order.delivery_verified = True
            order.delivery_verified_at = timezone.now()
            order.order_status = 'delivered'
            order.delivered_at = timezone.now()
            order.courier_payment_status = 'processing'
            order.save()

            # Update courier's total earnings
            courier.total_earnings += courier_earnings
            courier.total_deliveries += 1
            courier.save()

            logger.info(f"Courier payment released for order {order.order_number}")
            return True, f"Payment of ${courier_earnings:.2f} released to courier", earnings

        except Exception as e:
            logger.error(f"Error releasing courier payment: {str(e)}")
            return False, f"Error processing payment: {str(e)}", None

    @staticmethod
    def process_order_payment(order, payment_method, payment_details=None):
        """
        Process initial payment from consumer for an order.

        Args:
            order: ConsumerOrder instance
            payment_method: Payment method (card, mpesa, mtn_momo)
            payment_details: Additional payment details

        Returns:
            dict: Payment processing result
        """
        try:
            if payment_method == 'card':
                # Process Stripe payment
                # This would typically be handled by frontend with Stripe Elements
                pass
            elif payment_method == 'mpesa':
                # Process M-Pesa payment
                # Integration with M-Pesa API
                pass
            elif payment_method == 'mtn_momo':
                # Process MTN Mobile Money
                # Integration with MTN API
                pass

            # For now, mark as paid (in production, this would be after actual payment confirmation)
            order.payment_status = 'paid'
            order.payment_method = payment_method
            order.paid_at = timezone.now()
            order.save()

            return {
                'success': True,
                'message': 'Payment processed successfully',
                'order_id': order.id
            }

        except Exception as e:
            logger.error(f"Error processing order payment: {str(e)}")
            return {
                'success': False,
                'message': str(e)
            }