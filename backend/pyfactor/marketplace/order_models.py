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
    
    # Delivery PIN verification
    delivery_pin = models.CharField(max_length=4, blank=True, 
                                   help_text='4-digit PIN for delivery verification')
    pin_generated_at = models.DateTimeField(null=True, blank=True)
    pin_verified = models.BooleanField(default=False)
    pin_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Order details
    items = models.JSONField(default=dict)  # Array of {product_id, name, quantity, price}
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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
        if not self.order_number:
            # Generate order number
            import random
            import string
            prefix = 'ORD'
            suffix = ''.join(random.choices(string.digits, k=8))
            self.order_number = f"{prefix}{suffix}"
        
        super().save(*args, **kwargs)
    
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
    
    def generate_delivery_pin(self):
        """Generate a 4-digit PIN for delivery verification"""
        import random
        self.delivery_pin = str(random.randint(1000, 9999))
        self.pin_generated_at = timezone.now()
        self.pin_verified = False
        self.save()
        return self.delivery_pin
    
    def verify_delivery_pin(self, pin):
        """Verify the delivery PIN"""
        if self.delivery_pin == str(pin):
            self.pin_verified = True
            self.pin_verified_at = timezone.now()
            self.order_status = 'delivered'
            self.delivered_at = timezone.now()
            self.save()
            return True
        return False
    
    def assign_courier(self, courier_profile, earnings):
        """Assign a courier to this order"""
        self.courier = courier_profile
        self.courier_assigned_at = timezone.now()
        self.courier_earnings = earnings
        self.order_status = 'courier_assigned'
        self.save()
    
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