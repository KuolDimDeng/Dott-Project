# from django.contrib import admin  # Disabled - requires Django sessions
from django.urls import path, include, register_converter
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
import sentry_sdk

# Import health check view
from .health_check import health_check, root_health_check, detailed_health_check

# Import diagnostic view
from custom_auth.api.views.diagnostic_views import DiagnosticView, RestoreAccountView

# Import new features
try:
    from core.api_documentation import documentation_urls
    has_documentation = True
except ImportError:
    has_documentation = False

try:
    from monitoring.admin_dashboard import admin_monitoring_dashboard, api_monitoring_metrics, api_monitoring_health
    has_monitoring = True
except ImportError:
    has_monitoring = False

@csrf_exempt
def test_sentry(request):
    """Test endpoint for Sentry integration"""
    if request.method == 'GET':
        # Send a test message to Sentry
        sentry_sdk.capture_message("Test message from Django backend API", level="info")
        return JsonResponse({
            "status": "success", 
            "message": "Test message sent to Sentry",
            "environment": settings.DEBUG and "development" or "production"
        })
    elif request.method == 'POST':
        # Trigger a test error
        raise Exception("Test error from Django backend API!")

class UUIDConverter:
    regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def to_python(self, value):
        return value

    def to_url(self, value):
        return str(value)

register_converter(UUIDConverter, 'uuid')

# Minimal URL patterns for health check only
urlpatterns = [
    # Admin interface
    # path('admin/', admin.site.urls),  # Disabled - requires Django sessions
    
    # Health check endpoints for AWS and Render
    path('health/', health_check, name='health_check'),
    path('health-check/', health_check, name='health_check_alt'),
    path('healthz', health_check, name='health_check_render'),  # Render health check endpoint
    path('health/detailed/', detailed_health_check, name='detailed_health_check'),
    
    # Sentry test endpoint
    path('api/test-sentry/', test_sentry, name='test_sentry'),
    
    # Diagnostic endpoints removed from production
    
    # API routes - ALWAYS include these (don't wrap in try-catch)
    path('api/', include('custom_auth.api.urls')),
    
    # Phone Authentication API routes
    path('api/auth/phone/', include('authentication.phone_auth_urls')),
    
    # Unified Authentication API routes (phone + email)
    path('api/auth/unified/', include('authentication.unified_auth_urls')),
    
    # Session management API routes
    path('api/sessions/', include('session_manager.urls')),
    
    # Payment API routes
    path('api/payments/', include('payments.urls')),
    
    # Finance/Accounting API routes
    path('api/finance/', include('finance.urls')),
    path('api/finance/emergency/', include('finance.urls_emergency')),  # Temporary fix endpoint
    
    # Banking API routes
    path('api/banking/', include('banking.urls')),
    
    # HR API routes
    path('api/hr/', include('hr.urls')),
    
    # Payroll API routes
    path('api/payroll/', include('payroll.urls')),
    
    # Taxes API routes
    path('api/taxes/', include('taxes.urls')),
    
    # Reports API routes
    path('api/reports/', include('reports.urls')),
    
    # Analytics API routes
    path('api/analytics/', include('analysis.urls')),
    
    # CRM API routes
    path('api/crm/', include('crm.urls')),
    
    # Inventory API routes
    path('api/inventory/', include('inventory.urls')),
    
    # Sales API routes (if exists)
    path('api/sales/', include('sales.urls')),
    
    # Purchases API routes (if exists)
    path('api/purchases/', include('purchases.urls')),
    
    # Product Suppliers API routes
    path('api/product-suppliers/', include('product_suppliers.urls')),
    
    # Timesheets API routes
    path('api/timesheets/', include('timesheets.urls')),
    
    # Users API routes
    path('api/users/', include('users.api.urls')),
    
    # Direct user profile routes for frontend compatibility
    path('api/user/', include('users.api.urls')),
    
    # Business SMS API routes
    path('api/business/', include('business.urls')),
    
    # Currency API routes (direct access)
    path('api/currency/', include('users.api.currency_urls')),
]

# Add documentation URLs if available
if has_documentation:
    urlpatterns += documentation_urls

# Add monitoring URLs if available
if has_monitoring:
    from django.contrib.admin.views.decorators import staff_member_required
    urlpatterns += [
        path('admin/monitoring/', staff_member_required(admin_monitoring_dashboard), name='admin-monitoring'),
        path('api/monitoring/metrics/', api_monitoring_metrics, name='monitoring-metrics'),
        path('api/monitoring/health/', api_monitoring_health, name='monitoring-health'),
    ]

# Continue with remaining patterns
urlpatterns += [
    # Audit API routes
    path('api/audit/', include('audit.urls')),
    
    # Smart Insights API routes
    path('api/', include('smart_insights.urls')),
    
    # Notifications API routes
    path('api/notifications/', include('notifications.urls')),
    
    # Calendar/Events API routes
    path('api/calendar/', include('events.urls')),
    
    # Invitations API routes
    path('api/invitations/', include('invitations.urls')),
    
    # WhatsApp Business API routes
    path('api/whatsapp-business/', include('whatsapp_business.urls')),
    
    # Data Export API routes
    path('api/data_export/', include('data_export.urls')),
    
    # Leads API routes  
    path('api/leads/', include('leads.urls')),
    
    # Jobs API routes
    path('api/jobs/', include('jobs.urls')),
    
    # Marketplace API routes
    path('api/marketplace/', include('marketplace.urls')),
    path('api/marketplace/consumer/', include('marketplace.consumer_urls')),
    
    # Chat API routes
    path('api/chat/', include('chat.urls')),
    
    # Core monitoring and performance routes
    path('api/core/', include('core.urls')),
    
    # Main app routes
    path('', include('users.urls')),
    
    # Authentication routes  
    # path('accounts/', include('allauth.urls')),  # Commented out - using Auth0
    path('auth/', include('custom_auth.urls')),
    
    # Onboarding routes (includes Stripe webhook)
    path('api/onboarding/', include('onboarding.urls')),
]

# Handle debug configuration properly
if settings.DEBUG:
    if not getattr(settings, 'IS_ASGI', False):
        try:
            import debug_toolbar
            urlpatterns.append(path('__debug__/', include(debug_toolbar.urls)))
        except ImportError:
            pass
        
        # Add static and media serving for development
        urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)