"""
Business Setup Service
Automatically configures business settings based on type during registration
"""

import logging
from typing import Dict, Any, Optional
from django.db import transaction

from users.models import Business
from .business_types import (
    BusinessCategory,
    InteractionType,
    BUSINESS_TYPE_CONFIG,
    get_business_config
)

logger = logging.getLogger(__name__)


class BusinessSetupService:
    """
    Service to handle business setup and configuration
    Called during business registration/onboarding
    """
    
    @staticmethod
    @transaction.atomic
    def configure_business(business: Business, category: str) -> Business:
        """
        Configure a business based on its category
        Sets up interaction types, features, and default settings
        
        Args:
            business: Business instance to configure
            category: Business category from BusinessCategory enum
        
        Returns:
            Configured Business instance
        """
        try:
            # Get configuration for this business type
            config = get_business_config(category)
            
            if not config:
                logger.warning(f"No configuration found for category: {category}")
                config = BUSINESS_TYPE_CONFIG[BusinessCategory.OTHER.value]
            
            # Set business category
            business.business_category = category
            
            # Set primary interaction type
            primary_interaction = config.get('primary_interaction')
            if primary_interaction:
                business.primary_interaction_type = primary_interaction.value
            
            # Set supported interactions
            supported = config.get('supported_interactions', [])
            business.supported_interactions = [i.value for i in supported]
            
            # Configure interaction settings
            business.interaction_settings = BusinessSetupService._build_interaction_settings(
                category, config
            )
            
            # Mark as auto-configured
            business.auto_configured = True
            
            # Set marketplace category for search
            business.marketplace_category = config.get('display_name', 'Other Business')
            
            # Configure delivery settings if applicable
            if config.get('features', {}).get('delivery'):
                business.delivery_enabled = True
                business.delivery_scope = 'local'  # Default, can be changed by business
            
            # Configure pickup if applicable
            if config.get('features', {}).get('pickup'):
                business.pickup_enabled = True
            
            # Save the business
            business.save()
            
            logger.info(f"Successfully configured business {business.id} as {category}")
            
            # Create default items/services based on type
            BusinessSetupService._create_default_catalog(business, category, config)
            
            return business
            
        except Exception as e:
            logger.error(f"Error configuring business: {str(e)}")
            raise
    
    @staticmethod
    def _build_interaction_settings(category: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build detailed interaction settings for the business
        """
        settings = {}
        
        # Get supported interactions
        supported = config.get('supported_interactions', [])
        
        for interaction in supported:
            interaction_key = interaction.value
            settings[interaction_key] = BusinessSetupService._get_interaction_defaults(
                interaction, category, config
            )
        
        return settings
    
    @staticmethod
    def _get_interaction_defaults(
        interaction: InteractionType, 
        category: str, 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Get default settings for a specific interaction type
        """
        defaults = {
            'enabled': True,
            'status_flow': config.get('status_flow', []),
        }
        
        # Add type-specific defaults
        if interaction == InteractionType.ORDER:
            defaults.update({
                'payment_timing': 'upfront',
                'fulfillment_types': ['delivery', 'pickup'],
                'preparation_time': 30,  # minutes
                'auto_confirm': False,
                'min_order_amount': 0,
            })
            
        elif interaction == InteractionType.BOOKING:
            defaults.update({
                'advance_booking_days': 30,
                'slot_duration': 60,  # minutes
                'buffer_time': 15,  # minutes between bookings
                'cancellation_hours': 24,
                'deposit_required': False,
                'deposit_percentage': 0,
                'max_bookings_per_slot': 1,
                'business_hours': {
                    'monday': {'open': '09:00', 'close': '17:00'},
                    'tuesday': {'open': '09:00', 'close': '17:00'},
                    'wednesday': {'open': '09:00', 'close': '17:00'},
                    'thursday': {'open': '09:00', 'close': '17:00'},
                    'friday': {'open': '09:00', 'close': '17:00'},
                    'saturday': {'open': '10:00', 'close': '14:00'},
                    'sunday': {'closed': True},
                }
            })
            
        elif interaction == InteractionType.RENTAL:
            defaults.update({
                'min_rental_period': 1,  # days
                'max_rental_period': 30,  # days
                'security_deposit_required': True,
                'security_deposit_amount': 100,
                'late_fee_per_day': 25,
                'damage_assessment': True,
            })
            
        elif interaction == InteractionType.SERVICE:
            defaults.update({
                'emergency_available': False,
                'emergency_surcharge': 50,  # percentage
                'response_time_minutes': 120,
                'service_radius_km': 25,
                'quote_required': True,
            })
            
        elif interaction == InteractionType.QUOTE:
            defaults.update({
                'quote_validity_days': 30,
                'revision_allowed': True,
                'max_revisions': 3,
                'deposit_on_acceptance': True,
                'deposit_percentage': 25,
            })
            
        elif interaction == InteractionType.SUBSCRIPTION:
            defaults.update({
                'billing_cycles': ['monthly', 'annual'],
                'free_trial_days': 14,
                'auto_renew': True,
                'proration': True,
                'cancellation_policy': 'end_of_period',
            })
            
        elif interaction == InteractionType.APPLICATION:
            defaults.update({
                'auto_acknowledge': True,
                'review_timeline_days': 7,
                'documents_required': [],
                'interview_required': False,
            })
            
        elif interaction == InteractionType.REGISTRATION:
            defaults.update({
                'early_bird_discount': True,
                'early_bird_days': 30,
                'early_bird_percentage': 10,
                'max_attendees': 100,
                'waitlist_enabled': True,
            })
            
        elif interaction == InteractionType.CONSULTATION:
            defaults.update({
                'consultation_types': ['in_person', 'video', 'phone'],
                'free_consultation_minutes': 15,
                'consultation_fee': 100,
                'follow_up_included': True,
            })
        
        return defaults
    
    @staticmethod
    def _create_default_catalog(business: Business, category: str, config: Dict[str, Any]):
        """
        Create default products/services based on business type
        This helps businesses get started quickly
        """
        # This would create sample products/services
        # Implementation depends on your product/service models
        
        if category == BusinessCategory.RESTAURANT.value:
            # Create sample menu items
            pass
        elif category == BusinessCategory.SALON.value:
            # Create sample services
            pass
        elif category == BusinessCategory.GYM.value:
            # Create membership plans
            pass
        # etc...
    
    @staticmethod
    def update_business_category(business: Business, new_category: str) -> Business:
        """
        Update business category and reconfigure settings
        Used when business wants to change their type
        """
        logger.info(f"Updating business {business.id} from {business.business_category} to {new_category}")
        
        # Store old settings for potential rollback
        old_category = business.business_category
        old_settings = business.interaction_settings.copy()
        
        try:
            # Reconfigure with new category
            business = BusinessSetupService.configure_business(business, new_category)
            
            # Notify business of changes
            # You might want to send an email or notification here
            
            return business
            
        except Exception as e:
            logger.error(f"Failed to update business category: {str(e)}")
            # Rollback
            business.business_category = old_category
            business.interaction_settings = old_settings
            business.save()
            raise
    
    @staticmethod
    def get_available_features(category: str) -> Dict[str, bool]:
        """
        Get available features for a business category
        Used in UI to show/hide features
        """
        config = get_business_config(category)
        return config.get('features', {})
    
    @staticmethod
    def validate_interaction_data(
        business: Business, 
        interaction_type: str, 
        data: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Validate interaction data based on business settings
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if interaction type is supported
        if interaction_type not in business.supported_interactions:
            return False, f"Business does not support {interaction_type}"
        
        # Get settings for this interaction type
        settings = business.interaction_settings.get(interaction_type, {})
        
        if not settings.get('enabled', False):
            return False, f"{interaction_type} is not enabled for this business"
        
        # Type-specific validation
        if interaction_type == InteractionType.ORDER.value:
            min_amount = settings.get('min_order_amount', 0)
            if data.get('total_amount', 0) < min_amount:
                return False, f"Minimum order amount is ${min_amount}"
        
        elif interaction_type == InteractionType.BOOKING.value:
            # Check business hours
            # Check advance booking limits
            # Check slot availability
            pass
        
        # Add more validation as needed
        
        return True, None


def setup_business_on_registration(
    business_name: str,
    business_category: str,
    owner_user,
    **kwargs
) -> Business:
    """
    Helper function to set up a business during registration
    Called from registration/onboarding flow
    """
    # Create business instance
    business = Business.objects.create(
        business_name=business_name,
        owner=owner_user,
        **kwargs
    )
    
    # Configure based on category
    service = BusinessSetupService()
    configured_business = service.configure_business(business, business_category)
    
    return configured_business