# from django.contrib import admin  # Disabled - requires Django sessions
from django.urls import path, include, register_converter
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# Import health check view
from .health_check import health_check, root_health_check, detailed_health_check

# Import diagnostic view
from custom_auth.api.views.diagnostic_views import DiagnosticView, RestoreAccountView

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
    
    # Diagnostic endpoints removed from production
    
    # API routes - ALWAYS include these (don't wrap in try-catch)
    path('api/', include('custom_auth.api.urls')),
    
    # Session management API routes
    path('api/sessions/', include('session_manager.urls')),
    
    # Payment API routes
    path('api/payments/', include('payments.urls')),
    
    # Finance/Accounting API routes
    path('api/finance/', include('finance.urls')),
    
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
    
    # Users API routes
    path('api/users/', include('users.api.urls')),
    
    # Direct user profile routes for frontend compatibility
    path('api/user/', include('users.api.urls')),
    
    # Audit API routes
    path('api/audit/', include('audit.urls')),
    
    # Smart Insights API routes
    path('api/', include('smart_insights.urls')),
    
    # Notifications API routes
    path('api/notifications/', include('notifications.urls')),
    
    # Calendar/Events API routes
    path('api/calendar/', include('events.urls')),
    
    # Main app routes
    path('', include('users.urls')),
    
    # Authentication routes  
    path('accounts/', include('allauth.urls')),
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