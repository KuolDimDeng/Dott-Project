from django.contrib import admin
from .models import Timesheet, TimeEntry, ClockEntry, TimeOffRequest, GeofenceZone


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = ['employee', 'week_starting', 'status', 'total_hours', 'total_pay', 'created_at']
    list_filter = ['status', 'week_starting', 'created_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_number']
    readonly_fields = ['total_regular_hours', 'total_overtime_hours', 'total_hours', 'total_pay', 
                      'created_at', 'updated_at']
    date_hierarchy = 'week_starting'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('employee', 'supervisor', 'week_starting', 'week_ending', 'status')
        }),
        ('Hours & Pay', {
            'fields': ('total_regular_hours', 'total_overtime_hours', 'total_hours',
                      'hourly_rate', 'overtime_rate', 'total_pay')
        }),
        ('Approval', {
            'fields': ('submitted_at', 'approved_at', 'approved_by')
        }),
        ('Notes', {
            'fields': ('employee_notes', 'supervisor_notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        })
    )


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['timesheet', 'date', 'regular_hours', 'overtime_hours', 'total_hours']
    list_filter = ['date', 'timesheet__status']
    search_fields = ['timesheet__employee__first_name', 'timesheet__employee__last_name']
    date_hierarchy = 'date'


@admin.register(ClockEntry)
class ClockEntryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'entry_type', 'timestamp', 'location_enabled', 'is_within_geofence', 
                   'device_type']
    list_filter = ['entry_type', 'location_enabled', 'is_within_geofence', 'device_type', 'timestamp']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_number']
    readonly_fields = ['ip_address', 'user_agent', 'created_at']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('employee', 'entry_type', 'timestamp')
        }),
        ('Location', {
            'fields': ('location_enabled', 'latitude', 'longitude', 'location_accuracy', 
                      'is_within_geofence')
        }),
        ('Device Information', {
            'fields': ('device_type', 'ip_address', 'user_agent')
        }),
        ('Manual Adjustment', {
            'fields': ('is_manual', 'adjusted_by', 'adjustment_reason')
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )


@admin.register(TimeOffRequest)
class TimeOffRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'request_type', 'start_date', 'end_date', 'status', 
                   'total_days', 'created_at']
    list_filter = ['request_type', 'status', 'start_date', 'created_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'reason']
    readonly_fields = ['total_hours', 'total_days', 'created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Request Information', {
            'fields': ('employee', 'request_type', 'reason', 'status')
        }),
        ('Dates & Time', {
            'fields': ('start_date', 'end_date', 'is_full_day', 'start_time', 'end_time',
                      'total_hours', 'total_days')
        }),
        ('Review', {
            'fields': ('reviewed_by', 'reviewed_at', 'review_notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        })
    )


@admin.register(GeofenceZone)
class GeofenceZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'zone_type', 'is_active', 'require_location']
    list_filter = ['zone_type', 'is_active', 'require_location']
    search_fields = ['name', 'business__name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('business', 'name', 'zone_type', 'is_active')
        }),
        ('Circle Zone Settings', {
            'fields': ('center_latitude', 'center_longitude', 'radius_meters'),
            'description': 'Settings for circular geofence zones'
        }),
        ('Polygon Zone Settings', {
            'fields': ('polygon_points',),
            'description': 'Settings for polygon geofence zones'
        }),
        ('Behavior', {
            'fields': ('require_location', 'allow_clock_outside')
        })
    )