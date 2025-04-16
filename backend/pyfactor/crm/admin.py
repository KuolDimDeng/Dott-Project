from django.contrib import admin
from .models import (
    Customer, Contact, Lead, Opportunity, 
    Deal, Activity, Campaign, CampaignMember
)

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'account_number', 'email', 'phone', 'created_at')
    search_fields = ('business_name', 'account_number', 'email', 'phone')
    list_filter = ('created_at', 'billing_country', 'billing_state')
    readonly_fields = ('account_number', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('business_name', 'first_name', 'last_name', 'email', 'phone', 'account_number', 'website')
        }),
        ('Address Information', {
            'fields': ('street', 'city', 'postcode', 'billing_country', 'billing_state')
        }),
        ('Shipping Information', {
            'fields': ('ship_to_name', 'shipping_country', 'shipping_state', 'shipping_phone', 'delivery_instructions')
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
    search_fields = ('name', 'customer__business_name')
    list_filter = ('stage', 'probability', 'created_at', 'assigned_to')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('name', 'customer', 'amount', 'status', 'start_date', 'end_date')
    search_fields = ('name', 'customer__business_name')
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
    search_fields = ('campaign__name', 'customer__business_name', 'lead__first_name', 'lead__last_name')
    list_filter = ('status', 'created_at', 'campaign')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_member_name(self, obj):
        if obj.customer:
            return obj.customer.business_name
        elif obj.lead:
            return f"{obj.lead.first_name} {obj.lead.last_name}"
        return "Unknown"
    get_member_name.short_description = 'Member'
