from django.urls import path
from .views.auth_views import VerifyCredentialsView
from .views.tenant_views import TenantDetailView, TenantExistsView, CurrentTenantView, ValidateTenantView

urlpatterns = [
    path('verify/', VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('tenant/<uuid:tenant_id>/', TenantDetailView.as_view(), name='tenant-detail'),
    path('tenant/exists/', TenantExistsView.as_view(), name='tenant-exists'),
    path('tenant/current/', CurrentTenantView.as_view(), name='current-tenant'),
    path('tenant/validate/', ValidateTenantView.as_view(), name='validate-tenant'),
]
