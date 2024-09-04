# /Users/kuoldeng/projectx/backend/pyfactor/reports/serializers.py
from rest_framework import serializers
from pyfactor.logging_config import get_logger

from .models import Report
import uuid
from django.db import connections, transaction as db_transaction
from rest_framework import serializers
from pyfactor.logging_config import get_logger
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.utils.dateparse import parse_date

logger = get_logger()

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'user_profile', 'report_type', 'date_generated', 'data']
        read_only_fields = ['id', 'date_generated']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['report_type'] = instance.get_report_type_display()
        return representation
    
class AgedReceivableSerializer(serializers.Serializer):
    customer_name = serializers.CharField()
    invoice_number = serializers.CharField()
    invoice_date = serializers.DateField()
    due_date = serializers.DateField()
    invoice_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    current = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_0_30 = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_31_60 = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_61_90 = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_over_90 = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=10, decimal_places=2)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        logger.debug(f"Serialized data: {representation}")
        return representation
    
    
    
class AgedPayablesSerializer(serializers.Serializer):
    vendor_name = serializers.CharField()
    current = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_1_30 = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_31_60 = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_61_90 = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_over_90 = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        logger.debug(f"Serialized data: {representation}")
        return representation
    
    