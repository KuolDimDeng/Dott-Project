from rest_framework import serializers
from .models import Timesheet, PayrollRun, PayrollTransaction, TaxForm

class TimesheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timesheet
        fields = '__all__'

class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = '__all__'

class PayrollTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollTransaction
        fields = '__all__'

class TaxFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxForm
        fields = '__all__'