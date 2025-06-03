"""
Auth0 URLs Update for Django
Add these URL patterns to your main urls.py file
"""

# Add this import at the top of urls.py:
from accounts import urls_auth0
from accounts import views_payment

# Add these URL patterns to your urlpatterns list:

urlpatterns = [
    # ... existing patterns ...
    
    # Auth0 API endpoints
    path('api/', include('accounts.urls_auth0')),
    
    # Payment endpoints
    path('api/payments/create-intent/', views_payment.create_payment_intent, name='create_payment_intent'),
    path('api/payments/confirm/', views_payment.confirm_payment, name='confirm_payment'),
    path('api/payments/webhook/', views_payment.stripe_webhook, name='stripe_webhook'),
    
    # ... other patterns ...
]

# Full example of where to add in existing structure:
"""
urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # Health check endpoints
    path('health/', health_check, name='health_check'),
    path('health-check/', health_check, name='health_check_alt'),
    path('health/detailed/', detailed_health_check, name='detailed_health_check'),
    
    # Auth0 endpoints - ADD THESE
    path('api/', include('accounts.urls_auth0')),
    path('api/payments/create-intent/', views_payment.create_payment_intent, name='create_payment_intent'),
    path('api/payments/confirm/', views_payment.confirm_payment, name='confirm_payment'),
    path('api/payments/webhook/', views_payment.stripe_webhook, name='stripe_webhook'),
]
"""