from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.rbac_views import (
    UserManagementViewSet, PagePermissionViewSet,
    UserInvitationViewSet, RoleTemplateViewSet,
    DirectUserCreationViewSet
)

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user-management')
router.register(r'pages', PagePermissionViewSet, basename='page-permissions')
router.register(r'invitations', UserInvitationViewSet, basename='user-invitations')
router.register(r'role-templates', RoleTemplateViewSet, basename='role-templates')
router.register(r'direct-users', DirectUserCreationViewSet, basename='direct-user-creation')

urlpatterns = [
    path('', include(router.urls)),
]