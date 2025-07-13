# hr/serializers.py

from rest_framework import serializers
from .models import Employee, PreboardingForm, Role, EmployeeRole, AccessPermission, Timesheet, TimesheetEntry, TimeOffRequest, TimeOffBalance, PerformanceReview, PerformanceMetric, PerformanceRating, PerformanceGoal, FeedbackRecord, PerformanceSetting, Benefits, TimesheetSetting, LocationLog, EmployeeLocationConsent, LocationCheckIn, Geofence, EmployeeGeofence, GeofenceEvent
from decimal import Decimal, InvalidOperation
from datetime import datetime


class EmployeeBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for employee dropdown lists
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = ['id', 'employee_number', 'first_name', 'last_name', 'full_name', 'department', 'active']
        
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer for Employee model with sensitive information excluded
    """
    # Make tenant_id optional to handle missing column gracefully
    tenant_id = serializers.UUIDField(read_only=True, required=False)
    supervisor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_number', 'first_name', 'middle_name', 'last_name', 
            'email', 'phone_number', 'phone_country_code', 'date_of_birth', 'job_title', 'department', 'employment_type',
            'hire_date', 'salary', 'wage_per_hour', 'active', 'onboarded', 'is_supervisor',
            'street', 'city', 'state', 'zip_code', 'country', 'compensation_type',
            'emergency_contact_name', 'emergency_contact_phone',
            'direct_deposit', 'vacation_time', 'vacation_days_per_year', 'supervisor', 'supervisor_name', 'user',
            'security_number_type', 'ssn_last_four', 'created_at', 'updated_at', 'tenant_id'
        ]
        read_only_fields = ['id', 'employee_number', 'created_at', 'updated_at', 'ssn_last_four', 'tenant_id']
        
    def to_representation(self, instance):
        """Override to handle missing tenant_id column gracefully"""
        data = super().to_representation(instance)
        
        # If tenant_id is not in data (column missing), use business_id
        if 'tenant_id' not in data or data['tenant_id'] is None:
            data['tenant_id'] = getattr(instance, 'business_id', None)
            
        return data
    
    def get_supervisor_name(self, obj):
        """Get supervisor's full name"""
        if obj.supervisor:
            return f"{obj.supervisor.first_name} {obj.supervisor.last_name}"
        return None


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class EmployeeRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeRole
        fields = '__all__'

class AccessPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPermission
        fields = '__all__'

class PreboardingFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreboardingForm
        fields = '__all__'

class PerformanceReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceReview
        fields = '__all__'
        read_only_fields = ('id', 'review_number', 'created_at', 'updated_at')


class PerformanceMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceMetric
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class PerformanceRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceRating
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class PerformanceGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceGoal
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class FeedbackRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackRecord
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class PerformanceSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceSetting
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class PerformanceReviewDetailSerializer(serializers.ModelSerializer):
    ratings = PerformanceRatingSerializer(many=True, read_only=True)
    related_goals = serializers.SerializerMethodField()
    related_feedback = FeedbackRecordSerializer(many=True, read_only=True)
    
    class Meta:
        model = PerformanceReview
        fields = '__all__'
        read_only_fields = ('id', 'review_number', 'created_at', 'updated_at')
    
    def get_related_goals(self, obj):
        goals = PerformanceGoal.objects.filter(related_review=obj)
        return PerformanceGoalSerializer(goals, many=True).data


class TimesheetEntrySerializer(serializers.ModelSerializer):
    """Serializer for TimeSheet entries"""
    
    class Meta:
        model = TimesheetEntry
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TimesheetSerializer(serializers.ModelSerializer):
    """Serializer for Timesheet model"""
    entries = TimesheetEntrySerializer(many=True, read_only=True)
    
    class Meta:
        model = Timesheet
        fields = '__all__'
        read_only_fields = ('id', 'timesheet_number', 'created_at', 'updated_at', 'business_id')


