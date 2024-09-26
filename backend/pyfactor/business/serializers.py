# /Users/kuoldeng/projectx/backend/pyfactor/business/serializers.py

from rest_framework import serializers
from .models import Business, Subscription

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