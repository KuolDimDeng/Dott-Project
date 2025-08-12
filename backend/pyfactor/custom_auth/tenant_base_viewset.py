"""
Industry-standard base ViewSet for complete tenant isolation.
This MUST be used by ALL ViewSets to prevent data leakage.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.core.exceptions import ValidationError
from django.db import models
import logging
import json
from datetime import datetime

logger = logging.getLogger('security.tenant')


class TenantIsolatedViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that enforces strict tenant isolation.
    ALL ViewSets MUST inherit from this class.
    """
    
    def get_tenant_id(self):
        """Get tenant_id from the authenticated user."""
        if not self.request.user.is_authenticated:
            logger.error(f"Unauthenticated access attempt to {self.__class__.__name__}")
            raise PermissionDenied("Authentication required")
        
        # Try multiple sources for tenant_id
        tenant_id = getattr(self.request.user, 'tenant_id', None)
        if not tenant_id:
            tenant_id = getattr(self.request.user, 'business_id', None)
        
        if not tenant_id:
            # Log security event
            logger.critical(
                f"SECURITY: User {self.request.user.email} has no tenant_id! "
                f"Endpoint: {self.request.path}, Method: {self.request.method}"
            )
            
            # Track this in monitoring
            self.log_security_event(
                event_type='NO_TENANT_ID',
                user=self.request.user,
                severity='CRITICAL'
            )
            
            raise PermissionDenied("User not associated with any tenant")
        
        return tenant_id
    
    def get_queryset(self):
        """
        Override to ensure ALL queries are filtered by tenant.
        This is the MOST CRITICAL security method.
        """
        # Get base queryset
        queryset = super().get_queryset()
        
        # Get tenant_id
        try:
            tenant_id = self.get_tenant_id()
        except PermissionDenied:
            # Return empty queryset if no valid tenant
            logger.warning(f"Returning empty queryset for {self.__class__.__name__}")
            return queryset.none()
        
        # Check if model has tenant_id field
        model = queryset.model
        if not hasattr(model, 'tenant_id'):
            logger.error(
                f"SECURITY: Model {model.__name__} has no tenant_id field! "
                f"This is a critical security issue."
            )
            self.log_security_event(
                event_type='MODEL_NO_TENANT_FIELD',
                model=model.__name__,
                severity='CRITICAL'
            )
            # Still try to filter if possible
        
        # ALWAYS filter by tenant_id
        filtered_qs = queryset.filter(tenant_id=tenant_id)
        
        # Log query for audit
        query_count = filtered_qs.count()
        logger.debug(
            f"Tenant filtered query: {self.__class__.__name__} "
            f"for tenant {tenant_id}: {query_count} records"
        )
        
        return filtered_qs
    
    def perform_create(self, serializer):
        """Ensure tenant_id is ALWAYS set on creation."""
        tenant_id = self.get_tenant_id()
        
        # Check if tenant_id is already in validated data
        if 'tenant_id' in serializer.validated_data:
            provided_tenant_id = serializer.validated_data['tenant_id']
            if str(provided_tenant_id) != str(tenant_id):
                # SECURITY: Attempt to create for different tenant
                logger.critical(
                    f"SECURITY VIOLATION: User {self.request.user.email} "
                    f"attempted to create record for tenant {provided_tenant_id} "
                    f"but belongs to tenant {tenant_id}"
                )
                self.log_security_event(
                    event_type='CROSS_TENANT_CREATE_ATTEMPT',
                    user=self.request.user,
                    attempted_tenant=provided_tenant_id,
                    actual_tenant=tenant_id,
                    severity='CRITICAL'
                )
                raise PermissionDenied("Cannot create records for other tenants")
        
        # Force set the correct tenant_id
        serializer.save(tenant_id=tenant_id)
        
        logger.info(
            f"Created {serializer.Meta.model.__name__} "
            f"for tenant {tenant_id} by user {self.request.user.email}"
        )
    
    def perform_update(self, serializer):
        """Ensure updates cannot change tenant_id."""
        instance = serializer.instance
        
        # Check if trying to change tenant_id
        if 'tenant_id' in serializer.validated_data:
            new_tenant_id = serializer.validated_data['tenant_id']
            if str(new_tenant_id) != str(instance.tenant_id):
                # SECURITY: Attempt to change tenant_id
                logger.critical(
                    f"SECURITY VIOLATION: User {self.request.user.email} "
                    f"attempted to change tenant_id from {instance.tenant_id} "
                    f"to {new_tenant_id}"
                )
                self.log_security_event(
                    event_type='TENANT_ID_CHANGE_ATTEMPT',
                    user=self.request.user,
                    original_tenant=instance.tenant_id,
                    attempted_tenant=new_tenant_id,
                    severity='CRITICAL'
                )
                raise PermissionDenied("Cannot change tenant_id")
        
        # Ensure tenant_id stays the same
        serializer.save(tenant_id=instance.tenant_id)
    
    def perform_destroy(self, instance):
        """Verify tenant ownership before deletion."""
        tenant_id = self.get_tenant_id()
        
        if str(instance.tenant_id) != str(tenant_id):
            # SECURITY: Attempt to delete from different tenant
            logger.critical(
                f"SECURITY VIOLATION: User {self.request.user.email} "
                f"from tenant {tenant_id} attempted to delete record "
                f"from tenant {instance.tenant_id}"
            )
            self.log_security_event(
                event_type='CROSS_TENANT_DELETE_ATTEMPT',
                user=self.request.user,
                record_tenant=instance.tenant_id,
                user_tenant=tenant_id,
                severity='CRITICAL'
            )
            raise PermissionDenied("Cannot delete records from other tenants")
        
        super().perform_destroy(instance)
    
    def log_security_event(self, event_type, severity='WARNING', **kwargs):
        """
        Log security events for monitoring and alerting.
        This should integrate with your monitoring system.
        """
        event_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'user_id': getattr(self.request.user, 'id', None),
            'user_email': getattr(self.request.user, 'email', 'unknown'),
            'ip_address': self.get_client_ip(),
            'path': self.request.path,
            'method': self.request.method,
            'viewset': self.__class__.__name__,
            **kwargs
        }
        
        # Log to security logger
        logger.warning(f"SECURITY_EVENT: {json.dumps(event_data)}")
        
        # TODO: Send to monitoring system (Sentry, DataDog, etc.)
        # TODO: Send alert for CRITICAL events
        # TODO: Store in security_events table
    
    def get_client_ip(self):
        """Get client IP address from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class PublicViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet for public endpoints that don't require tenant filtering.
    Use ONLY for truly public data (e.g., country lists, public documentation).
    """
    
    def dispatch(self, request, *args, **kwargs):
        """Log all access to public endpoints for security audit."""
        logger.info(
            f"Public endpoint accessed: {self.__class__.__name__} "
            f"by {request.user if request.user.is_authenticated else 'anonymous'} "
            f"from {request.META.get('REMOTE_ADDR')}"
        )
        return super().dispatch(request, *args, **kwargs)