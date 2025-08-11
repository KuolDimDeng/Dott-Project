from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet
from .api_views import AuditLogView

router = DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='auditlog')

app_name = 'audit'

urlpatterns = [
    path('log', AuditLogView.as_view(), name='audit-log'),  # Simple audit logging endpoint
    path('', include(router.urls)),
]