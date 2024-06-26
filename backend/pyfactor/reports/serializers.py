# /Users/kuoldeng/projectx/backend/pyfactor/reports/serializers.py
from rest_framework import serializers
from .models import Report

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'user_profile', 'report_type', 'date_generated', 'data']
        read_only_fields = ['id', 'date_generated']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['report_type'] = instance.get_report_type_display()
        return representation