class TimesheetSettingSerializer(serializers.ModelSerializer):
    """Serializer for Timesheet Settings"""
    
    class Meta:
        model = TimesheetSetting
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TimeOffRequestSerializer(serializers.ModelSerializer):
    """Serializer for Time Off Requests"""
    
    class Meta:
        model = TimeOffRequest
        fields = '__all__'
        read_only_fields = ('id', 'submitted_at', 'created_at', 'updated_at', 'business_id')


class TimeOffBalanceSerializer(serializers.ModelSerializer):
    """Serializer for Time Off Balance"""
    
    class Meta:
        model = TimeOffBalance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'business_id')


class BenefitsSerializer(serializers.ModelSerializer):
    """Serializer for the Benefits model"""
    
    class Meta:
        model = Benefits
        fields = '__all__'
        read_only_fields = ['id', 'employee', 'business_id', 'created_at', 'updated_at']


# Location Tracking Serializers

class LocationLogSerializer(serializers.ModelSerializer):
    """Serializer for LocationLog model"""
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LocationLog
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'business_id', 'tenant_id')
    
    def get_employee_name(self, obj):
        return obj.employee.get_full_name() if obj.employee else None
    
    def create(self, validated_data):
        # Ensure business_id is set from the employee
        if 'employee' in validated_data:
            validated_data['business_id'] = validated_data['employee'].business_id
        return super().create(validated_data)


class EmployeeLocationConsentSerializer(serializers.ModelSerializer):
    """Serializer for EmployeeLocationConsent model"""
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeeLocationConsent
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'business_id', 'tenant_id', 'consent_date', 'revoked_date')
    
    def get_employee_name(self, obj):
        return obj.employee.get_full_name() if obj.employee else None
    
    def create(self, validated_data):
        # Ensure business_id is set from the employee
        if 'employee' in validated_data:
            validated_data['business_id'] = validated_data['employee'].business_id
        return super().create(validated_data)


class LocationCheckInSerializer(serializers.ModelSerializer):
    """Serializer for LocationCheckIn model"""
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LocationCheckIn
        fields = '__all__'
        read_only_fields = ('id', 'last_updated', 'business_id', 'tenant_id')
    
    def get_employee_name(self, obj):
        return obj.employee.get_full_name() if obj.employee else None
    
    def create(self, validated_data):
        # Ensure business_id is set from the employee
        if 'employee' in validated_data:
            validated_data['business_id'] = validated_data['employee'].business_id
        return super().create(validated_data)


class TimesheetEntryWithLocationSerializer(TimesheetEntrySerializer):
    """Extended TimesheetEntry serializer that includes location data"""
    clock_in_location = LocationLogSerializer(read_only=True)
    clock_out_location = LocationLogSerializer(read_only=True)
    
    class Meta(TimesheetEntrySerializer.Meta):
        fields = '__all__'


class GeofenceSerializer(serializers.ModelSerializer):
    """Serializer for Geofence model"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    assigned_employees_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Geofence
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'business_id']
    
    def create(self, validated_data):
        # Set business_id from request context
        validated_data['business_id'] = self.context['request'].user.business_id
        return super().create(validated_data)


class EmployeeGeofenceSerializer(serializers.ModelSerializer):
    """Serializer for EmployeeGeofence model"""
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    geofence_name = serializers.CharField(source='geofence.name', read_only=True)
    geofence = GeofenceSerializer(read_only=True)
    geofence_id = serializers.UUIDField(write_only=True)
    employee_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = EmployeeGeofence
        fields = '__all__'
        read_only_fields = ['id', 'assigned_at', 'business_id']
    
    def create(self, validated_data):
        # Set business_id from request context
        validated_data['business_id'] = self.context['request'].user.business_id
        # Set assigned_by
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)


class GeofenceEventSerializer(serializers.ModelSerializer):
    """Serializer for GeofenceEvent model"""
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    geofence_name = serializers.CharField(source='geofence.name', read_only=True)
    
    class Meta:
        model = GeofenceEvent
        fields = '__all__'
        read_only_fields = ['id', 'event_time', 'business_id']