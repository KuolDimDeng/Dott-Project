"""
Tenant-aware ViewSets for secure multi-tenant operations
"""
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework import status
from django.db.models import QuerySet
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)


class SecureCustomerViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that enforces tenant isolation for all operations.
    
    This ViewSet automatically filters all queries by the current user's tenant_id
    and ensures that users can only access data from their own tenant.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Override to filter queryset by tenant_id
        """
        # Get the base queryset from the model
        if hasattr(self, 'queryset') and self.queryset is not None:
            queryset = self.queryset.all()
        else:
            queryset = self.get_serializer_class().Meta.model.objects.all()
        
        # Check if user has tenant_id
        if not hasattr(self.request.user, 'tenant_id') or not self.request.user.tenant_id:
            logger.warning(f"User {self.request.user.id} has no tenant_id")
            return queryset.none()
        
        # Filter by tenant_id if the model has tenant_id field
        if hasattr(queryset.model, 'tenant_id'):
            return queryset.filter(tenant_id=self.request.user.tenant_id)
        
        # If no tenant_id field, return empty queryset for security
        logger.warning(f"Model {queryset.model.__name__} has no tenant_id field")
        return queryset.none()
    
    def perform_create(self, serializer):
        """
        Override to set tenant_id on creation
        """
        if not hasattr(self.request.user, 'tenant_id') or not self.request.user.tenant_id:
            raise PermissionDenied("User has no tenant access")
        
        # Set tenant_id if the model supports it
        if hasattr(serializer.Meta.model, 'tenant_id'):
            serializer.save(tenant_id=self.request.user.tenant_id)
        else:
            serializer.save()
    
    def get_object(self):
        """
        Override to ensure tenant isolation on individual object access
        """
        obj = super().get_object()
        
        # Check tenant ownership if model has tenant_id
        if hasattr(obj, 'tenant_id'):
            if not hasattr(self.request.user, 'tenant_id') or obj.tenant_id != self.request.user.tenant_id:
                # Return 404 instead of 403 to avoid information disclosure
                from django.http import Http404
                raise Http404("Object not found")
        
        return obj
    
    def list(self, request, *args, **kwargs):
        """
        Override list to add tenant context logging
        """
        logger.debug(f"User {request.user.id} (tenant {getattr(request.user, 'tenant_id', 'None')}) listing {self.get_serializer_class().Meta.model.__name__}")
        return super().list(request, *args, **kwargs)