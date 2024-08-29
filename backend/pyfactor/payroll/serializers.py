from rest_framework import serializers
from .models import Timesheet, PayrollRun, PayrollTransaction, TaxForm, TimesheetEntry

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

class TimesheetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ['id', 'date', 'hours_worked', 'project', 'description']

class TimesheetSerializer(serializers.ModelSerializer):
    entries = TimesheetEntrySerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = Timesheet
        fields = ['id', 'timesheet_number', 'employee', 'employee_name', 'start_date', 'end_date', 'total_hours', 'status', 'entries']