from rest_framework import serializers
from .models import FinancialData, ChartConfiguration

class FinancialDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialData
        fields = '__all__'

class ChartConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartConfiguration
        fields = '__all__'