"""
Service for handling product staging submissions
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Avg
import hashlib
import json
from difflib import SequenceMatcher

from ..models_staging import StoreItemStaging, StageSubmission, ModeratorAction
from ..models_storeitems import StoreItem


class StagingService:
    """Handle staging submissions and confidence scoring"""

    @staticmethod
    def submit_to_staging(product_data, user, request=None):
        """
        Submit a product to staging if it doesn't exist in global catalog

        Args:
            product_data: Dict containing product information
            user: User object submitting the product
            request: Optional request object for IP/user agent

        Returns:
            tuple: (staging_item, created, contributed_to_catalog)
        """
        barcode = product_data.get('barcode_number')

        if not barcode:
            return None, False, False

        # Check if already in global catalog
        if StoreItem.objects.filter(barcode=barcode).exists():
            return None, False, False

        # Check if already in staging
        staging_item, created = StoreItemStaging.objects.get_or_create(
            barcode=barcode,
            defaults={
                'name': product_data.get('name', ''),
                'brand': StagingService._extract_brand(product_data.get('name', '')),
                'category': StagingService._guess_category(product_data),
                'size': product_data.get('size', ''),
                'unit': product_data.get('unit', ''),
                'description': product_data.get('description', ''),
                'submitted_by': user,
                'submitted_by_business_name': getattr(user, 'business_name', user.username),
            }
        )

        if not created:
            # Increment submission count
            staging_item.submission_count += 1
            staging_item.save()

            # Update data consistency score
            StagingService._update_consistency_score(staging_item, product_data)

        # Record the submission
        submission = StageSubmission.objects.create(
            staging_item=staging_item,
            user=user,
            business_name=getattr(user, 'business_name', user.username),
            tenant_id=product_data.get('tenant_id'),
            submitted_data=product_data,
            submitted_name=product_data.get('name', ''),
            submitted_brand=product_data.get('brand', ''),
            submitted_price=product_data.get('price'),
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT') if request else None,
        )

        # Recalculate confidence score
        staging_item.calculate_confidence_score()
        staging_item.save()

        # Check if eligible for auto-approval
        StagingService._check_auto_approval(staging_item)

        return staging_item, created, True

    @staticmethod
    def _extract_brand(product_name):
        """Extract potential brand from product name"""
        # Common brand patterns
        common_brands = [
            'Coca-Cola', 'Pepsi', 'Nestle', 'Unilever', 'P&G',
            'Colgate', 'Dove', 'Axe', 'Lipton', 'Knorr',
            'Samsung', 'Apple', 'Sony', 'LG', 'Philips',
        ]

        name_lower = product_name.lower()
        for brand in common_brands:
            if brand.lower() in name_lower:
                return brand

        # Extract first word as potential brand
        words = product_name.split()
        if words and len(words[0]) > 2:
            return words[0]

        return None

    @staticmethod
    def _guess_category(product_data):
        """Guess category based on product name and other fields"""
        name = product_data.get('name', '').lower()
        description = product_data.get('description', '').lower()

        category_keywords = {
            'beverages': ['drink', 'juice', 'soda', 'water', 'cola', 'tea', 'coffee'],
            'food': ['food', 'snack', 'chips', 'biscuit', 'cookie', 'chocolate'],
            'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
            'personal_care': ['soap', 'shampoo', 'toothpaste', 'deodorant', 'lotion'],
            'household': ['detergent', 'cleaner', 'tissue', 'paper', 'towel'],
            'electronics': ['phone', 'laptop', 'tablet', 'computer', 'cable', 'charger'],
        }

        for category, keywords in category_keywords.items():
            for keyword in keywords:
                if keyword in name or keyword in description:
                    return category

        return 'other'

    @staticmethod
    def _update_consistency_score(staging_item, new_data):
        """Update data consistency score based on new submission"""
        submissions = StageSubmission.objects.filter(staging_item=staging_item)

        if submissions.count() < 2:
            staging_item.data_consistency_score = Decimal('1.00')
            return

        # Calculate name similarity
        names = [s.submitted_name for s in submissions]
        names.append(new_data.get('name', ''))

        total_similarity = 0
        comparisons = 0

        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                similarity = SequenceMatcher(None, names[i].lower(), names[j].lower()).ratio()
                total_similarity += similarity
                comparisons += 1

        if comparisons > 0:
            avg_similarity = total_similarity / comparisons
            staging_item.data_consistency_score = Decimal(str(round(avg_similarity, 2)))
        else:
            staging_item.data_consistency_score = Decimal('1.00')

    @staticmethod
    def _check_auto_approval(staging_item):
        """Check if item is eligible for auto-approval"""
        can_approve, reason = staging_item.can_auto_approve()

        if can_approve:
            # Auto-approve the item
            store_item = staging_item.approve(auto=True)

            # Log the auto-approval
            ModeratorAction.objects.create(
                moderator=None,  # System action
                action='approve',
                staging_item=staging_item,
                reason=f'Auto-approved: {reason}'
            )

            return store_item

        return None

    @staticmethod
    def get_staging_status(barcode):
        """Get the staging status of a barcode"""
        try:
            staging_item = StoreItemStaging.objects.get(barcode=barcode)
            return {
                'status': staging_item.status,
                'submission_count': staging_item.submission_count,
                'confidence_score': float(staging_item.confidence_score),
                'can_auto_approve': staging_item.can_auto_approve()[0],
            }
        except StoreItemStaging.DoesNotExist:
            return None

    @staticmethod
    def calculate_user_trust_score(user):
        """Calculate trust score for a user based on their submission history"""
        # Get user's submission history
        submissions = StageSubmission.objects.filter(user=user)

        if not submissions:
            return Decimal('0.50')  # Base score for new users

        # Count approved vs rejected submissions
        approved_count = submissions.filter(
            staging_item__status__in=['approved', 'auto_approved']
        ).count()

        rejected_count = submissions.filter(
            staging_item__status='rejected'
        ).count()

        total_count = submissions.count()

        if total_count == 0:
            return Decimal('0.50')

        # Calculate approval ratio
        approval_ratio = approved_count / total_count

        # Adjust for submission volume
        volume_bonus = min(total_count / 100, 0.2)  # Max 0.2 bonus for 20+ submissions

        # Calculate final score
        trust_score = Decimal(str(approval_ratio * 0.8 + volume_bonus))

        # Cap at 1.0
        return min(trust_score, Decimal('1.00'))