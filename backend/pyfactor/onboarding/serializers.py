from rest_framework import serializers
from .models import OnboardingProgress
from business.models import Business
from django.utils import timezone
from business.choices import BUSINESS_TYPES, LEGAL_STRUCTURE_CHOICES
from django.db import transaction


class BusinessInfoSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(max_length=200)
    business_type = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=2)
    legal_structure = serializers.CharField(max_length=50)
    date_founded = serializers.DateField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)

    class Meta:
        model = OnboardingProgress
        fields = [
            'business_name', 'business_type', 'country',
            'legal_structure', 'date_founded', 'first_name', 'last_name'
        ]

    def to_representation(self, instance):
        """Handle reading the fields from related models"""
        try:
            data = {
                'business_name': instance.business.business_name if instance.business else None,
                'business_type': instance.business.business_type if instance.business else None,
                # Convert Country instance to its code
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
        for field in self.Meta.fields:
            if not data.get(field):
                raise serializers.ValidationError({field: f"{field} is required"})
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        
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

            # Update user
            user.first_name = validated_data['first_name']
            user.last_name = validated_data['last_name']
            user.save()

            # Update onboarding progress
            progress, _ = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'business': business,
                    'onboarding_status': 'subscription',
                    'current_step': 2,
                    'next_step': 3
                }
            )

            return progress

    def update(self, instance, validated_data):
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

            # Update user
            instance.user.first_name = validated_data.get('first_name', instance.user.first_name)
            instance.user.last_name = validated_data.get('last_name', instance.user.last_name)
            instance.user.save()

            # Update progress
            instance.onboarding_status = 'subscription'
            instance.current_step = 2
            instance.next_step = 3
            instance.save()

            return instance

class OnboardingProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnboardingProgress
        fields = '__all__'