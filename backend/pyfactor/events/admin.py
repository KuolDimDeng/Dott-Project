from django.contrib import admin
from .models import Event

# Note: Django admin is disabled in this project
# This is here for completeness if admin is re-enabled in the future

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'start_datetime', 'end_datetime', 'event_type', 'created_by', 'tenant_id']
    list_filter = ['event_type', 'all_day', 'created_at']
    search_fields = ['title', 'description', 'location']
    date_hierarchy = 'start_datetime'
    readonly_fields = ['id', 'created_at', 'updated_at', 'tenant_id']
    
    def get_queryset(self, request):
        """Filter events by tenant if user has a tenant."""
        qs = super().get_queryset(request)
        if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
            return qs.filter(tenant_id=request.user.tenant_id)
        return qs