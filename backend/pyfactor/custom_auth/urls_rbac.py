from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .views.rbac_views import (
    UserManagementViewSet, PagePermissionViewSet,
    UserInvitationViewSet, RoleTemplateViewSet,
    DirectUserCreationViewSet, UserPagePermissionsView
)
from .views.permission_views import (
    PermissionTemplateViewSet, DepartmentViewSet,
    TemporaryPermissionViewSet, PermissionDelegationViewSet,
    PermissionAuditLogViewSet, PermissionRequestViewSet,
    PermissionValidationViewSet
)

@api_view(['GET'])
def test_rbac_api(request):
    """Test endpoint to verify RBAC API is accessible"""
    return Response({"message": "RBAC API is working", "user": str(request.user)})

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user-management')
router.register(r'pages', PagePermissionViewSet, basename='page-permissions')
router.register(r'invitations', UserInvitationViewSet, basename='user-invitations')
router.register(r'role-templates', RoleTemplateViewSet, basename='role-templates')
router.register(r'direct-users', DirectUserCreationViewSet, basename='direct-user-creation')

# Enhanced permission system endpoints
router.register(r'permission-templates', PermissionTemplateViewSet, basename='permission-templates')
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'temporary-permissions', TemporaryPermissionViewSet, basename='temporary-permissions')
router.register(r'delegations', PermissionDelegationViewSet, basename='delegations')
router.register(r'audit-logs', PermissionAuditLogViewSet, basename='audit-logs')
router.register(r'permission-requests', PermissionRequestViewSet, basename='permission-requests')
router.register(r'permission-validation', PermissionValidationViewSet, basename='permission-validation')

urlpatterns = [
    path('', include(router.urls)),
    path('user-permissions/', UserPagePermissionsView.as_view(), name='user-page-permissions'),
    path('test/', test_rbac_api, name='test-rbac-api'),
]