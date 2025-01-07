from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from chatbot.views import staff_interface, respond_to_message
from django.utils.decorators import method_decorator
from onboarding.views import DatabaseHealthCheckView
from .views import message_stream  # Import the message_stream view correctly

# Use method_decorator to handle CSRF exemption properly with async views
async_csrf_exempt = method_decorator(csrf_exempt, name='dispatch')

# Create async-compatible patterns for API endpoints
api_patterns = [
    # Financial endpoints with proper async handling
    path('finance/', include(('finance.urls', 'finance'), namespace='finance')),
    path('banking/', include(('banking.urls', 'banking'), namespace='banking')),
    path('financial-statements/', include(('finance.urls', 'statements'), namespace='statements')),
    
    # Business operations with proper async handling
    path('inventory/', include(('inventory.urls', 'inventory'), namespace='inventory')),
    path('hr/', include(('hr.urls', 'hr'), namespace='hr')),
    path('sales/', include(('sales.urls', 'sales'), namespace='sales')),
    path('purchases/', include(('purchases.urls', 'purchases'), namespace='purchases')),
    path('taxes/', include(('taxes.urls', 'taxes'), namespace='taxes')),
    
    # Analytics and reporting with proper async handling
    path('reports/', include(('reports.urls', 'reports'), namespace='reports')),
    path('analysis/', include(('analysis.urls', 'analysis'), namespace='analysis')),
    path('chart/', include(('chart.urls', 'chart'), namespace='chart')),
    
    # System features with proper async handling
    path('chatbot/', include(('chatbot.urls', 'chatbot'), namespace='chatbot')),
    path('integrations/', include(('integrations.urls', 'integrations'), namespace='integrations')),
    path('alerts/', include(('alerts.urls', 'alerts'), namespace='alerts')),
    
    # Message stream endpoint - now properly imported
    path('messages/', csrf_exempt(message_stream), name='message_stream'),
    
    # Authentication and onboarding
    path('custom_auth/', include(('custom_auth.urls', 'custom_auth'), namespace='custom_auth')),
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
    
    # Staff interface routes
    path('staff/', include([
        path('interface/', staff_interface, name='staff_interface'),
        path('chat/respond/<int:message_id>/', respond_to_message, name='respond_to_message'),
    ])),
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