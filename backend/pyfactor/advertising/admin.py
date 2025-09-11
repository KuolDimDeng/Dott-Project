from django.contrib import admin
from .models import AdvertisingCampaign, CampaignAnalytics, CampaignImpression, FeaturedBusinessSchedule

# Note: Django admin is disabled in this project, but keeping this for reference

# @admin.register(AdvertisingCampaign)
# class AdvertisingCampaignAdmin(admin.ModelAdmin):
#     list_display = ['name', 'type', 'status', 'business', 'start_date', 'end_date', 'total_budget', 'spent_amount']
#     list_filter = ['type', 'status', 'payment_status', 'created_at']
#     search_fields = ['name', 'business__business_name']
#     date_hierarchy = 'created_at'
#     ordering = ['-created_at']

# @admin.register(CampaignAnalytics)
# class CampaignAnalyticsAdmin(admin.ModelAdmin):
#     list_display = ['campaign', 'date', 'impressions', 'clicks', 'conversions', 'spend']
#     list_filter = ['date']
#     search_fields = ['campaign__name']
#     date_hierarchy = 'date'

# @admin.register(FeaturedBusinessSchedule)
# class FeaturedBusinessScheduleAdmin(admin.ModelAdmin):
#     list_display = ['business', 'campaign', 'start_date', 'end_date', 'city', 'country', 'is_active']
#     list_filter = ['is_active', 'city', 'country']
#     search_fields = ['business__business_name', 'campaign__name']
#     date_hierarchy = 'start_date'