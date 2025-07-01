"""
Proxy views to map frontend expected endpoints to existing RBAC functionality
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
import json
import logging

from custom_auth.views.rbac_views import (
    UserInvitationViewSet, UserManagementViewSet, IsOwnerOrAdmin
)
from custom_auth.auth0_service import auth0_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwnerOrAdmin])
def invite_user(request):
    """
    Proxy endpoint for /api/auth/invite-user
    Maps to existing UserInvitationViewSet.create()
    """
    try:
        # Create a mock viewset instance to use the existing logic
        viewset = UserInvitationViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        # Call the create method directly
        response = viewset.create(request)
        return response
    except Exception as e:
        logger.error(f"[UserManagementProxy] Error inviting user: {str(e)}")
        return Response(
            {"error": "Failed to send invitation"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsOwnerOrAdmin])
def update_user_role(request):
    """
    Proxy endpoint for /api/auth/update-user-role
    Maps to existing UserManagementViewSet.update_permissions()
    """
    try:
        user_id = request.data.get('userId')
        new_role = request.data.get('role')
        
        if not user_id or not new_role:
            return Response(
                {"error": "userId and role are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a mock viewset instance
        viewset = UserManagementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.kwargs = {'pk': user_id}
        
        # Get the user object
        user = viewset.get_object()
        
        # Prepare the request data in the expected format
        request.data['role'] = new_role
        request.data['page_permissions'] = []  # Empty for role-only update
        
        # Call update_permissions
        response = viewset.update_permissions(request, pk=user_id)
        return response
        
    except Exception as e:
        logger.error(f"[UserManagementProxy] Error updating user role: {str(e)}")
        return Response(
            {"error": "Failed to update user role"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrAdmin])
def remove_user(request):
    """
    Proxy endpoint for /api/auth/remove-user
    Maps to UserManagementViewSet.deactivate() and optionally deletes from Auth0
    """
    try:
        user_id = request.data.get('userId')
        
        if not user_id:
            return Response(
                {"error": "userId is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a mock viewset instance
        viewset = UserManagementViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.kwargs = {'pk': user_id}
        
        # Get the user object
        user = viewset.get_object()
        
        # Check if we should delete from Auth0 as well
        # For now, we'll just deactivate to match the existing pattern
        response = viewset.deactivate(request, pk=user_id)
        
        # Optionally delete from Auth0 if needed
        # Note: The existing system uses deactivation rather than deletion
        # If you want full deletion, uncomment below:
        """
        if user.auth0_user_id:
            try:
                auth0_service.delete_user(user.auth0_user_id)
            except Exception as auth0_error:
                logger.error(f"Failed to delete user from Auth0: {str(auth0_error)}")
        """
        
        return response
        
    except Exception as e:
        logger.error(f"[UserManagementProxy] Error removing user: {str(e)}")
        return Response(
            {"error": "Failed to remove user"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwnerOrAdmin])
def resend_invitation(request, user_id):
    """
    Proxy endpoint for resending invitations
    """
    try:
        # Find the invitation for this user
        from custom_auth.models import UserInvitation
        invitation = UserInvitation.objects.filter(
            email__in=request.user.tenant.users.filter(id=user_id).values_list('email', flat=True),
            tenant=request.user.tenant
        ).first()
        
        if not invitation:
            return Response(
                {"error": "No invitation found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create a mock viewset instance
        viewset = UserInvitationViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.kwargs = {'pk': invitation.id}
        
        # Call resend method
        response = viewset.resend(request, pk=invitation.id)
        return response
        
    except Exception as e:
        logger.error(f"[UserManagementProxy] Error resending invitation: {str(e)}")
        return Response(
            {"error": "Failed to resend invitation"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )