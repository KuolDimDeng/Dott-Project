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
            with transaction.atomic():
                try:
                    # Try to get existing tenant first
                    tenant = Tenant.objects.get(owner_id=request.user.id)
                    serializer = TenantSerializer(tenant, data=request.data, partial=True)
                except Tenant.DoesNotExist:
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
                        "message": "Tenant updated successfully",
                        "data": serializer.data
                    })
                except IntegrityError as e:
                    if 'auth_tenant_owner_id_key' in str(e):
                        # If owner already has a tenant, return existing tenant
                        tenant = Tenant.objects.get(owner_id=request.user.id)
                        serializer = TenantSerializer(tenant)
                        return Response({
                            "success": True,
                            "message": "Retrieved existing tenant",
                            "data": serializer.data
                        })
                    logger.error(f"IntegrityError in tenant creation: {str(e)}")
                    raise

        except Exception as e:
            logger.error(f"Error in tenant creation/update: {str(e)}")
            return Response({
                "success": False,
                "message": "Failed to process tenant request",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)