from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from .models import Business, BusinessMember, Subscription
from pyfactor.logging_config import get_logger

logger = get_logger()
User = get_user_model()

class BusinessRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for business registration process. Handles the initial creation
    of a business entity with all necessary fields.
    """
    class Meta:
        model = Business
        fields = [
            'business_name',
            'business_type',
            'street',
            'city',
            'state',
            'postcode',
            'country',
            'phone_number',
            'legal_structure'
        ]

    def validate_business_name(self, value):
        """Ensure business name meets requirements and isn't duplicate"""
        if Business.objects.filter(business_name__iexact=value).exists():
            raise serializers.ValidationError("A business with this name already exists.")
        return value

class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for business subscriptions. Handles both active and inactive
    subscription data.
    """
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'selected_plan',
            'is_active',
            'start_date',
            'end_date',
            'billing_cycle',
            'status'
        ]

    def get_status(self, obj):
        """Calculate subscription status based on dates and active flag"""
        if not obj.is_active:
            return 'inactive'
        if obj.end_date and obj.end_date < timezone.now().date():
            return 'expired'
        return 'active'

class BusinessSerializer(serializers.ModelSerializer):
    """
    Main business serializer that includes subscription information and other
    business details. Used for general business data representation.
    """
    subscriptions = SubscriptionSerializer(many=True, read_only=True)
    active_subscription = serializers.SerializerMethodField()
    business_details = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            'id',
            'business_name',
            'business_type',
            'street',
            'city',
            'state',
            'postcode',
            'country',
            'email',
            'phone_number',
            'legal_structure',
            'subscriptions',
            'active_subscription',
            'business_details'
        ]

    def get_active_subscription(self, obj):
        """Retrieve the currently active subscription for the business"""
        try:
            active_sub = obj.subscriptions.filter(
                Q(is_active=True) &
                (Q(end_date__gt=timezone.now().date()) | Q(end_date__isnull=True))
            ).first()
            return SubscriptionSerializer(active_sub).data if active_sub else None
        except Exception as e:
            logger.error(f"Error getting active subscription for business {obj.id}: {str(e)}")
            return None

    def get_business_details(self, obj):
        """Provide additional business details including member count"""
        return {
            'member_count': obj.business_memberships.count(),
            'date_founded': obj.date_founded,
            'created_at': obj.created_at,
            'database_name': obj.database_name
        }

class AddBusinessMemberSerializer(serializers.Serializer):
    """
    Serializer for adding new members to a business. Handles validation
    of user existence and business membership.
    """
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=BusinessMember.ROLE_CHOICES)
    business_id = serializers.UUIDField()

    def validate_email(self, value):
        """Verify that the user exists and isn't already a member"""
        try:
            user = User.objects.get(email=value)
            business_id = self.initial_data.get('business_id')
            
            if business_id and BusinessMember.objects.filter(
                user=user,
                business_id=business_id
            ).exists():
                raise serializers.ValidationError("User is already a member of this business.")
            
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")

    def validate_business_id(self, value):
        """Verify that the business exists"""
        try:
            Business.objects.get(id=value)
            return value
        except Business.DoesNotExist:
            raise serializers.ValidationError("Business with this ID does not exist.")
