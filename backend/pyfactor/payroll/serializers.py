from rest_framework import serializers
from .models import PayrollRun, PayrollTransaction, TaxForm
from hr.models import Timesheet, TimesheetEntry

class PayrollTimesheetSerializer(serializers.ModelSerializer):
    entries = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    
    class Meta:
        model = Timesheet
        fields = ['id', 'timesheet_number', 'employee', 'employee_name', 
                 'period_start', 'period_end', 'total_regular_hours', 
                 'total_overtime_hours', 'status', 'entries']
    
    def get_entries(self, obj):
        entries = obj.entries.all()
        return TimesheetEntrySerializer(entries, many=True).data

class TimesheetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ['id', 'date', 'regular_hours', 'overtime_hours', 'project', 'description']

class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = '__all__'

class PayrollTransactionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    timesheet_number = serializers.CharField(source='timesheet.timesheet_number', read_only=True, allow_null=True)
    
    class Meta:
        model = PayrollTransaction
        fields = [
            'id', 'employee', 'employee_name', 'payroll_run', 'timesheet',
            'timesheet_number', 'gross_pay', 'net_pay', 'taxes',
            'federal_tax', 'state_tax', 'state_code', 'medicare_tax',
            'social_security_tax', 'additional_withholdings'
        ]

class TaxFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxForm
        fields = '__all__'