from rest_framework import serializers
from .models import Timesheet, TimeEntry, ClockEntry, TimeOffRequest, GeofenceZone
from hr.serializers import EmployeeSerializer
from datetime import datetime, timedelta
from decimal import Decimal


class TimeEntrySerializer(serializers.ModelSerializer):
    day_of_week = serializers.SerializerMethodField()
    
    class Meta:
        model = TimeEntry
        fields = [
            'id', 'date', 'day_of_week',
            'regular_hours', 'overtime_hours',
            'sick_hours', 'vacation_hours', 'holiday_hours',
            'unpaid_leave_hours', 'other_hours', 'other_description',
            'total_hours', 'notes'
        ]
    
    def get_day_of_week(self, obj):
        return obj.date.strftime('%A')


class TimesheetSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True, allow_null=True)
    entries = TimeEntrySerializer(many=True, read_only=True)
    can_approve = serializers.SerializerMethodField()
    
    class Meta:
        model = Timesheet
        fields = [
            'id', 'employee', 'employee_name', 'supervisor', 'supervisor_name',
            'week_starting', 'week_ending', 'status',
            'submitted_at', 'approved_at', 'approved_by',
            'total_regular_hours', 'total_overtime_hours', 'total_hours',
            'hourly_rate', 'overtime_rate', 'total_pay',
            'employee_notes', 'supervisor_notes',
            'entries', 'can_approve',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['approved_at', 'approved_by', 'total_regular_hours', 
                           'total_overtime_hours', 'total_hours', 'total_pay']
    
    def get_can_approve(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        # Check if current user is the supervisor or has admin/owner role
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return False
        
        return (employee == obj.supervisor or 
                request.user.role in ['OWNER', 'ADMIN'])
    
    def create(self, validated_data):
        # Set business_id from request
        request = self.context.get('request')
        validated_data['business_id'] = request.user.business_id
        
        # Create timesheet
        timesheet = super().create(validated_data)
        
        # Create time entries for the week
        start_date = timesheet.week_starting
        for i in range(7):
            date = start_date + timedelta(days=i)
            TimeEntry.objects.create(
                timesheet=timesheet,
                date=date
            )
        
        return timesheet


class ClockEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = ClockEntry
        fields = [
            'id', 'employee', 'employee_name', 'entry_type', 'timestamp',
            'location_enabled', 'latitude', 'longitude', 'location_accuracy',
            'is_within_geofence', 'notes', 'is_manual', 'device_type'
        ]
        read_only_fields = ['is_within_geofence']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['business_id'] = request.user.business_id
        
        # Set device info
        if request:
            validated_data['ip_address'] = self.get_client_ip(request)
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
            
            # Simple device type detection
            user_agent = validated_data['user_agent'].lower()
            if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
                validated_data['device_type'] = 'mobile'
            else:
                validated_data['device_type'] = 'web'
        
        # Check geofence if location is provided
        if validated_data.get('latitude') and validated_data.get('longitude'):
            validated_data['is_within_geofence'] = self.check_geofence(
                validated_data['business_id'],
                validated_data['latitude'],
                validated_data['longitude']
            )
        
        return super().create(validated_data)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def check_geofence(self, business_id, latitude, longitude):
        # Check if point is within any active geofence zone
        zones = GeofenceZone.objects.filter(
            business_id=business_id,
            is_active=True
        )
        
        for zone in zones:
            if zone.is_point_inside(latitude, longitude):
                return True
        
        return False


class TimeOffRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)
    can_review = serializers.SerializerMethodField()
    
    class Meta:
        model = TimeOffRequest
        fields = [
            'id', 'employee', 'employee_name', 'request_type',
            'start_date', 'end_date', 'is_full_day',
            'start_time', 'end_time', 'total_hours', 'total_days',
            'reason', 'status', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'review_notes', 'can_review',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['reviewed_by', 'reviewed_at', 'total_hours', 'total_days']
    
    def get_can_review(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        # Check if current user can review this request
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return False
        
        # Can review if: supervisor of the employee, or admin/owner
        return (employee == obj.employee.supervisor or 
                request.user.role in ['OWNER', 'ADMIN'])
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['business_id'] = request.user.business_id
        
        # Create request
        time_off_request = super().create(validated_data)
        
        # Calculate duration
        time_off_request.calculate_duration()
        
        return time_off_request
    
    def validate(self, data):
        # Validate date range
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError("End date must be after start date")
        
        # Validate time range for partial days
        if not data.get('is_full_day', True):
            if not data.get('start_time') or not data.get('end_time'):
                raise serializers.ValidationError(
                    "Start time and end time are required for partial day requests"
                )
        
        return data


class GeofenceZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeofenceZone
        fields = [
            'id', 'name', 'zone_type',
            'center_latitude', 'center_longitude', 'radius_meters',
            'polygon_points', 'is_active', 'require_location',
            'allow_clock_outside', 'created_at', 'updated_at'
        ]
    
    def validate(self, data):
        zone_type = data.get('zone_type', 'circle')
        
        if zone_type == 'circle':
            # Validate circular zone requirements
            if not all([data.get('center_latitude'), data.get('center_longitude'), 
                       data.get('radius_meters')]):
                raise serializers.ValidationError(
                    "Circular zones require center coordinates and radius"
                )
        elif zone_type == 'polygon':
            # Validate polygon zone requirements
            if not data.get('polygon_points') or len(data['polygon_points']) < 3:
                raise serializers.ValidationError(
                    "Polygon zones require at least 3 points"
                )
        
        return data


class TimesheetApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting timesheets"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def update(self, instance, validated_data):
        action = validated_data['action']
        notes = validated_data.get('notes', '')
        
        request = self.context.get('request')
        employee = request.user.employee
        
        if action == 'approve':
            instance.status = 'approved'
            instance.approved_at = datetime.now()
            instance.approved_by = employee
        else:
            instance.status = 'rejected'
        
        if notes:
            instance.supervisor_notes = notes
        
        instance.save()
        return instance


class TimeOffApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting time off requests"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def update(self, instance, validated_data):
        action = validated_data['action']
        notes = validated_data.get('notes', '')
        
        request = self.context.get('request')
        employee = request.user.employee
        
        instance.status = 'approved' if action == 'approve' else 'rejected'
        instance.reviewed_by = employee
        instance.reviewed_at = datetime.now()
        
        if notes:
            instance.review_notes = notes
        
        instance.save()
        return instance