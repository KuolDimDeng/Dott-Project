from django.urls import path
from .views.auth_views import VerifyCredentialsView
from .views.tenant_views import TenantDetailView

urlpatterns = [
    path('verify/', VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('tenant/<uuid:tenant_id>/', TenantDetailView.as_view(), name='tenant-detail'),
]
