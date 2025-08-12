from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .views.rbac_views import (
    UserManagementViewSet, PagePermissionViewSet,
    UserInvitationViewSet, RoleTemplateViewSet,
    DirectUserCreationViewSet, UserPagePermissionsView
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

urlpatterns = [
    path('', include(router.urls)),
    path('user-permissions/', UserPagePermissionsView.as_view(), name='user-page-permissions'),
    path('test/', test_rbac_api, name='test-rbac-api'),
]