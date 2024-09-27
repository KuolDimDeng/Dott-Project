# /Users/kuoldeng/projectx/backend/pyfactor/business/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Business, BusinessMember, Subscription

User = get_user_model()


class BusinessRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['name', 'business_type', 'street', 'city', 'state', 'postcode', 'country', 'phone_number']

class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['subscription_type', 'is_active']

class BusinessSerializer(serializers.ModelSerializer):
    subscriptions = SubscriptionSerializer(many=True, read_only=True)
    active_subscription = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = ['name', 'business_type', 'subscriptions', 'active_subscription']

    def get_active_subscription(self, obj):
        active_sub = obj.subscriptions.filter(is_active=True).first()
        return SubscriptionSerializer(active_sub).data if active_sub else None
    
class AddBusinessMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=BusinessMember.ROLE_CHOICES)
    business_id = serializers.UUIDField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

    def validate_business_id(self, value):
        if not Business.objects.filter(id=value).exists():
            raise serializers.ValidationError("Business with this ID does not exist.")
        return value