from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError, transaction
from custom_auth.models import Tenant
from custom_auth.serializers import TenantSerializer
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger('Pyfactor')

class TenantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_id):
        try:
            # First try to get by ID
            tenant = Tenant.objects.get(id=tenant_id)
            serializer = TenantSerializer(tenant)
            return Response(serializer.data)
        except Tenant.DoesNotExist:
            # If not found by ID, try to get by owner
            try:
                tenant = Tenant.objects.get(owner_id=request.user.id)
                serializer = TenantSerializer(tenant)
                return Response(serializer.data)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Tenant not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

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