"""
Session Serializers
DRF serializers for session data
"""

from rest_framework import serializers
from .models import UserSession, SessionEvent
import logging

logger = logging.getLogger(__name__)


class SessionSerializer(serializers.ModelSerializer):
    """
    Full session serializer for responses
    """
    user = serializers.SerializerMethodField()
    tenant = serializers.SerializerMethodField()
    session_token = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSession
        fields = [
            'session_token',
            'user',
            'tenant',
            'needs_onboarding',
            'onboarding_completed',
            'onboarding_step',
            'subscription_plan',
            'subscription_status',
            'session_data',
            'is_active',
            'created_at',
            'updated_at',
            'last_activity',
            'expires_at',
            'session_type'
        ]
        read_only_fields = [
            'session_token',
            'user',
            'tenant',
            'created_at',
            'updated_at',
            'last_activity'
        ]
    
    def get_session_token(self, obj):
        """Return session ID as token"""
        return str(obj.session_id)
    
    def get_user(self, obj):
        """Return user information including business details"""
        user_data = {
            'id': obj.user.id,
            'email': obj.user.email,
            'name': getattr(obj.user, 'name', ''),
            'given_name': getattr(obj.user, 'given_name', getattr(obj.user, 'first_name', '')),
            'family_name': getattr(obj.user, 'family_name', getattr(obj.user, 'last_name', '')),
            'picture': getattr(obj.user, 'picture', ''),
            'subscription_plan': getattr(obj.user, 'subscription_plan', 'free'),
            'tenantId': str(obj.tenant.id) if obj.tenant else None,
            'tenant_id': str(obj.tenant.id) if obj.tenant else None
        }
        
        # Include business information from OnboardingProgress if available
        try:
            from onboarding.models import OnboardingProgress
            onboarding = OnboardingProgress.objects.filter(user=obj.user).first()
            if onboarding:
                # Get business name from the related Business object
                if onboarding.business and onboarding.business.name:
                    user_data['business_name'] = onboarding.business.name
                    user_data['businessName'] = onboarding.business.name  # Both formats for compatibility
                
                # Get business type from BusinessDetails
                if onboarding.business:
                    business_type = onboarding.business.business_type
                    if business_type:
                        user_data['business_type'] = business_type
                        user_data['businessType'] = business_type
                
                # Include full onboarding progress data
                user_data['onboardingProgress'] = {
                    'businessName': onboarding.business.name if onboarding.business else None,
                    'businessType': onboarding.business.business_type if onboarding.business else None,
                    'country': onboarding.country,
                    'legalStructure': onboarding.legal_structure,
                    'dateFounded': onboarding.date_founded.isoformat() if onboarding.date_founded else None,
                    'currentStep': onboarding.current_step,
                    'onboardingStatus': onboarding.onboarding_status
                }
        except Exception as e:
            # Don't fail if onboarding info is not available
            logger.debug(f"Could not fetch onboarding info: {e}")
            pass
            
        return user_data
    
    def get_tenant(self, obj):
        """Return tenant information"""
        if obj.tenant:
            from django.core.cache import cache
            
            # Try cache first
            cache_key = f"business_name_{obj.user.id}"
            business_name = cache.get(cache_key)
            
            if business_name is None:
                # Try to get the actual business name from multiple sources
                business_name = obj.tenant.name  # Default to tenant name
                try:
                    from onboarding.models import OnboardingProgress
                    from users.models import Business
                    
                    # First try OnboardingProgress
                    onboarding = OnboardingProgress.objects.filter(user=obj.user).first()
                    if onboarding and onboarding.business and onboarding.business.name:
                        business_name = onboarding.business.name
                        logger.debug(f"[SessionSerializer] Using business name from OnboardingProgress: {business_name}")
                    else:
                        # Try direct Business lookup
                        business = Business.objects.filter(owner=obj.user).first()
                        if business and business.name:
                            business_name = business.name
                            logger.debug(f"[SessionSerializer] Using business name from Business model: {business_name}")
                        else:
                            # Check if tenant name has been updated from default
                            if obj.tenant.name and not obj.tenant.name.startswith("Tenant for"):
                                business_name = obj.tenant.name
                                logger.debug(f"[SessionSerializer] Using updated tenant name: {business_name}")
                    
                    # Cache the business name for 5 minutes
                    cache.set(cache_key, business_name, 300)
                except Exception as e:
                    logger.debug(f"[SessionSerializer] Could not fetch business name: {e}")
            else:
                logger.debug(f"[SessionSerializer] Using cached business name: {business_name}")
            
            return {
                'id': str(obj.tenant.id),
                'name': business_name,  # Use the actual business name
                'business_name': business_name,  # Use the actual business name
                'subscription_plan': obj.user.subscription_plan if hasattr(obj.user, 'subscription_plan') else obj.subscription_plan
            }
        return None


class SessionCreateSerializer(serializers.Serializer):
    """
    Serializer for session creation
    """
    needs_onboarding = serializers.BooleanField(required=False, default=True)
    onboarding_completed = serializers.BooleanField(required=False, default=False)
    onboarding_step = serializers.CharField(required=False, default='business_info')
    subscription_plan = serializers.CharField(required=False, default='free')
    subscription_status = serializers.CharField(required=False, default='active')
    session_type = serializers.ChoiceField(
        choices=['web', 'mobile', 'api'],
        required=False,
        default='web'
    )
    session_data = serializers.DictField(required=False, default=dict)


class SessionUpdateSerializer(serializers.Serializer):
    """
    Serializer for session updates
    """
    needs_onboarding = serializers.BooleanField(required=False)
    onboarding_completed = serializers.BooleanField(required=False)
    onboarding_step = serializers.CharField(required=False)
    subscription_plan = serializers.CharField(required=False)
    subscription_status = serializers.CharField(required=False)
    session_data = serializers.DictField(required=False)
    
    def validate_session_data(self, value):
        """Validate session data is JSON serializable"""
        import json
        try:
            json.dumps(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Session data must be JSON serializable")
        return value


class SessionEventSerializer(serializers.ModelSerializer):
    """
    Serializer for session events
    """
    class Meta:
        model = SessionEvent
        fields = [
            'id',
            'session',
            'event_type',
            'event_data',
            'ip_address',
            'user_agent',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']