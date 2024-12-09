# business/serializer_helpers.py
from rest_framework import serializers
from .models import Business

class BusinessProfileSerializer(serializers.ModelSerializer):
    """
    A simplified Business serializer specifically for user profiles.
    This prevents circular imports while providing necessary business data.
    """
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
            'phone_number'
        ]