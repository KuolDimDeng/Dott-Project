"""
Tenant verification API views.

These views handle tenant verification and access control.
"""

import logging
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.exceptions import ValidationError

from custom_auth.models import User, Tenant
from custom_auth.tenant_service import TenantManagementService
from custom_auth.rls import set_tenant_in_db

logger = logging.getLogger(__name__)

class TenantVerifyView(APIView):
    """
    API endpoint to verify a user's access to a tenant
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Verify tenant access for the given user
        
        Request body:
        - tenantId: ID of the tenant to verify
        - userId: Optional - ID of the user to check (defaults to authenticated user)
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4())[:8])
        logger.info(f"[TENANT-VERIFY-{request_id}] Processing tenant verification request")
        
        try:
            # Get tenant ID from request
            tenant_id = request.data.get('tenantId')
            if not tenant_id:
                return Response({
                    'error': 'Tenant ID is required',
                    'requestId': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Convert string to UUID
            try:
                tenant_id = uuid.UUID(tenant_id)
            except ValueError:
                return Response({
                    'error': 'Invalid tenant ID format',
                    'requestId': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Get user ID from request or use authenticated user
            user_id_param = request.data.get('userId')
            if user_id_param:
                try:
                    user_id = uuid.UUID(user_id_param)
                except ValueError:
                    return Response({
                        'error': 'Invalid user ID format',
                        'requestId': request_id
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                user_id = request.user.id
                
            # Use the tenant service to verify access
            result = TenantManagementService.verify_tenant_access(user_id, tenant_id)
            
            # Check for errors
            if result['error']:
                logger.warning(f"[TENANT-VERIFY-{request_id}] Tenant verification error: {result['error']}")
                return Response({
                    'error': result['error'],
                    'requestId': request_id
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # If user doesn't have access but we have a correct tenant ID
            if not result['has_access'] and result['correct_tenant_id']:
                logger.warning(f"[TENANT-VERIFY-{request_id}] Tenant mismatch: User {user_id} requested tenant {tenant_id} but has access to {result['correct_tenant_id']}")
                return Response({
                    'mismatch': True,
                    'correctTenantId': str(result['correct_tenant_id']),
                    'requestId': request_id
                }, status=status.HTTP_200_OK)
                
            # If user doesn't have access and no correct tenant ID
            if not result['has_access']:
                logger.warning(f"[TENANT-VERIFY-{request_id}] Access denied: User {user_id} does not have access to tenant {tenant_id}")
                return Response({
                    'error': 'Access denied',
                    'message': 'User does not have access to this tenant',
                    'requestId': request_id
                }, status=status.HTTP_403_FORBIDDEN)
                
            # Success case - user has access to the tenant
            tenant = result['tenant']
            logger.info(f"[TENANT-VERIFY-{request_id}] Tenant {tenant_id} verified for user {user_id}")
            
            # Set tenant context if RLS is enabled
            if tenant.rls_enabled:
                set_tenant_in_db(tenant_id)
                
            return Response({
                'verified': True,
                'tenantId': str(tenant.id),
                'name': tenant.name,
                'isActive': tenant.is_active,
                'isOwner': result['is_owner'],
                'requestId': request_id
            }, status=status.HTTP_200_OK)
            
        except ValidationError as ve:
            logger.error(f"[TENANT-VERIFY-{request_id}] Validation error: {str(ve)}")
            return Response({
                'error': str(ve),
                'requestId': request_id
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.exception(f"[TENANT-VERIFY-{request_id}] Unexpected error: {str(e)}")
            return Response({
                'error': 'Server error',
                'message': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 