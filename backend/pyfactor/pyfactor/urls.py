from django.contrib import admin
from django.urls import path, include, register_converter
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from onboarding.views import DatabaseHealthCheckView
from custom_auth.api.views.tenant_views import TenantDetailView

class UUIDConverter:
    regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def to_python(self, value):
        return value

    def to_url(self, value):
        return str(value)

register_converter(UUIDConverter, 'uuid')

# Use method_decorator to handle CSRF exemption properly with async views
async_csrf_exempt = method_decorator(csrf_exempt, name='dispatch')

# Create async-compatible patterns for API endpoints
api_patterns = [
    # Financial endpoints with proper async handling
    path('finance/', include(('finance.urls', 'finance'), namespace='finance')),
    path('banking/', include(('banking.urls', 'banking'), namespace='banking')),
    path('payments/', include(('payments.urls', 'payments'), namespace='payments')),
    path('financial-statements/', include(('finance.urls', 'statements'), namespace='statements')),
    
    # Business operations with proper async handling
    path('inventory/', include(('inventory.urls', 'inventory'), namespace='inventory')),
    # Temporarily commented out to break circular dependency
    # path('hr/', include(('hr.urls', 'hr'), namespace='hr')),
    path('sales/', include(('sales.urls', 'sales'), namespace='sales')),
    path('purchases/', include(('purchases.urls', 'purchases'), namespace='purchases')),
    path('taxes/', include(('taxes.urls', 'taxes'), namespace='taxes')),
    path('crm/', include(('crm.urls', 'crm'), namespace='crm')),
    path('transport/', include(('transport.urls', 'transport'), namespace='transport')),
    
    # Analytics and reporting with proper async handling
    path('reports/', include(('reports.urls', 'reports'), namespace='reports')),
    path('analysis/', include(('analysis.urls', 'analysis'), namespace='analysis')),
    path('chart/', include(('chart.urls', 'chart'), namespace='chart')),
    
    # System features with proper async handling
    path('integrations/', include(('integrations.urls', 'integrations'), namespace='integrations')),
    
    # Tenant endpoint
    path('tenant/<uuid:tenant_id>/', csrf_exempt(TenantDetailView.as_view()), name='tenant-detail'),
    
    # Authentication and onboarding
    path('', include('custom_auth.urls')),  # Changed from 'api/' to ''
    path('database/health-check/', async_csrf_exempt(DatabaseHealthCheckView.as_view()), name='database-health-check'),
    path('onboarding/', include('onboarding.urls', namespace='onboarding')),  # Fixed indentation
]

# Main URL patterns with conditional debug toolbar
urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # API routes with namespace
    path('api/', include((api_patterns, 'api'), namespace='api')),
    
    # Main app routes
    path('', include('users.urls')),
    
    # Authentication routes
    path('accounts/', include('allauth.urls')),
    
]

# Handle debug configuration properly
if settings.DEBUG:
    if not settings.IS_ASGI:
        try:
            import debug_toolbar
            urlpatterns.append(path('__debug__/', include(debug_toolbar.urls)))
        except ImportError:
            pass
        
        # Add static and media serving for development
        urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)