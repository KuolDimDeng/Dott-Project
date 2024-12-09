# /Users/kuoldeng/pyfcator_project/backend/pyfactor/pyfactor/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from chatbot.views import staff_interface, respond_to_message
from pyfactor import views

# Group API endpoints logically
api_patterns = [
    path('finance/', include('finance.urls')),
    path('banking/', include('banking.urls')),
    path('inventory/', include('inventory.urls')),
    path('hr/', include('hr.urls')),
    path('reports/', include('reports.urls')),
    path('analysis/', include('analysis.urls')),
    path('chatbot/', include('chatbot.urls')),
    path('chart/', include('chart.urls')),
    path('integrations/', include('integrations.urls')),
    path('alerts/', include('alerts.urls')),
    path('taxes/', include('taxes.urls')),
    path('onboarding/', include('onboarding.urls', namespace='onboarding')),  # Use namespace instead of tuple
    path('custom_auth/', include('custom_auth.urls')),
    path('messages/', views.message_stream, name='message_stream'),
    path('financial-statements/', include('finance.urls')),
]

# Main URL patterns
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include((api_patterns, 'api'))),  # Add namespace for API routes
    path('', include('users.urls')),
    path('', include('sales.urls')),
    path('', include('purchases.urls')),
    path('accounts/', include('allauth.urls')),
    path('api/', include(api_patterns)),  # Include all API endpoints under /api/
    path('staff_interface/', staff_interface, name='staff_interface'),
    path('staff/chat/respond/<int:message_id>/', respond_to_message, name='respond_to_message'),
]

# Debug toolbar configuration
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ]
    # Serve static and media files in development
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)