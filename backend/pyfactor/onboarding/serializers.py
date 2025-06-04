from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import OnboardingProgress
from users.models import Business, UserProfile
import uuid
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

# Auth0 Attributes Serializer (replaces CognitoAttributeSerializer)
class Auth0AttributeSerializer(serializers.Serializer):
    """Serializer for Auth0 user attributes"""
    subplan = serializers.CharField(max_length=50, required=False, default='free')
    businessid = serializers.CharField(max_length=255, required=False)
    userrole = serializers.CharField(max_length=50, required=False, default='owner')
    acctstatus = serializers.CharField(max_length=50, required=False, default='PENDING')
    attr_version = serializers.CharField(max_length=10, required=False, default='1.0.0')
    onboarding = serializers.CharField(max_length=50, required=False, default='business-info')

    def validate(self, data):
        """Validate Auth0 attribute combinations"""
        onboarding_status = data.get('onboarding', '').lower()
        
        # Normalize onboarding status
        valid_statuses = ['business-info', 'subscription', 'payment', 'setup', 'complete']
        if onboarding_status not in valid_statuses:
            data['onboarding'] = 'business-info'  # Default fallback
        
        return data

class BusinessInfoSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(max_length=200, source='name')
    business_type = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=2)
    legal_structure = serializers.CharField(max_length=50)
    date_founded = serializers.DateField()
    # Auth0 attributes (replaces cognito_attributes)
    auth0_attributes = Auth0AttributeSerializer(write_only=True, required=False)

    class Meta:
        model = Business
        fields = [
            'business_name', 'business_type', 'country',
            'legal_structure', 'date_founded', 'auth0_attributes'
        ]

    def to_representation(self, instance):
        """Handle reading fields from business model"""
        try:
            if hasattr(instance, 'business') and instance.business:
                business = instance.business
                data = {
                    'business_name': business.name,
                    'business_type': business.business_type,
                    'country': business.country,
                    'legal_structure': business.legal_structure,
                    'date_founded': business.date_founded,
                }
            else:
                data = {
                    'business_name': getattr(instance, 'name', None),
                    'business_type': getattr(instance, 'business_type', None),
                    'country': getattr(instance, 'country', None),
                    'legal_structure': getattr(instance, 'legal_structure', None),
                    'date_founded': getattr(instance, 'date_founded', None),
                }
            return data
        except Exception as e:
            logger.error(f"Error in to_representation: {str(e)}")
            return {}
                
    def validate(self, data):
        """Validate all required fields are present"""
        required_fields = ['name', 'business_type', 'country', 'legal_structure', 'date_founded']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError({field: f"{field} is required"})

        # Validate Auth0 attributes if provided
        auth0_data = data.get('auth0_attributes', {})
        if auth0_data:
            auth0_serializer = Auth0AttributeSerializer(data=auth0_data)
            auth0_serializer.is_valid(raise_exception=True)
            data['auth0_attributes'] = auth0_serializer.validated_data

        return data

    def create(self, validated_data):
        user = self.context['request'].user
        auth0_data = validated_data.pop('auth0_attributes', {})
        
        with transaction.atomic():
            # Create/update business
            business, _ = Business.objects.update_or_create(
                owner=user,
                defaults={
                    'name': validated_data['name'],
                    'business_type': validated_data['business_type'],
                    'country': validated_data['country'],
                    'legal_structure': validated_data['legal_structure'],
                    'date_founded': validated_data['date_founded']
                }
            )

            # Create tenant if needed
            from custom_auth.models import Tenant
            
            if not user.tenant:
                schema_name = f"tenant_{user.id}_{uuid.uuid4().hex[:8]}"
                tenant = Tenant.objects.create(
                    owner=user,
                    name=validated_data['name'],
                    schema_name=schema_name,
                    is_active=True
                )

                # Link tenant to user
                user.tenant = tenant
                user.save(update_fields=['tenant'])

            # Determine onboarding status based on plan
            plan = auth0_data.get('subplan', 'free')
            onboarding_status = 'complete' if plan.lower() == 'free' else 'subscription'

            # Update onboarding progress
            progress, _ = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'business': business,
                    'onboarding_status': onboarding_status,
                    'current_step': 'business-info',
                    'next_step': 'complete' if plan.lower() == 'free' else 'subscription',
                    'user_role': auth0_data.get('userrole', 'owner'),
                    'account_status': auth0_data.get('acctstatus', 'PENDING'),
                    'attribute_version': auth0_data.get('attr_version', '1.0.0')
                }
            )

            logger.info(f"Created business and onboarding progress for user {user.email}")
            return progress

    def update(self, instance, validated_data):
        auth0_data = validated_data.pop('auth0_attributes', {})
        
        with transaction.atomic():
            # Update business
            if hasattr(instance, 'business') and instance.business:
                business = instance.business
                business.name = validated_data.get('name', business.name)
                business.business_type = validated_data.get('business_type', business.business_type)
                business.country = validated_data.get('country', business.country)
                business.legal_structure = validated_data.get('legal_structure', business.legal_structure)
                business.date_founded = validated_data.get('date_founded', business.date_founded)
                business.save()
            else:
                # Create new business if none exists
                business = Business.objects.create(
                    owner=instance.user,
                    name=validated_data['name'],
                    business_type=validated_data['business_type'],
                    country=validated_data['country'],
                    legal_structure=validated_data['legal_structure'],
                    date_founded=validated_data['date_founded']
                )
                instance.business = business

            # Update progress with Auth0 attributes if provided
            if auth0_data:
                plan = auth0_data.get('subplan', '')
                if plan.lower() == 'free':
                    instance.onboarding_status = 'complete'
                    instance.next_step = 'complete'
                else:
                    instance.onboarding_status = 'subscription'
                    instance.next_step = 'subscription'
                    
                instance.user_role = auth0_data.get('userrole', instance.user_role)
                instance.account_status = auth0_data.get('acctstatus', instance.account_status)
                instance.attribute_version = auth0_data.get('attr_version', instance.attribute_version)

            instance.save()
            logger.info(f"Updated business and onboarding progress for user {instance.user.email}")
            return instance

class OnboardingProgressSerializer(serializers.ModelSerializer):
    # Auth0 attributes (replaces cognito_attributes)
    auth0_attributes = Auth0AttributeSerializer(required=False)

    class Meta:
        model = OnboardingProgress
        fields = '__all__'

    def validate(self, data):
        """Validate onboarding progress data"""
        if 'auth0_attributes' in data:
            auth0_serializer = Auth0AttributeSerializer(data=data['auth0_attributes'])
            auth0_serializer.is_valid(raise_exception=True)
            data['auth0_attributes'] = auth0_serializer.validated_data

        return data
