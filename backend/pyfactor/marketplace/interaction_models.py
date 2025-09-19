"""
Unified Business Interaction Models
Handles ALL types of business-consumer interactions
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.postgres.fields import JSONField
import uuid
from decimal import Decimal
from typing import Dict, Any, Optional

from .business_types import (
    InteractionType, 
    BusinessCategory,
    get_business_config,
    get_interaction_fields,
    get_status_transitions
)

User = get_user_model()


class BusinessInteraction(models.Model):
    """
    Universal model for ALL business-consumer interactions
    (Orders, Bookings, Rentals, Services, Quotes, etc.)
    """
    
    # Unique identifier
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=20, unique=True, db_index=True)
    
    # Interaction type
    interaction_type = models.CharField(
        max_length=20,
        choices=[(t.value, t.name) for t in InteractionType],
        db_index=True
    )
    
    # Parties involved
    consumer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='consumer_interactions'
    )
    business = models.ForeignKey(
        'users.Business',  # Assuming Business model is in users app
        on_delete=models.CASCADE, 
        related_name='business_interactions'
    )
    
    # Staff member (for bookings, services)
    staff_member = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_interactions'
    )
    
    # Universal Status (validated based on interaction_type)
    status = models.CharField(max_length=30, default='pending', db_index=True)
    
    # Timeline fields (universal across all types)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # When does this interaction start/end?
    start_datetime = models.DateTimeField(null=True, blank=True, db_index=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    
    # Duration (for bookings, rentals, services)
    duration_minutes = models.IntegerField(null=True, blank=True)
    
    # Location fields
    location_type = models.CharField(
        max_length=20,
        choices=[
            ('online', 'Online'),
            ('business', 'At Business Location'),
            ('customer', 'At Customer Location'),
            ('other', 'Other Location'),
        ],
        default='business'
    )
    location_address = models.TextField(blank=True)
    location_coordinates = JSONField(default=dict, blank=True)  # {"lat": 0, "lng": 0}
    
    # Financial fields
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Payment tracking
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('partial', 'Partially Paid'),
            ('paid', 'Paid'),
            ('failed', 'Failed'),
            ('refunded', 'Refunded'),
        ],
        default='pending',
        db_index=True
    )
    payment_method = models.CharField(max_length=30, blank=True)
    payment_intent_id = models.CharField(max_length=200, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Items/Services (flexible JSON storage)
    items = JSONField(default=list)  # Array of items/services/slots
    """
    Example structures:
    ORDER: [{"product_id": "123", "name": "Pizza", "quantity": 2, "price": 15.99}]
    BOOKING: [{"service_id": "456", "name": "Haircut", "duration": 30, "price": 25.00}]
    RENTAL: [{"item_id": "789", "name": "Toyota Camry", "days": 3, "daily_rate": 50.00}]
    """
    
    # Metadata (type-specific fields)
    metadata = JSONField(default=dict)
    """
    Stores type-specific data like:
    - ORDER: delivery_instructions, kitchen_notes
    - BOOKING: preferred_stylist, special_requests
    - RENTAL: insurance_opted, mileage_limit
    - SERVICE: urgency_level, problem_description
    - QUOTE: project_scope, budget_range
    """
    
    # Customer details
    customer_name = models.CharField(max_length=100, blank=True)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_notes = models.TextField(blank=True)
    
    # Delivery/Service address (if different from customer)
    service_address = models.TextField(blank=True)
    service_coordinates = JSONField(default=dict, blank=True)
    
    # Ratings and feedback
    consumer_rating = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    consumer_review = models.TextField(blank=True)
    business_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    business_notes = models.TextField(blank=True)
    
    # Cancellation
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_interactions'
    )
    cancellation_reason = models.TextField(blank=True)
    cancellation_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    
    # Refund tracking
    refunded_at = models.DateTimeField(null=True, blank=True)
    refund_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    refund_reason = models.TextField(blank=True)
    
    # Completion tracking
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Chat/Communication linkage
    chat_conversation_id = models.UUIDField(null=True, blank=True)
    created_from_chat = models.BooleanField(default=False)
    
    # Recurring/Subscription fields
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(
        max_length=20,
        choices=[
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('biweekly', 'Bi-weekly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
        ],
        blank=True
    )
    parent_interaction = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_interactions'
    )
    
    # Platform fees
    platform_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    
    class Meta:
        db_table = 'marketplace_business_interactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['consumer', '-created_at']),
            models.Index(fields=['business', '-created_at']),
            models.Index(fields=['interaction_type', 'status']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['start_datetime', 'end_datetime']),
            models.Index(fields=['payment_status']),
        ]
    
    def __str__(self):
        return f"{self.get_interaction_type_display()} {self.reference_number}"
    
    def save(self, *args, **kwargs):
        """Generate reference number and validate status"""
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        
        # Validate status based on interaction type
        self.validate_status()
        
        # Calculate total amount
        self.calculate_total()
        
        super().save(*args, **kwargs)
    
    def generate_reference_number(self) -> str:
        """Generate unique reference number based on type"""
        import random
        import string
        
        prefix_map = {
            InteractionType.ORDER.value: 'ORD',
            InteractionType.BOOKING.value: 'BKG',
            InteractionType.RENTAL.value: 'RNT',
            InteractionType.SERVICE.value: 'SRV',
            InteractionType.QUOTE.value: 'QTE',
            InteractionType.SUBSCRIPTION.value: 'SUB',
            InteractionType.APPLICATION.value: 'APP',
            InteractionType.REGISTRATION.value: 'REG',
            InteractionType.CONSULTATION.value: 'CNS',
        }
        
        prefix = prefix_map.get(self.interaction_type, 'INT')
        suffix = ''.join(random.choices(string.digits, k=8))
        return f"{prefix}{suffix}"
    
    def validate_status(self):
        """Validate status based on interaction type"""
        config = get_business_config(self.business.business_type)
        valid_statuses = config.get('status_flow', [])
        
        if valid_statuses and self.status not in valid_statuses:
            # Set to first status in flow
            self.status = valid_statuses[0] if valid_statuses else 'pending'
    
    def calculate_total(self):
        """Calculate total amount"""
        self.total_amount = (
            self.subtotal + 
            self.tax_amount + 
            self.service_fee + 
            self.delivery_fee - 
            self.discount_amount
        )
    
    def can_transition_to(self, new_status: str) -> bool:
        """Check if status transition is valid"""
        transitions = get_status_transitions(InteractionType(self.interaction_type))
        current_transitions = transitions.get(self.status, [])
        return new_status in current_transitions
    
    def transition_to(self, new_status: str) -> bool:
        """Transition to new status if valid"""
        if self.can_transition_to(new_status):
            self.status = new_status
            
            # Update relevant timestamps
            if new_status == 'completed':
                self.completed_at = timezone.now()
            elif new_status == 'cancelled':
                self.cancelled_at = timezone.now()
            
            self.save()
            return True
        return False
    
    def get_timeline_display(self) -> str:
        """Get human-readable timeline"""
        if self.interaction_type == InteractionType.ORDER.value:
            return f"Order placed {self.created_at.strftime('%b %d, %Y')}"
        elif self.interaction_type == InteractionType.BOOKING.value:
            if self.start_datetime:
                return f"Scheduled for {self.start_datetime.strftime('%b %d, %Y at %I:%M %p')}"
        elif self.interaction_type == InteractionType.RENTAL.value:
            if self.start_datetime and self.end_datetime:
                return f"From {self.start_datetime.strftime('%b %d')} to {self.end_datetime.strftime('%b %d, %Y')}"
        return f"Created {self.created_at.strftime('%b %d, %Y')}"
    
    def get_duration_display(self) -> str:
        """Get human-readable duration"""
        if self.duration_minutes:
            hours = self.duration_minutes // 60
            minutes = self.duration_minutes % 60
            if hours > 0:
                return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
            return f"{minutes}m"
        elif self.start_datetime and self.end_datetime:
            delta = self.end_datetime - self.start_datetime
            days = delta.days
            if days > 0:
                return f"{days} day{'s' if days > 1 else ''}"
        return ""
    
    def calculate_platform_fee(self) -> Decimal:
        """Calculate platform fee based on type and amount"""
        # Platform fee: 10% for all marketplace transactions
        percentage_fee = self.total_amount * Decimal('0.10')  # 10%

        # No additional fixed fee for marketplace orders
        # The 10% covers the platform's service

        self.platform_fee = percentage_fee
        return self.platform_fee
    
    @property
    def is_active(self) -> bool:
        """Check if interaction is currently active"""
        active_statuses = ['confirmed', 'in_progress', 'preparing', 'active']
        return self.status in active_statuses
    
    @property
    def is_completed(self) -> bool:
        """Check if interaction is completed"""
        return self.status == 'completed' or self.completed_at is not None
    
    @property
    def is_cancelled(self) -> bool:
        """Check if interaction is cancelled"""
        return self.status == 'cancelled' or self.cancelled_at is not None
    
    @property
    def requires_payment(self) -> bool:
        """Check if payment is required"""
        return self.total_amount > 0 and self.payment_status != 'paid'
    
    @property
    def can_be_cancelled(self) -> bool:
        """Check if interaction can be cancelled"""
        non_cancellable = ['completed', 'cancelled', 'refunded']
        return self.status not in non_cancellable
    
    @property
    def can_be_rated(self) -> bool:
        """Check if interaction can be rated"""
        return self.is_completed and not self.consumer_rating


class InteractionStatusHistory(models.Model):
    """Track status changes for audit trail"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interaction = models.ForeignKey(
        BusinessInteraction,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'marketplace_interaction_status_history'
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.interaction.reference_number}: {self.from_status} → {self.to_status}"


class InteractionDocument(models.Model):
    """Documents attached to interactions"""
    
    DOCUMENT_TYPES = [
        ('contract', 'Contract'),
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('photo', 'Photo'),
        ('id', 'ID Document'),
        ('insurance', 'Insurance'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interaction = models.ForeignKey(
        BusinessInteraction,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file_url = models.URLField()
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'marketplace_interaction_documents'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.document_type}: {self.file_name}"