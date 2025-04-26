from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError, transaction
from custom_auth.models import Tenant, User
from custom_auth.serializers import TenantSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

logger = logging.getLogger('Pyfactor')

class TenantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_id=None):
        try:
            # Log request details
            logger.debug(f"[TenantDetail] GET request for tenant {tenant_id} by user {request.user.id}")
            logger.debug(f"[TenantDetail] Available tenants for user:", {
                'user_id': request.user.id,
                'email': request.user.email,
                'tenants': list(Tenant.objects.filter(owner_id=request.user.id).values('id', 'schema_name'))
            })

            tenant = get_object_or_404(Tenant, id=tenant_id)
            
            # Check if user has access to this tenant
            if str(tenant.owner_id) != str(request.user.id):
                logger.warning(f"[TenantDetail] User {request.user.id} attempted to access tenant {tenant_id} but is not the owner")
                return Response({
                    'error': 'You do not have access to this tenant',
                    'detail': 'User is not the owner of this tenant'
                }, status=status.HTTP_403_FORBIDDEN)
            
            return Response({
                'id': str(tenant.id),
                'schema_name': str(tenant.id),
                'owner': {
                    'id': str(tenant.owner_id),
                    'email': User.objects.filter(id=tenant.owner_id).values_list('email', flat=True).first() or 'unknown'
                },
                'status': tenant.setup_status,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                'updated_at': tenant.updated_at.isoformat() if tenant.updated_at else None
            })
        except Exception as e:
            logger.error(f"[TenantDetail] Error getting tenant details: {str(e)}")
            return Response({
                'error': 'Failed to get tenant details',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, tenant_id):
        try:
            # Acquire lock to prevent race conditions
            from custom_auth.utils import acquire_user_lock, release_user_lock
            
            if not acquire_user_lock(request.user.id):
                return Response({
                    "success": False,
                    "message": "System busy, please try again later"
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            try:
                with transaction.atomic():
                    # First check if a tenant already exists for this user
                    existing_tenant = Tenant.objects.filter(owner_id=request.user.id).select_for_update().first()
                    
                    if existing_tenant:
                        logger.info(f"User {request.user.id} already has tenant {existing_tenant.id}, returning existing tenant")
                        # If tenantId in the URL doesn't match the existing tenant's ID, this might be a frontend sync issue
                        if str(existing_tenant.id) != tenant_id:
                            logger.warning(
                                f"Tenant ID mismatch - Request used {tenant_id} but user already has {existing_tenant.id}. "
                                f"Returning existing tenant as source of truth."
                            )
                        
                        # Update any fields if needed but don't change the ID
                        serializer = TenantSerializer(existing_tenant, data=request.data, partial=True)
                        
                        if serializer.is_valid():
                            serializer.save()
                        
                        return Response({
                            "success": True,
                            "message": "Retrieved existing tenant",
                            "data": TenantSerializer(existing_tenant).data
                        })
                    
                    # Check if a tenant with this ID already exists but is assigned to another user
                    conflicting_tenant = Tenant.objects.filter(id=tenant_id).exclude(owner_id=request.user.id).first()
                    if conflicting_tenant:
                        logger.error(f"Attempted to create tenant with ID {tenant_id} for user {request.user.id}, "
                                    f"but that ID is already assigned to user {conflicting_tenant.owner_id}")
                        return Response({
                            "success": False,
                            "message": "Cannot create tenant with specified ID",
                            "error": "ID conflict"
                        }, status=status.HTTP_409_CONFLICT)
                    
                    # Create new tenant if none exists
                    data = request.data.copy()
                    data['id'] = tenant_id
                    data['owner'] = request.user.id
                    data.setdefault('schema_name', f'tenant_{str(tenant_id).replace("-", "_")}')
                    data.setdefault('setup_status', 'not_started')
                    serializer = TenantSerializer(data=data)

                    if not serializer.is_valid():
                        logger.error(f"Serializer validation error: {serializer.errors}")
                        return Response(
                            {
                                "success": False,
                                "message": "Invalid tenant data",
                                "errors": serializer.errors
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    try:
                        tenant = serializer.save()
                        return Response({
                            "success": True,
                            "message": "Tenant created successfully",
                            "data": serializer.data
                        })
                    except IntegrityError as e:
                        if 'auth_tenant_owner_id_key' in str(e):
                            # Try once more to get existing tenant (race condition)
                            tenant = Tenant.objects.get(owner_id=request.user.id)
                            serializer = TenantSerializer(tenant)
                            return Response({
                                "success": True,
                                "message": "Retrieved existing tenant",
                                "data": serializer.data
                            })
                        logger.error(f"IntegrityError in tenant creation: {str(e)}")
                        raise
            finally:
                release_user_lock(request.user.id)

        except Exception as e:
            logger.error(f"Error in tenant creation/update: {str(e)}")
            return Response({
                "success": False,
                "message": "Failed to process tenant request",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TenantExistsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Check if a tenant exists"""
        try:
            tenant_id = request.data.get('tenantId')
            if not tenant_id:
                return Response({
                    'exists': False,
                    'error': 'No tenant ID provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # First check if this user owns any tenant
            user_tenant = Tenant.objects.filter(owner_id=request.user.id).first()
            if user_tenant:
                # If user has a tenant, check if it matches the provided ID
                exists = str(user_tenant.id) == str(tenant_id)
                return Response({
                    'exists': exists,
                    'correctTenantId': str(user_tenant.id) if not exists else None,
                    'message': 'User already has a different tenant' if not exists else 'Tenant found'
                })
            
            # If user has no tenant, check if the provided ID exists but is owned by someone else
            other_tenant = Tenant.objects.filter(id=tenant_id).exists()
            return Response({
                'exists': other_tenant,
                'message': 'Tenant exists but belongs to another user' if other_tenant else 'Tenant not found'
            })
            
        except Exception as e:
            logger.error(f"Error checking tenant existence: {str(e)}")
            return Response({
                'exists': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CurrentTenantView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Log request details
            logger.debug(f"[CurrentTenant] Finding tenant for user {request.user.id}")
            
            # Get all tenants for the user
            tenants = Tenant.objects.filter(owner_id=request.user.id).values('id', 'schema_name')
            tenant_list = list(tenants)
            
            logger.debug(f"[CurrentTenant] Found tenants:", {
                'user_id': request.user.id,
                'email': request.user.email,
                'tenants': tenant_list
            })
            
            if not tenant_list:
                return Response({
                    'error': 'No tenant found for user',
                    'detail': 'User does not own any tenants'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # If user has multiple tenants, try to find the primary one
            # For now, we'll just return the first one
            tenant = tenant_list[0]
            
            return Response({
                'id': str(tenant['id']),
                'schema_name': str(tenant['schema_name']),
                'is_primary': True
            })
        except Exception as e:
            logger.error(f"[CurrentTenant] Error finding current tenant: {str(e)}")
            return Response({
                'error': 'Failed to find current tenant',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ValidateTenantView(APIView):
    """
    View to validate a tenant ID
    Checks if a tenant ID is valid and returns the correct tenant ID if it's not
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Validate a tenant ID via GET request"""
        tenant_id = request.query_params.get('tenantId')
        return self._validate_tenant(tenant_id, request.user)
    
    def post(self, request):
        """Validate a tenant ID via POST request"""
        tenant_id = request.data.get('tenantId')
        return self._validate_tenant(tenant_id, request.user)
    
    def _validate_tenant(self, tenant_id, user):
        """Common validation logic for both GET and POST"""
        if not tenant_id:
            return Response({
                'valid': False,
                'error': 'No tenant ID provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            logger.debug(f"[ValidateTenant] Validating tenant ID: {tenant_id}")
            
            # First check if this tenant ID exists
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                
                # Check if it belongs to this user
                if tenant.owner_id == user.id:
                    return Response({
                        'valid': True,
                        'tenantId': str(tenant.id),
                        'schemaName': str(tenant.id),
                        'message': 'Tenant ID is valid'
                    })
                else:
                    # If tenant exists but belongs to another user, try to find user's tenant
                    user_tenant = Tenant.objects.filter(owner_id=user.id).first()
                    
                    if user_tenant:
                        return Response({
                            'valid': False,
                            'correctTenantId': str(user_tenant.id),
                            'schemaName': str(user_tenant.id),
                            'message': 'Tenant ID belongs to another user. Corrected to your tenant.'
                        })
                    else:
                        return Response({
                            'valid': False,
                            'message': 'Tenant ID exists but belongs to another user'
                        }, status=status.HTTP_403_FORBIDDEN)
            except Tenant.DoesNotExist:
                # Tenant does not exist, check if user has another tenant
                user_tenant = Tenant.objects.filter(owner_id=user.id).first()
                
                if user_tenant:
                    return Response({
                        'valid': False,
                        'correctTenantId': str(user_tenant.id),
                        'schemaName': str(user_tenant.id),
                        'message': 'Invalid tenant ID. Corrected to your tenant.'
                    })
                else:
                    # Known good fallback tenants for development
                    fallback_tenants = [
                        '18609ed2-1a46-4d50-bc4e-483d6e3405ff',
                        'b7fee399-ffca-4151-b636-94ccb65b3cd0',
                        '1cb7418e-34e7-40b7-b165-b79654efe21f'
                    ]
                    
                    if tenant_id in fallback_tenants:
                        return Response({
                            'valid': True,
                            'tenantId': tenant_id,
                            'message': 'Using fallback tenant ID',
                            'fallback': True
                        })
                    
                    return Response({
                        'valid': False,
                        'correctTenantId': fallback_tenants[0],
                        'message': 'Invalid tenant ID and user has no tenants. Using fallback.'
                    })
        except Exception as e:
            logger.error(f"Error validating tenant: {str(e)}")
            return Response({
                'valid': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TenantByEmailView(APIView):
    """
    API endpoint to get tenant information for a user by their email address.
    This helps ensure each user has exactly one tenant, even if they have multiple
    authentication mechanisms.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, email):
        """
        Get tenant information for a user by email
        
        Args:
            request: HTTP request
            email: Email address to find tenant for
            
        Returns:
            Response with tenant ID if found
        """
        logger.info(f"Looking up tenant by email: {email}")
        
        # Sanitize and validate the email
        try:
            validate_email(email)
        except ValidationError:
            logger.warning(f"Invalid email address format: {email}")
            return Response(
                {"detail": "Invalid email address format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Look up user by email address
        try:
            user = User.objects.filter(email=email).first()
            
            if not user:
                logger.info(f"No user found with email: {email}")
                return Response(
                    {"detail": "No user found with this email address"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # If user exists, check if they have an associated tenant
            if user.tenant:
                tenant = user.tenant
                if tenant:
                    logger.info(f"Found tenant for email {email}: {tenant.id}")
                    return Response({
                        "tenantId": str(tenant.id),
                        "schemaName": str(tenant.id),
                        "name": tenant.name,
                        "isActive": tenant.is_active
                    })
            
            # If no tenant directly associated with user, check for any tenant where user is the owner
            tenant = Tenant.objects.filter(owner_id=user.pk).first()
            if tenant:
                logger.info(f"Found tenant where user is owner for email {email}: {tenant.id}")
                
                # Update user-tenant association for future lookups
                user.tenant = tenant
                user.save(update_fields=['tenant_id'])
                
                return Response({
                    "tenantId": str(tenant.id),
                    "schemaName": str(tenant.id),
                    "name": tenant.name,
                    "isActive": tenant.is_active
                })
            
            # No tenant found for this user
            logger.info(f"No tenant found for email: {email}")
            return Response(
                {"detail": "No tenant associated with this email address"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        except Exception as e:
            logger.error(f"Error looking up tenant by email {email}: {str(e)}")
            return Response(
                {"detail": "Error processing request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class VerifyTenantOwnerView(APIView):
    """
    API endpoint to verify if the current user is the owner of a specific tenant.
    
    This is a critical endpoint for the menu privileges system, used to determine
    if a user should have unrestricted access to all menu items.
    
    Version: 0001
    Created: 2024-07-19
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Check if the current authenticated user is the owner of the specified tenant
        
        Query parameters:
            - tenant_id: The UUID of the tenant to check
        
        Returns:
            200 OK with JSON: { "is_owner": true/false }
            400 Bad Request if tenant_id is missing
            404 Not Found if tenant doesn't exist
        """
        tenant_id = request.query_params.get('tenant_id')
        
        if not tenant_id:
            return Response({
                'is_owner': False,
                'error': 'Missing tenant_id parameter'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the current user ID
        user_id = str(request.user.id)
        
        try:
            # Find the tenant
            tenant = get_object_or_404(Tenant, id=tenant_id)
            
            # Check if tenant owner_id matches current user
            is_owner = str(tenant.owner_id) == user_id
            
            # Log the result for debugging
            logging.info(f"[VerifyTenantOwner] User {user_id} is owner of tenant {tenant_id}: {is_owner}")
            
            return Response({
                'is_owner': is_owner,
                'tenant_id': tenant_id,
                'tenant_name': tenant.name
            })
            
        except Tenant.DoesNotExist:
            return Response({
                'is_owner': False,
                'error': 'Tenant not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logging.error(f"[VerifyTenantOwner] Error: {str(e)}")
            return Response({
                'is_owner': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)