# hr/serializers.py

from rest_framework import serializers
from .models import Employee, PreboardingForm, Role, EmployeeRole, AccessPermission, Timesheet, TimesheetEntry, TimeOffRequest, TimeOffBalance, PerformanceReview, PerformanceMetric, PerformanceRating, PerformanceGoal, FeedbackRecord, PerformanceSetting, Benefits
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
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_number', 'first_name', 'middle_name', 'last_name', 
            'email', 'phone_number', 'date_of_birth', 'job_title', 'department', 'employment_type',
            'date_joined', 'salary', 'active', 'onboarded', 'role',
            'street', 'city', 'postcode', 'country', 'compensation_type',
            'probation', 'probation_end_date', 'health_insurance_enrollment', 'pension_enrollment',
            'direct_deposit', 'vacation_time', 'vacation_days_per_year', 'supervisor'
        ]
        read_only_fields = ['id', 'employee_number']


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