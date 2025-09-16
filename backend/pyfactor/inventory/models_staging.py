"""
Staging models for global product catalog moderation
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class StoreItemStaging(models.Model):
    """
    Staging table for products awaiting review before adding to global catalog
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('duplicate', 'Duplicate'),
        ('flagged', 'Flagged for Manual Review'),
        ('auto_approved', 'Auto-Approved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Product Information
    barcode = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    size = models.CharField(max_length=100, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    # Image fields (using Cloudinary)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    image_public_id = models.CharField(max_length=255, blank=True, null=True)
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)

    # Submission metadata
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='staging_submissions')
    submitted_by_business_name = models.CharField(max_length=255)
    submission_date = models.DateTimeField(default=timezone.now)
    submission_count = models.IntegerField(default=1)

    # Review metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_staging_items')
    review_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)

    # Confidence scoring
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('1.00'))]
    )
    data_consistency_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('1.00'))]
    )

    # Image moderation scores (from AI)
    image_moderation_scores = models.JSONField(blank=True, null=True, default=dict)
    image_is_safe = models.BooleanField(default=True)

    # Link to approved item
    approved_store_item = models.ForeignKey(
        'StoreItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staging_origin'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-confidence_score', '-submission_count', '-submission_date']
        verbose_name = 'Store Item (Staging)'
        verbose_name_plural = 'Store Items (Staging)'
        indexes = [
            models.Index(fields=['status', 'confidence_score']),
            models.Index(fields=['barcode']),
            models.Index(fields=['submission_date']),
        ]

    def __str__(self):
        return f"{self.name} ({self.barcode}) - {self.status}"

    def calculate_confidence_score(self):
        """Calculate confidence score based on various factors"""
        score = Decimal('0.00')

        # Multiple submissions boost confidence
        if self.submission_count >= 5:
            score += Decimal('0.40')
        elif self.submission_count >= 3:
            score += Decimal('0.30')
        elif self.submission_count >= 2:
            score += Decimal('0.20')
        else:
            score += Decimal('0.10')

        # Data completeness
        if self.brand:
            score += Decimal('0.10')
        if self.category:
            score += Decimal('0.10')
        if self.size:
            score += Decimal('0.05')
        if self.unit:
            score += Decimal('0.05')
        if self.description:
            score += Decimal('0.10')
        if self.image_url and self.image_is_safe:
            score += Decimal('0.20')

        # Cap at 1.00
        self.confidence_score = min(score, Decimal('1.00'))
        return self.confidence_score

    def can_auto_approve(self):
        """Check if item meets auto-approval criteria"""
        # Must have minimum submissions
        if self.submission_count < 3:
            return False, "Insufficient submissions (minimum 3 required)"

        # Must have high confidence
        if self.confidence_score < Decimal('0.80'):
            return False, f"Confidence score too low ({self.confidence_score})"

        # Must have been in staging for at least 24 hours
        time_in_staging = timezone.now() - self.submission_date
        if time_in_staging.total_seconds() < 86400:  # 24 hours
            return False, "Less than 24 hours in staging"

        # Data consistency must be high
        if self.data_consistency_score < Decimal('0.80'):
            return False, f"Data consistency too low ({self.data_consistency_score})"

        # Image must be safe if provided
        if self.image_url and not self.image_is_safe:
            return False, "Image flagged as inappropriate"

        return True, "Meets all auto-approval criteria"

    def approve(self, user=None, auto=False):
        """Approve and move to global catalog"""
        from .models_storeitems import StoreItem

        # Create or update StoreItem
        store_item, created = StoreItem.objects.update_or_create(
            barcode=self.barcode,
            defaults={
                'name': self.name,
                'brand': self.brand,
                'category': self.category,
                'size': self.size,
                'unit': self.unit,
                'description': self.description,
                'image_url': self.image_url,
                'thumbnail_url': self.thumbnail_url,
                'is_verified': self.submission_count >= 3,
                'verified_count': self.submission_count,
            }
        )

        # Update staging record
        self.status = 'auto_approved' if auto else 'approved'
        self.reviewed_by = user
        self.review_date = timezone.now()
        self.approved_store_item = store_item
        self.save()

        return store_item


class StageSubmission(models.Model):
    """
    Track individual submissions for staging items
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staging_item = models.ForeignKey(StoreItemStaging, on_delete=models.CASCADE, related_name='submissions')

    # Submitter info
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    business_name = models.CharField(max_length=255)
    tenant_id = models.CharField(max_length=50, blank=True, null=True)

    # Submitted data (to track variations)
    submitted_data = models.JSONField()
    submitted_name = models.CharField(max_length=255)
    submitted_brand = models.CharField(max_length=255, blank=True, null=True)
    submitted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Metadata
    submitted_at = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Stage Submission'
        verbose_name_plural = 'Stage Submissions'

    def __str__(self):
        return f"{self.business_name} - {self.staging_item.barcode} - {self.submitted_at}"


class FlaggedImage(models.Model):
    """
    Track images flagged as inappropriate
    """
    REASON_CHOICES = [
        ('adult', 'Adult Content'),
        ('violence', 'Violence'),
        ('medical', 'Medical/Graphic'),
        ('spam', 'Spam/Irrelevant'),
        ('copyright', 'Copyright Violation'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.URLField(max_length=500)
    image_hash = models.CharField(max_length=64, unique=True, db_index=True)

    # Related product
    staging_item = models.ForeignKey(StoreItemStaging, on_delete=models.SET_NULL, null=True, blank=True)
    product_barcode = models.CharField(max_length=100, blank=True, null=True)

    # Flagging details
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    ai_moderation_scores = models.JSONField(blank=True, null=True)
    flagged_by_ai = models.BooleanField(default=True)

    # User who uploaded
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(default=timezone.now)

    # Review
    reviewed = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_flagged_images')
    review_date = models.DateTimeField(null=True, blank=True)
    review_action = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Flagged Image'
        verbose_name_plural = 'Flagged Images'

    def __str__(self):
        return f"Flagged: {self.reason} - {self.product_barcode or 'Unknown'}"


class ModeratorAction(models.Model):
    """
    Audit trail for moderator actions
    """
    ACTION_CHOICES = [
        ('approve', 'Approved Item'),
        ('reject', 'Rejected Item'),
        ('flag', 'Flagged Item'),
        ('unflag', 'Unflagged Item'),
        ('ban_user', 'Banned User'),
        ('unban_user', 'Unbanned User'),
        ('delete', 'Deleted Item'),
        ('edit', 'Edited Item'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who did what
    moderator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)

    # What was acted upon
    staging_item = models.ForeignKey(StoreItemStaging, on_delete=models.SET_NULL, null=True, blank=True)
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderation_targets')

    # Details
    reason = models.TextField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True, default=dict)

    # When
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Moderator Action'
        verbose_name_plural = 'Moderator Actions'

    def __str__(self):
        return f"{self.moderator} - {self.action} - {self.timestamp}"