from django.contrib import admin
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
    path('admin/', admin.site.urls),
    
    # Health check endpoints for AWS and Render
    path('health/', health_check, name='health_check'),
    path('health-check/', health_check, name='health_check_alt'),
    path('healthz', health_check, name='health_check_render'),  # Render health check endpoint
    path('health/detailed/', detailed_health_check, name='detailed_health_check'),
    
    # Temporary diagnostic endpoint
    path('api/diagnostic/', DiagnosticView.as_view(), name='diagnostic'),
    path('api/diagnostic/restore/', RestoreAccountView.as_view(), name='restore_account'),
]

# Only add other URLs if not in health-check-only mode
if not settings.DEBUG or True:  # Always include for now, but can be conditional
    try:
        # Import these only when needed to avoid startup errors
        from custom_auth.api.views.tenant_views import TenantDetailView
        
        # Use method_decorator to handle CSRF exemption properly with async views
        async_csrf_exempt = method_decorator(csrf_exempt, name='dispatch')

        # Create async-compatible patterns for API endpoints
        api_patterns = [
            # Essential endpoints only
            path('', include('custom_auth.urls')),
            
            # Tenant endpoint
            path('tenant/<uuid:tenant_id>/', csrf_exempt(TenantDetailView.as_view()), name='tenant-detail'),
        ]

        # Add API routes
        urlpatterns.extend([
            # API routes with namespace
            path('api/', include((api_patterns, 'api'), namespace='api')),
            
            # Main app routes
            path('', include('users.urls')),
            
            # Authentication routes
            path('accounts/', include('allauth.urls')),
            path('api/auth/', include('custom_auth.api.urls')),
        ])
        
    except ImportError as e:
        # If imports fail, just continue with health endpoints
        print(f"Warning: Some modules could not be imported: {e}")
        pass

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