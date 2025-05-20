# integrations/serializers.py

from rest_framework import serializers
from .models import Integration, WooCommerceIntegration, ShopifyIntegration

class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = ['id', 'user_profile', 'platform', 'is_active']

class WooCommerceIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WooCommerceIntegration
        fields = ['id', 'user_profile', 'site_url', 'is_active']
        extra_kwargs = {'consumer_key': {'write_only': True}, 'consumer_secret': {'write_only': True}}

class ShopifyIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopifyIntegration
        fields = ['id', 'user_profile', 'shop_url', 'is_active']
        extra_kwargs = {'access_token': {'write_only': True}}