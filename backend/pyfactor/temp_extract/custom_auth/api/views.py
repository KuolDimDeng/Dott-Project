from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import connection
from django.conf import settings
from custom_auth.models import Tenant
import logging
import traceback
import uuid
import json

logger = logging.getLogger(__name__)

class ValidateTenantView(APIView):
    """
    API to validate that a tenant exists and is valid.
    
    This supports RLS-enabled tenant verification.
    """
    # Don't require authentication for validation as it may be used during auth flow
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        try:
            # Get request ID for tracing
            request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
            
            # Get tenant ID from request body
            data = request.data
            tenant_id = data.get('tenantId')
            
            if not tenant_id:
                logger.warning(f"[TenantValidate:{request_id}] Missing tenant ID in request")
                return Response({'valid': False, 'message': 'Tenant ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Log validation attempt with request details
            logger.info(f"[TenantValidate:{request_id}] Validating tenant {tenant_id}, " 
                       f"Auth: {bool(request.auth)}, User: {getattr(request.user, 'id', 'Anonymous')}")
            
            # Check request headers for debugging
            auth_header = request.headers.get('Authorization', 'None')
            logger.debug(f"[TenantValidate:{request_id}] Auth header present: {bool(auth_header and auth_header != 'None')}")
            
            # First check if tenant exists in the database
            try:
                tenant = Tenant.objects.filter(id=tenant_id).first()
                
                if tenant:
                    logger.info(f"[TenantValidate:{request_id}] Found tenant {tenant_id}, owner: {tenant.owner_id}")
                    return Response({
                        'valid': True,
                        'tenantId': str(tenant.id),
                        'message': 'Tenant validated successfully'
                    })
                else:
                    # If tenant not found, try to find the user's assigned tenant
                    user_id = None
                    
                    # Check if user is authenticated
                    if request.user and request.user.is_authenticated:
                        user_id = request.user.id
                        logger.info(f"[TenantValidate:{request_id}] Tenant {tenant_id} not found, checking for user {user_id}'s tenant")
                        
                        # Look up user's tenant
                        user_tenant = Tenant.objects.filter(owner_id=user_id).first()
                        
                        if user_tenant:
                            logger.info(f"[TenantValidate:{request_id}] Found tenant {user_tenant.id} for user {user_id}")
                            return Response({
                                'valid': False,
                                'correctTenantId': str(user_tenant.id),
                                'message': f"Tenant {tenant_id} not found, but user has tenant {user_tenant.id}"
                            })
                    
                    # Try raw SQL as a fallback (in case of ORM issues)
                    with connection.cursor() as cursor:
                        # Try to find the tenant directly in the database
                        cursor.execute("SELECT id, owner_id FROM custom_auth_tenant WHERE id = %s", [tenant_id])
                        tenant_record = cursor.fetchone()
                        
                        if tenant_record:
                            logger.info(f"[TenantValidate:{request_id}] Found tenant {tenant_id} via direct SQL")
                            return Response({
                                'valid': True,
                                'tenantId': str(tenant_record[0]),
                                'message': 'Tenant validated via direct database query'
                            })
                        
                        # If user is authenticated, try to find their tenant
                        if user_id:
                            cursor.execute("SELECT id FROM custom_auth_tenant WHERE owner_id = %s LIMIT 1", [user_id])
                            user_tenant_record = cursor.fetchone()
                            
                            if user_tenant_record:
                                logger.info(f"[TenantValidate:{request_id}] Found tenant {user_tenant_record[0]} for user {user_id} via direct SQL")
                                return Response({
                                    'valid': False,
                                    'correctTenantId': str(user_tenant_record[0]),
                                    'message': f"Tenant {tenant_id} not found, but user has tenant {user_tenant_record[0]}"
                                })
                    
                    # No tenant found
                    logger.warning(f"[TenantValidate:{request_id}] Tenant {tenant_id} not found and no alternative tenant available")
                    return Response({
                        'valid': False,
                        'message': f"Tenant {tenant_id} not found"
                    })
            
            except Exception as db_error:
                logger.error(f"[TenantValidate:{request_id}] Database error validating tenant: {str(db_error)}", 
                            exc_info=True, extra={'error': str(db_error), 'traceback': traceback.format_exc()})
                
                return Response({
                    'valid': False,
                    'message': f"Error validating tenant: {str(db_error)}",
                    'error': 'database_error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            logger.error(f"[TenantValidate] Unexpected error: {str(e)}", 
                        exc_info=True, extra={'error': str(e), 'traceback': traceback.format_exc()})
            
            return Response({
                'valid': False,
                'message': f"Unexpected error: {str(e)}",
                'error': 'server_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TenantExistsView(APIView):
    """
    API to check if a tenant exists.
    
    Similar to ValidateTenantView but with a simplified response.
    """
    # Don't require authentication for checking existence
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        try:
            # Get request ID for tracing
            request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
            
            # Get tenant ID from request body
            data = request.data
            tenant_id = data.get('tenantId')
            
            if not tenant_id:
                logger.warning(f"[TenantExists:{request_id}] Missing tenant ID in request")
                return Response({'exists': False, 'message': 'Tenant ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Log validation attempt with request details
            logger.info(f"[TenantExists:{request_id}] Checking if tenant {tenant_id} exists, " 
                       f"Auth: {bool(request.auth)}, User: {getattr(request.user, 'id', 'Anonymous')}")
            
            # Check request headers for debugging
            auth_header = request.headers.get('Authorization', 'None')
            logger.debug(f"[TenantExists:{request_id}] Auth header present: {bool(auth_header and auth_header != 'None')}")
            
            # First check if tenant exists in the database
            try:
                tenant_exists = Tenant.objects.filter(id=tenant_id).exists()
                
                if tenant_exists:
                    logger.info(f"[TenantExists:{request_id}] Tenant {tenant_id} exists")
                    return Response({
                        'exists': True,
                        'tenantId': tenant_id,
                        'message': 'Tenant exists'
                    })
                else:
                    # If tenant not found, try to find the user's assigned tenant
                    user_id = None
                    
                    # Check if user is authenticated
                    if request.user and request.user.is_authenticated:
                        user_id = request.user.id
                        logger.info(f"[TenantExists:{request_id}] Tenant {tenant_id} not found, checking for user {user_id}'s tenant")
                        
                        # Look up user's tenant
                        user_tenant = Tenant.objects.filter(owner_id=user_id).first()
                        
                        if user_tenant:
                            logger.info(f"[TenantExists:{request_id}] Found tenant {user_tenant.id} for user {user_id}")
                            return Response({
                                'exists': False,
                                'correctTenantId': str(user_tenant.id),
                                'message': f"Tenant {tenant_id} not found, but user has tenant {user_tenant.id}"
                            })
                    
                    # Try raw SQL as a fallback (in case of ORM issues)
                    with connection.cursor() as cursor:
                        # Try to find the tenant directly
                        cursor.execute("SELECT EXISTS(SELECT 1 FROM custom_auth_tenant WHERE id = %s)", [tenant_id])
                        exists_record = cursor.fetchone()
                        
                        if exists_record and exists_record[0]:
                            logger.info(f"[TenantExists:{request_id}] Tenant {tenant_id} exists via direct SQL")
                            return Response({
                                'exists': True,
                                'tenantId': tenant_id,
                                'message': 'Tenant exists via direct database query'
                            })
                        
                        # If user is authenticated, try to find their tenant
                        if user_id:
                            cursor.execute("SELECT id FROM custom_auth_tenant WHERE owner_id = %s LIMIT 1", [user_id])
                            user_tenant_record = cursor.fetchone()
                            
                            if user_tenant_record:
                                logger.info(f"[TenantExists:{request_id}] Found tenant {user_tenant_record[0]} for user {user_id} via direct SQL")
                                return Response({
                                    'exists': False,
                                    'correctTenantId': str(user_tenant_record[0]),
                                    'message': f"Tenant {tenant_id} not found, but user has tenant {user_tenant_record[0]}"
                                })
                    
                    # No tenant found
                    logger.warning(f"[TenantExists:{request_id}] Tenant {tenant_id} does not exist and no alternative tenant available")
                    return Response({
                        'exists': False,
                        'message': f"Tenant {tenant_id} does not exist"
                    })
            
            except Exception as db_error:
                logger.error(f"[TenantExists:{request_id}] Database error checking tenant: {str(db_error)}", 
                            exc_info=True, extra={'error': str(db_error), 'traceback': traceback.format_exc()})
                
                return Response({
                    'exists': False,
                    'message': f"Error checking tenant: {str(db_error)}",
                    'error': 'database_error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            logger.error(f"[TenantExists] Unexpected error: {str(e)}", 
                        exc_info=True, extra={'error': str(e), 'traceback': traceback.format_exc()})
            
            return Response({
                'exists': False,
                'message': f"Unexpected error: {str(e)}",
                'error': 'server_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 