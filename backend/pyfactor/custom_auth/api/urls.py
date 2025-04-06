from django.urls import path
from .views.auth_views import VerifyCredentialsView, VerifySessionView, CheckUserAttributesView
from .views.tenant_views import TenantDetailView, TenantExistsView, CurrentTenantView, ValidateTenantView, TenantByEmailView

urlpatterns = [
    path('verify/', VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('verify-session/', VerifySessionView.as_view(), name='verify-session'),
    path('check-attributes/', CheckUserAttributesView.as_view(), name='check-attributes'),
    path('tenant/<uuid:tenant_id>/', TenantDetailView.as_view(), name='tenant-detail'),
    path('tenant/exists/', TenantExistsView.as_view(), name='tenant-exists'),
    path('tenant/current/', CurrentTenantView.as_view(), name='current-tenant'),
    path('tenant/validate/', ValidateTenantView.as_view(), name='validate-tenant'),
    path('tenant/by-email/<str:email>/', TenantByEmailView.as_view(), name='tenant-by-email'),
]
