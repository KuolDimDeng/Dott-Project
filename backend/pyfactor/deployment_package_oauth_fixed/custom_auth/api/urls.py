from django.urls import path
from .views.auth_views import (
    VerifyCredentialsView, VerifySessionView, CheckUserAttributesView, 
    SignUpView, UserProfileView, VerifyTenantView
)
from .views.tenant_views import (
    TenantDetailView, TenantExistsView, CurrentTenantView, ValidateTenantView, 
    TenantByEmailView, VerifyTenantOwnerView
)

urlpatterns = [
    # Authentication endpoints
    path('verify/', VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('verify-session/', VerifySessionView.as_view(), name='verify-session'),
    path('check-attributes/', CheckUserAttributesView.as_view(), name='check-attributes'),
    path('verify-tenant/', VerifyTenantView.as_view(), name='verify-tenant'),
    
    # User management endpoints (CRITICAL for OAuth flow)
    path('signup/', SignUpView.as_view(), name='user-signup'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    
    # Tenant management endpoints  
    path('tenant/<uuid:tenant_id>/', TenantDetailView.as_view(), name='tenant-detail'),
    path('tenant/exists/', TenantExistsView.as_view(), name='tenant-exists'),
    path('tenant/current/', CurrentTenantView.as_view(), name='current-tenant'),
    path('tenant/validate/', ValidateTenantView.as_view(), name='validate-tenant'),
    path('tenant/by-email/<str:email>/', TenantByEmailView.as_view(), name='tenant-by-email'),
    path('tenant/verify-owner/', VerifyTenantOwnerView.as_view(), name='verify-tenant-owner'),
]
