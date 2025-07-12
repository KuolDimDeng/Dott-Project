from django.contrib import admin
from .models import LocationLog, EmployeeLocationConsent, LocationCheckIn

# Location tracking admin
@admin.register(LocationLog)
class LocationLogAdmin(admin.ModelAdmin):
    list_display = ['employee', 'location_type', 'logged_at', 'latitude', 'longitude', 'is_verified']
    list_filter = ['location_type', 'is_verified', 'logged_at']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__email', 'formatted_address']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'logged_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'employee', 'business_id', 'location_type', 'logged_at')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'accuracy', 'formatted_address', 
                      'street_address', 'city', 'state', 'postal_code', 'country')
        }),
        ('Device Information', {
            'fields': ('device_type', 'device_id', 'ip_address', 'user_agent')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verification_method')
        }),
        ('Related', {
            'fields': ('timesheet_entry',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(EmployeeLocationConsent)
class EmployeeLocationConsentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'has_consented', 'consent_date', 'allow_clock_in_out_tracking', 
                   'allow_random_checks', 'allow_continuous_tracking']
    list_filter = ['has_consented', 'allow_clock_in_out_tracking', 'allow_random_checks', 
                  'allow_continuous_tracking', 'consent_date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__email']
    readonly_fields = ['id', 'consent_date', 'revoked_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'employee', 'business_id')
        }),
        ('Consent Status', {
            'fields': ('has_consented', 'consent_date', 'revoked_date', 'consent_version')
        }),
        ('Tracking Preferences', {
            'fields': ('allow_clock_in_out_tracking', 'allow_random_checks', 'allow_continuous_tracking')
        }),
        ('Privacy Preferences', {
            'fields': ('share_with_manager', 'share_with_hr')
        }),
        ('Legal/Compliance', {
            'fields': ('ip_address_at_consent', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(LocationCheckIn)
class LocationCheckInAdmin(admin.ModelAdmin):
    list_display = ['employee', 'check_in_time', 'latitude', 'longitude', 'is_active', 'last_updated']
    list_filter = ['is_active', 'check_in_time']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__email']
    readonly_fields = ['id', 'last_updated']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'employee', 'business_id', 'is_active')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'accuracy')
        }),
        ('Check-in Details', {
            'fields': ('check_in_time', 'last_updated', 'check_in_location_log')
        }),
    )
