from django.contrib import admin
from .models import (
    Customer, Contact, Lead, Opportunity, 
    Deal, Activity, Campaign, CampaignMember
)

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('customerName', 'accountNumber', 'email', 'phone', 'created_at')
    search_fields = ('customerName', 'accountNumber', 'email', 'phone')
    list_filter = ('created_at', 'billingCountry', 'billingState')
    readonly_fields = ('accountNumber', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('customerName', 'first_name', 'last_name', 'email', 'phone', 'accountNumber', 'website')
        }),
        ('Address Information', {
            'fields': ('street', 'city', 'postcode', 'billingCountry', 'billingState')
        }),
        ('Shipping Information', {
            'fields': ('shipToName', 'shippingCountry', 'shippingState', 'shippingPhone', 'deliveryInstructions')
        }),
        ('Additional Information', {
            'fields': ('notes', 'currency', 'created_at', 'updated_at')
        }),
    )

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'customer', 'email', 'phone', 'is_primary')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    list_filter = ('is_primary', 'created_at', 'customer')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'company_name', 'email', 'status', 'assigned_to')
    search_fields = ('first_name', 'last_name', 'company_name', 'email')
    list_filter = ('status', 'source', 'created_at', 'assigned_to')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ('name', 'customer', 'amount', 'stage', 'probability', 'expected_close_date')
    search_fields = ('name', 'customer__customerName')
    list_filter = ('stage', 'probability', 'created_at', 'assigned_to')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('name', 'customer', 'amount', 'status', 'start_date', 'end_date')
    search_fields = ('name', 'customer__customerName')
    list_filter = ('status', 'created_at')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('type', 'subject', 'status', 'priority', 'due_date', 'assigned_to')
    search_fields = ('subject', 'description')
    list_filter = ('type', 'status', 'priority', 'created_at', 'assigned_to')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'status', 'start_date', 'end_date', 'budget')
    search_fields = ('name', 'description')
    list_filter = ('type', 'status', 'created_at')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(CampaignMember)
class CampaignMemberAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'get_member_name', 'status', 'created_at')
    search_fields = ('campaign__name', 'customer__customerName', 'lead__first_name', 'lead__last_name')
    list_filter = ('status', 'created_at', 'campaign')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_member_name(self, obj):
        if obj.customer:
            return obj.customer.customerName
        elif obj.lead:
            return f"{obj.lead.first_name} {obj.lead.last_name}"
        return "Unknown"
    get_member_name.short_description = 'Member'
