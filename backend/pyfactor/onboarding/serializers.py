from rest_framework import serializers
from .models import OnboardingProgress

class OnboardingProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnboardingProgress
        fields = '__all__'