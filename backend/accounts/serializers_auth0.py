# Auth0 Serializers
from rest_framework import serializers
from .models_auth0 import Auth0User, Tenant, UserTenantRole, OnboardingProgress

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'business_type', 'country', 'business_state',
            'subscription_plan', 'subscription_status', 'onboarding_completed',
            'onboarding_step', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class Auth0UserSerializer(serializers.ModelSerializer):
    current_tenant = TenantSerializer(read_only=True)
    
    class Meta:
        model = Auth0User
        fields = [
            'id', 'auth0_id', 'email', 'name', 'picture',
            'current_tenant', 'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'auth0_id', 'created_at']

class UserTenantRoleSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)
    
    class Meta:
        model = UserTenantRole
        fields = ['tenant', 'role', 'joined_at']

class OnboardingProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnboardingProgress
        fields = [
            'business_info_completed', 'subscription_selected',
            'payment_completed', 'setup_completed', 'started_at'
        ]

class UserProfileSerializer(serializers.Serializer):
    """Combined user profile with tenant info"""
    user = Auth0UserSerializer()
    tenant = TenantSerializer()
    role = serializers.CharField()
    onboarding = OnboardingProgressSerializer()
    
class BusinessInfoSerializer(serializers.Serializer):
    """Serializer for business info submission"""
    businessName = serializers.CharField(max_length=255, source='business_name')
    businessType = serializers.CharField(max_length=100, source='business_type')
    businessSubtypeSelections = serializers.JSONField(required=False, source='business_subtypes')
    country = serializers.CharField(max_length=2)
    businessState = serializers.CharField(max_length=100, required=False, allow_blank=True, source='business_state')
    legalStructure = serializers.CharField(max_length=100, source='legal_structure')
    dateFounded = serializers.DateField(source='date_founded')
    firstName = serializers.CharField(max_length=50, source='first_name')
    lastName = serializers.CharField(max_length=50, source='last_name')
    industry = serializers.CharField(max_length=100, required=False)
    address = serializers.CharField(required=False, allow_blank=True)
    phoneNumber = serializers.CharField(max_length=20, required=False, allow_blank=True, source='phone_number')
    taxId = serializers.CharField(max_length=50, required=False, allow_blank=True, source='tax_id')
    
class SubscriptionSerializer(serializers.Serializer):
    """Serializer for subscription selection"""
    selected_plan = serializers.ChoiceField(
        choices=['free', 'professional', 'enterprise'],
        source='plan'
    )
    billingCycle = serializers.ChoiceField(
        choices=['monthly', 'annual'], 
        source='billing_interval',
        default='monthly'
    )
    tenant_id = serializers.UUIDField(required=False)