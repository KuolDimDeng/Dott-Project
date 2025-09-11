import uuid
from rest_framework import serializers
from django_countries.serializers import CountryFieldMixin
from .models import UserProfile, User, Business, UserMenuPrivilege, FeatureModule, BusinessFeatureModule
from .serializer_helpers import BusinessProfileSerializer
from pyfactor.logging_config import get_logger

logger = get_logger()

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Enhanced UserProfile serializer with robust field handling and error management.
    """
    # User-related fields with proper validation
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()

    # Business-related fields with null handling
    business_name = serializers.SerializerMethodField()
    business_type = serializers.SerializerMethodField()
    business_data = BusinessProfileSerializer(source='business', read_only=True)

    # Location and contact fields
    country = serializers.SerializerMethodField()
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # Status and tracking fields
    setup_status = serializers.CharField(required=False)
    last_setup_attempt = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'occupation',
            'street',
            'city',
            'state',
            'postcode',
            'country',
            'phone_number',
            'business_name',
            'business_type',
            'business_data',
            'setup_status',
            'last_setup_attempt',
            'is_business_owner',  # Added based on model
            'show_zero_stock_pos',  # POS preference for showing zero stock
            'preferred_currency_code',
            'preferred_currency_name',
            'preferred_currency_symbol'
        ]
        extra_kwargs = {
            'occupation': {'required': False, 'allow_null': True},
            'street': {'required': False, 'allow_null': True},
            'city': {'required': False, 'allow_null': True},
            'state': {'required': False, 'allow_null': True},
            'postcode': {'required': False, 'allow_null': True},
        }

    def get_country(self, obj):
        """
        Safely converts Country object to a serializable format with error handling.
        """
        try:
            if obj.country:
                return {
                    'code': str(obj.country),
                    'name': obj.country.name,
                    'display_name': f"{obj.country.name} ({str(obj.country)})"
                }
        except Exception as e:
            logger.error(f"Error serializing country for profile {obj.id}: {str(e)}")
        return None

    def get_full_name(self, obj):
        """
        Safely generates full name with proper error handling.
        """
        try:
            if obj.user:
                first = obj.user.first_name or ''
                last = obj.user.last_name or ''
                full_name = f"{first} {last}".strip()
                return full_name if full_name else None
        except Exception as e:
            logger.error(f"Error getting full name for profile {obj.id}: {str(e)}")
        return None

    def get_business_name(self, obj):
        """
        Safely retrieves business name with error handling.
        """
        try:
            return obj.business.name if obj.business else None
        except Exception as e:
            logger.error(f"Error getting business name for profile {obj.id}: {str(e)}")
            return None

    def get_business_type(self, obj):
        """
        Safely retrieves business type with error handling.
        """
        try:
            return obj.business.business_type if obj.business else None
        except Exception as e:
            logger.error(f"Error getting business type for profile {obj.id}: {str(e)}")
            return None

    def to_representation(self, instance):
        """
        Enhanced representation handling with proper error handling and data cleaning.
        """
        try:
            data = super().to_representation(instance)
            
            # Clean up empty values while preserving valid zeros and booleans
            cleaned_data = {
                key: value for key, value in data.items()
                if value not in (None, '', [], {}) or isinstance(value, (bool, int, float))
            }
            
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Error serializing profile {instance.id}: {str(e)}")
            raise serializers.ValidationError(f"Failed to serialize profile data: {str(e)}")

class UserMenuPrivilegeSerializer(serializers.ModelSerializer):
    business_member_id = serializers.UUIDField(source='business_member.id', read_only=True)
    user_id = serializers.UUIDField(source='business_member.user.id', read_only=True)
    user_email = serializers.EmailField(source='business_member.user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserMenuPrivilege
        fields = ['id', 'business_member_id', 'user_id', 'user_email', 'user_full_name', 'menu_items', 'created_at', 'updated_at']
    
    def get_user_full_name(self, obj):
        """Get the full name of the user"""
        user = obj.business_member.user
        if user.first_name or user.last_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.email


class FeatureModuleSerializer(serializers.ModelSerializer):
    """Serializer for Feature Module model"""
    class Meta:
        model = FeatureModule
        fields = [
            'id', 'code', 'name', 'description', 'category',
            'monthly_price', 'developing_country_price',
            'is_active', 'is_core', 'required_features',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BusinessFeatureModuleSerializer(serializers.ModelSerializer):
    """Serializer for Business Feature Module relationship"""
    feature_module = FeatureModuleSerializer(read_only=True)
    
    class Meta:
        model = BusinessFeatureModule
        fields = [
            'id', 'business', 'feature_module', 'enabled',
            'added_at', 'removed_at', 'next_bill_date',
            'last_billed', 'billing_active'
        ]
        read_only_fields = ['id', 'added_at']