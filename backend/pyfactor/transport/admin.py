from django.contrib import admin
from .models import (
    Equipment, Driver, Route, Load, 
    Expense, Maintenance, Compliance
)

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'equipment_type', 'make', 'model', 'year', 'status')
    search_fields = ('name', 'make', 'model', 'vin', 'license_plate')
    list_filter = ('equipment_type', 'status', 'year')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'equipment_type', 'make', 'model', 'year')
        }),
        ('Identification', {
            'fields': ('vin', 'license_plate')
        }),
        ('Status & Financial', {
            'fields': ('status', 'purchase_date', 'purchase_price', 'current_value')
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'license_number', 'license_expiration', 'status')
    search_fields = ('first_name', 'last_name', 'email', 'phone', 'license_number')
    list_filter = ('status', 'license_state', 'hire_date')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Personal Information', {
            'fields': ('user', 'first_name', 'last_name', 'email', 'phone')
        }),
        ('License Information', {
            'fields': ('license_number', 'license_state', 'license_expiration')
        }),
        ('Employment Information', {
            'fields': ('status', 'hire_date', 'notes')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_location', 'end_location', 'distance', 'estimated_time')
    search_fields = ('name', 'start_location', 'end_location')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Load)
class LoadAdmin(admin.ModelAdmin):
    list_display = ('reference_number', 'customer', 'status', 'pickup_date', 'delivery_date', 'driver')
    search_fields = ('reference_number', 'customer__customerName', 'pickup_location', 'delivery_location')
    list_filter = ('status', 'pickup_date', 'delivery_date')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('reference_number', 'customer', 'status')
        }),
        ('Route Information', {
            'fields': ('route', 'pickup_location', 'delivery_location', 'pickup_date', 'delivery_date')
        }),
        ('Assignment', {
            'fields': ('driver', 'equipment')
        }),
        ('Cargo Information', {
            'fields': ('cargo_description', 'weight', 'volume', 'value')
        }),
        ('Financial', {
            'fields': ('rate',)
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('expense_type', 'amount', 'date', 'load', 'equipment')
    search_fields = ('description', 'load__reference_number', 'equipment__name')
    list_filter = ('expense_type', 'date', 'created_by')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Maintenance)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'maintenance_type', 'date_performed', 'cost', 'next_maintenance_date')
    search_fields = ('equipment__name', 'description', 'performed_by')
    list_filter = ('maintenance_type', 'date_performed')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Compliance)
class ComplianceAdmin(admin.ModelAdmin):
    list_display = ('document_type', 'get_related_item', 'document_number', 'expiration_date', 'is_expired')
    search_fields = ('document_number', 'equipment__name', 'driver__first_name', 'driver__last_name')
    list_filter = ('document_type', 'issue_date', 'expiration_date')
    readonly_fields = ('created_at', 'updated_at', 'is_expired', 'days_until_expiration')
    
    def get_related_item(self, obj):
        if obj.equipment:
            return f"Equipment: {obj.equipment.name}"
        elif obj.driver:
            return f"Driver: {obj.driver.first_name} {obj.driver.last_name}"
        return "Unknown"
    get_related_item.short_description = 'Related To'
