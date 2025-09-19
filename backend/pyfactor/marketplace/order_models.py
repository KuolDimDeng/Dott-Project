from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class ConsumerOrder(models.Model):
    """
    Orders placed by consumers in the marketplace
    """
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('business_accepted', 'Business Accepted'),
        ('searching_courier', 'Searching for Courier'),
        ('courier_assigned', 'Courier Assigned'),
        ('preparing', 'Preparing'),
        ('ready_for_pickup', 'Ready for Pickup'),
        ('picked_up', 'Picked Up'),
        ('in_transit', 'In Transit'),
        ('arrived', 'Courier Arrived'),
        ('delivered', 'Delivered'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash on Delivery'),
        ('card', 'Credit/Debit Card'),
        ('mpesa', 'M-Pesa'),
        ('mtn', 'MTN Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True)
    
    # Parties
    consumer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consumer_orders')
    business = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_orders')
    
    # Courier integration
    courier = models.ForeignKey('couriers.CourierProfile', on_delete=models.SET_NULL, 
                               null=True, blank=True, related_name='delivery_orders')
    courier_assigned_at = models.DateTimeField(null=True, blank=True)
    courier_accepted_at = models.DateTimeField(null=True, blank=True)
    courier_earnings = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # PIN verification system
    pickup_pin = models.CharField(max_length=4, blank=True, null=True, default=None,
                                 help_text='4-digit PIN restaurant gives to courier at pickup')
    consumer_delivery_pin = models.CharField(max_length=4, blank=True, null=True, default=None,
                                            help_text='4-digit PIN consumer gives to courier at delivery')
    delivery_pin = models.CharField(max_length=4, blank=True, null=True, default=None,
                                   help_text='4-digit PIN for delivery verification (restaurant to courier)')
    pin_generated_at = models.DateTimeField(null=True, blank=True)
    pin_verified = models.BooleanField(default=False)
    pin_verified_at = models.DateTimeField(null=True, blank=True)

    # Payment verification tracking
    pickup_verified = models.BooleanField(default=False)
    pickup_verified_at = models.DateTimeField(null=True, blank=True)
    delivery_verified = models.BooleanField(default=False)
    delivery_verified_at = models.DateTimeField(null=True, blank=True)

    # Payment status for restaurant and courier
    restaurant_payment_status = models.CharField(max_length=20, default='pending',
                                                choices=[('pending', 'Pending'), ('processing', 'Processing'),
                                                        ('completed', 'Completed'), ('failed', 'Failed')])
    courier_payment_status = models.CharField(max_length=20, default='pending',
                                             choices=[('pending', 'Pending'), ('processing', 'Processing'),
                                                     ('completed', 'Completed'), ('failed', 'Failed')])
    
    # Order details
    items = models.JSONField(default=list)  # Array of {product_id, name, quantity, price}
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                    help_text="Tip amount for courier (100% goes to courier)")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Status
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    
    # Delivery info
    delivery_address = models.TextField(blank=True)
    delivery_notes = models.TextField(blank=True)
    estimated_delivery_time = models.DateTimeField(null=True, blank=True)
    actual_delivery_time = models.DateTimeField(null=True, blank=True)
    
    # Chat linkage
    created_from_chat = models.BooleanField(default=False)
    chat_conversation_id = models.UUIDField(null=True, blank=True)
    
    # Payment tracking
    payment_intent_id = models.CharField(max_length=200, blank=True, null=True)
    payment_transaction_id = models.CharField(max_length=200, blank=True, null=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Tracking
    confirmed_at = models.DateTimeField(null=True, blank=True)
    prepared_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'marketplace_consumer_orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['consumer', '-created_at']),
            models.Index(fields=['business', '-created_at']),
            models.Index(fields=['order_status', 'payment_status']),
            models.Index(fields=['order_number']),
        ]
    
    def __str__(self):
        return f"Order {self.order_number} - {self.consumer.email} -> {self.business.business_name}"
    
    def save(self, *args, **kwargs):
        # Clean all fields to prevent JSON parsing errors
        # Handle CharField fields that should be NULL when empty
        nullable_char_fields = [
            'pickup_pin', 'consumer_delivery_pin', 'delivery_pin',
            'payment_intent_id', 'payment_transaction_id'
        ]

        for field in nullable_char_fields:
            value = getattr(self, field, None)
            if value == '':
                setattr(self, field, None)

        # Ensure TextField fields are empty strings, not None
        text_fields = ['delivery_address', 'delivery_notes', 'cancellation_reason']
        for field in text_fields:
            value = getattr(self, field, None)
            if value is None:
                setattr(self, field, '')

        # Track if status changed for notifications
        send_notification = False
        old_status = None

        if self.pk:  # If updating existing order
            try:
                old_order = ConsumerOrder.objects.get(pk=self.pk)
                if old_order.order_status != self.order_status:
                    old_status = old_order.order_status
                    send_notification = True
            except ConsumerOrder.DoesNotExist:
                pass

        if not self.order_number or self.order_number.strip() == '':
            # Generate order number
            import random
            import string
            prefix = 'ORD'
            suffix = ''.join(random.choices(string.digits, k=8))
            self.order_number = f"{prefix}{suffix}"

        super().save(*args, **kwargs)

        # Send notifications if status changed
        if send_notification and old_status:
            try:
                from .notification_service import OrderNotificationService
                OrderNotificationService.notify_order_status_update(self, old_status)
                OrderNotificationService.broadcast_order_update(self, 'status_change')
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send status update notification: {e}")
    
    def confirm_order(self):
        """Confirm the order"""
        self.order_status = 'confirmed'
        self.confirmed_at = timezone.now()
        self.save()
    
    def mark_preparing(self):
        """Mark order as being prepared"""
        self.order_status = 'preparing'
        self.prepared_at = timezone.now()
        self.save()
    
    def mark_delivered(self):
        """Mark order as delivered"""
        self.order_status = 'delivered'
        self.delivered_at = timezone.now()
        self.actual_delivery_time = timezone.now()
        self.save()
    
    def cancel_order(self, reason=''):
        """Cancel the order"""
        self.order_status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save()
    
    def generate_pins(self):
        """Generate unique PINs for pickup and delivery verification"""
        import random
        self.pickup_pin = str(random.randint(1000, 9999))
        self.delivery_pin = str(random.randint(1000, 9999))
        self.consumer_delivery_pin = str(random.randint(1000, 9999))
        self.pin_generated_at = timezone.now()
        self.pin_verified = False
        self.save()
        return {
            'pickup_pin': self.pickup_pin,
            'delivery_pin': self.delivery_pin,
            'consumer_pin': self.consumer_delivery_pin
        }

    def generate_delivery_pin(self):
        """Legacy method - now calls generate_pins"""
        pins = self.generate_pins()
        return pins['delivery_pin']

    def verify_pickup_pin(self, pin, courier=None):
        """
        Verify the pickup PIN and trigger restaurant payment release.
        Called when courier enters PIN at restaurant.
        """
        from .payment_service import MarketplacePaymentService

        if str(self.pickup_pin) == str(pin):
            self.pickup_verified = True
            self.pickup_verified_at = timezone.now()
            self.order_status = 'picked'
            self.save()

            # Release payment to restaurant
            success, message, settlement = MarketplacePaymentService.release_restaurant_payment(self, pin)

            return True, message
        return False, "Invalid pickup PIN"

    def verify_delivery_pin(self, pin, courier=None):
        """
        Verify the consumer's delivery PIN and trigger courier payment release.
        Called when courier enters consumer's PIN at delivery.
        """
        from .payment_service import MarketplacePaymentService

        # Check if this is the consumer's PIN (new system)
        if str(self.consumer_delivery_pin) == str(pin) and courier:
            self.delivery_verified = True
            self.delivery_verified_at = timezone.now()
            self.order_status = 'delivered'
            self.delivered_at = timezone.now()
            self.save()

            # Release payment to courier
            success, message, earnings = MarketplacePaymentService.release_courier_payment(self, pin, courier)

            return True, message
        # Legacy support for old delivery_pin field
        elif str(self.delivery_pin) == str(pin):
            self.pin_verified = True
            self.pin_verified_at = timezone.now()
            self.order_status = 'delivered'
            self.delivered_at = timezone.now()
            self.save()
            return True, "Order delivered successfully"
        return False, "Invalid delivery PIN"
    
    def assign_courier(self, courier_profile, earnings):
        """Assign a courier to this order"""
        self.courier = courier_profile
        self.courier_assigned_at = timezone.now()
        self.courier_earnings = earnings
        self.order_status = 'courier_assigned'
        self.save(update_fields=['courier', 'courier_assigned_at', 'courier_earnings', 'order_status'])
    
    def courier_accept(self):
        """Courier accepts the delivery"""
        self.courier_accepted_at = timezone.now()
        self.save()
    
    def mark_picked_up(self):
        """Mark order as picked up by courier"""
        self.order_status = 'picked_up'
        self.generate_delivery_pin()  # Generate PIN when picked up
        self.save()


class OrderReview(models.Model):
    """
    Reviews for completed orders
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(ConsumerOrder, on_delete=models.CASCADE, related_name='review')
    
    # Ratings
    product_rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    delivery_rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True)
    overall_rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    
    # Review content
    review_text = models.TextField(blank=True)
    review_images = models.JSONField(default=list, blank=True)  # Array of image URLs
    
    # Response from business
    business_response = models.TextField(blank=True)
    business_response_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_verified_purchase = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'marketplace_order_reviews'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review for Order {self.order.order_number}"