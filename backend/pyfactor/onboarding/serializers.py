from rest_framework import serializers
from .models import OnboardingProgress
from users.models import Business
from django.utils import timezone
from users.choices import BUSINESS_TYPES, LEGAL_STRUCTURE_CHOICES
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class CognitoAttributeSerializer(serializers.Serializer):
    """Serializer for Cognito custom attributes"""
    onboarding = serializers.CharField()  # Change to CharField to accept any case
    userrole = serializers.ChoiceField(choices=OnboardingProgress.USER_ROLE_CHOICES)
    acctstatus = serializers.ChoiceField(choices=OnboardingProgress.ACCOUNT_STATUS_CHOICES)
    subplan = serializers.ChoiceField(choices=OnboardingProgress.PLAN_CHOICES)
    businessid = serializers.CharField(required=False, allow_null=True)
    lastlogin = serializers.DateTimeField(required=False)
    preferences = serializers.JSONField(required=False)
    attr_version = serializers.CharField(required=False)

    def validate(self, data):
        """Validate attribute combinations based on onboarding state"""
        onboarding_status = data.get('onboarding', '').upper()
        
        # Handle lowercase values for onboarding states
        lowercase_status_mapping = {
            'complete': 'COMPLETE',
            'subscription': 'SUBSCRIPTION',
            'payment': 'PAYMENT',
            'setup': 'SETUP'
        }
        
        # Preserve the original lowercase values for frontend compatibility
        original_value = data.get('onboarding', '')
        if original_value.lower() in lowercase_status_mapping:
            onboarding_status = lowercase_status_mapping[original_value.lower()]
            # Preserve the original lowercase value in the data
            data['onboarding'] = original_value.lower()
        
        # Validate onboarding status is a valid choice
        valid_statuses = [choice[0] for choice in OnboardingProgress.ONBOARDING_STATUS_CHOICES]
        if onboarding_status not in valid_statuses:
            raise serializers.ValidationError(f"Invalid onboarding status: {onboarding_status}")
        
        if onboarding_status == 'BUSINESS_INFO' and not data.get('businessid'):
            raise serializers.ValidationError("Business ID required for BUSINESS_INFO state")
        
        if onboarding_status == 'COMPLETE':
            required_fields = ['businessid', 'subplan', 'acctstatus']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise serializers.ValidationError(f"Missing required fields for COMPLETE state: {', '.join(missing_fields)}")
        
        return data


class BusinessInfoSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(max_length=200)
    business_type = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=2)
    legal_structure = serializers.CharField(max_length=50)
    date_founded = serializers.DateField()
    cognito_attributes = CognitoAttributeSerializer(write_only=True, required=False)

    class Meta:
        model = OnboardingProgress
        fields = [
            'business_name', 'business_type', 'country',
            'legal_structure', 'date_founded', 'cognito_attributes'
        ]

    def to_representation(self, instance):
        """Handle reading the fields from related models"""
        try:
            data = {
                'business_name': instance.business.business_name if instance.business else None,
                'business_type': instance.business.business_type if instance.business else None,
                'country': instance.business.country.code if instance.business and instance.business.country else None,
                'legal_structure': instance.business.legal_structure if instance.business else None,
                'date_founded': instance.business.date_founded if instance.business else None,
                'first_name': instance.user.first_name if instance.user else None,
                'last_name': instance.user.last_name if instance.user else None
            }
            return data
        except Exception as e:
            logger.error(f"Error in to_representation: {str(e)}")
            return {}
                
    def validate(self, data):
        """Validate all required fields are present"""
        for field in ['business_name', 'business_type', 'country', 'legal_structure', 'date_founded']:
            if not data.get(field):
                raise serializers.ValidationError({field: f"{field} is required"})

        # Validate Cognito attributes if provided
        cognito_data = data.get('cognito_attributes', {})
        if cognito_data:
            cognito_serializer = CognitoAttributeSerializer(data=cognito_data)
            cognito_serializer.is_valid(raise_exception=True)
            data['cognito_attributes'] = cognito_serializer.validated_data

        return data

    def create(self, validated_data):
        user = self.context['request'].user
        cognito_data = validated_data.pop('cognito_attributes', {})
        
        with transaction.atomic():
            # Create/update business
            business, _ = Business.objects.update_or_create(
                owner=user,
                defaults={
                    'business_name': validated_data['business_name'],
                    'business_type': validated_data['business_type'],
                    'country': validated_data['country'],
                    'legal_structure': validated_data['legal_structure'],
                    'date_founded': validated_data['date_founded']
                }
            )

            # Create tenant
            from custom_auth.models import Tenant
            from onboarding.utils import generate_unique_schema_name
            
            schema_name = generate_unique_schema_name(user)
            tenant = Tenant.objects.create(
                owner=user,
                name=validated_data['business_name'],
                schema_name=schema_name,
                is_active=True
            )

            # Link tenant to user
            user.tenant = tenant
            user.save(update_fields=['tenant'])

            # Determine onboarding status based on plan
            plan = cognito_data.get('subplan', 'free')
            # Always use lowercase for onboarding statuses
            onboarding_status = 'complete' if plan.upper() == 'FREE' else 'subscription'
            setupdone = 'true' if plan.upper() == 'FREE' else 'FALSE'

            # Update onboarding progress
            progress, _ = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'business': business,
                    'onboarding_status': onboarding_status,
                    'current_step': 'BUSINESS_INFO',
                    'next_step': 'DASHBOARD' if plan.upper() == 'FREE' else 'subscription',
                    'user_role': cognito_data.get('userrole', 'OWNER'),
                    'account_status': cognito_data.get('acctstatus', 'PENDING'),
                    'attribute_version': cognito_data.get('attr_version', '1.0.0')
                }
            )

            # Create schema
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {connection.settings_dict["USER"]}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {connection.settings_dict["USER"]}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {connection.settings_dict["USER"]}')

            return progress

    def update(self, instance, validated_data):
        cognito_data = validated_data.pop('cognito_attributes', {})
        
        with transaction.atomic():
            # Update business
            if instance.business:
                instance.business.business_name = validated_data.get('business_name', instance.business.business_name)
                instance.business.business_type = validated_data.get('business_type', instance.business.business_type)
                instance.business.country = validated_data.get('country', instance.business.country)
                instance.business.legal_structure = validated_data.get('legal_structure', instance.business.legal_structure)
                instance.business.date_founded = validated_data.get('date_founded', instance.business.date_founded)
                instance.business.save()
            else:
                business = Business.objects.create(
                    owner=instance.user,
                    business_name=validated_data['business_name'],
                    business_type=validated_data['business_type'],
                    country=validated_data['country'],
                    legal_structure=validated_data['legal_structure'],
                    date_founded=validated_data['date_founded']
                )
                instance.business = business

            # Update or create tenant
            from custom_auth.models import Tenant
            if instance.user.tenant:
                # Update existing tenant
                tenant = instance.user.tenant
                tenant.name = validated_data.get('business_name', tenant.name)
                tenant.save()
            else:
                # Create new tenant
                from onboarding.utils import generate_unique_schema_name
                schema_name = generate_unique_schema_name(instance.user)
                tenant = Tenant.objects.create(
                    owner=instance.user,
                    name=validated_data['business_name'],
                    schema_name=schema_name,
                    is_active=True
                )
                instance.user.tenant = tenant
                instance.user.save(update_fields=['tenant'])

                # Create schema
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                    cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {connection.settings_dict["USER"]}')
                    cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {connection.settings_dict["USER"]}')
                    cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {connection.settings_dict["USER"]}')

            # Update progress with Cognito attributes if provided
            if cognito_data:
                # Determine status based on plan
                plan = cognito_data.get('subplan', '')
                if plan.upper() == 'FREE':
                    # For free plans, set to complete immediately
                    instance.onboarding_status = 'complete'
                    instance.current_step = 'BUSINESS_INFO'
                    instance.next_step = 'DASHBOARD'
                else:
                    # For paid plans, follow normal flow (always use lowercase)
                    instance.onboarding_status = 'subscription'
                    instance.current_step = 'BUSINESS_INFO'
                    instance.next_step = 'subscription'
                    
                instance.user_role = cognito_data.get('userrole', instance.user_role)
                instance.account_status = cognito_data.get('acctstatus', instance.account_status)
                instance.attribute_version = cognito_data.get('attr_version', instance.attribute_version)

            instance.save()
            return instance


class OnboardingProgressSerializer(serializers.ModelSerializer):
    cognito_attributes = CognitoAttributeSerializer(required=False)

    class Meta:
        model = OnboardingProgress
        fields = '__all__'

    def validate(self, data):
        """Validate onboarding progress data"""
        if 'cognito_attributes' in data:
            cognito_serializer = CognitoAttributeSerializer(data=data['cognito_attributes'])
            cognito_serializer.is_valid(raise_exception=True)
            data['cognito_attributes'] = cognito_serializer.validated_data

        return data
