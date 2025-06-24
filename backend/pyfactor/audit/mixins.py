import json
from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
from .models import AuditLog
from .middleware import get_current_user, get_current_tenant_id, get_current_request


class AuditMixin(models.Model):
    """
    Model mixin that automatically tracks changes to models.
    Add this to any model you want to audit.
    
    Usage:
        class Product(AuditMixin, models.Model):
            name = models.CharField(max_length=100)
            price = models.DecimalField(max_digits=10, decimal_places=2)
    """
    
    # Fields to exclude from audit tracking
    audit_exclude_fields = ['created_at', 'updated_at', 'modified', 'modified_by']
    
    class Meta:
        abstract = True
    
    def get_audit_fields(self):
        """Get list of fields to track for auditing."""
        fields = []
        for field in self._meta.fields:
            if field.name not in self.audit_exclude_fields:
                fields.append(field.name)
        return fields
    
    def get_field_value(self, field_name):
        """Get serializable value for a field."""
        value = getattr(self, field_name)
        
        # Convert model instances to their ID
        if isinstance(value, models.Model):
            return str(value.pk)
        
        # Convert datetime objects to string
        if hasattr(value, 'isoformat'):
            return value.isoformat()
        
        # Convert UUID to string
        if hasattr(value, 'hex'):
            return str(value)
        
        return value
    
    def get_audit_data(self):
        """Get current model data for auditing."""
        data = {}
        for field in self.get_audit_fields():
            try:
                data[field] = self.get_field_value(field)
            except:
                data[field] = None
        return data
    
    def save(self, *args, **kwargs):
        """Override save to track changes."""
        is_new = self.pk is None
        old_values = {}
        changes = {}
        
        # Get old values if updating
        if not is_new:
            try:
                old_instance = self.__class__.objects.get(pk=self.pk)
                old_values = old_instance.get_audit_data()
                
                # Calculate changes
                new_values = self.get_audit_data()
                for field, new_value in new_values.items():
                    old_value = old_values.get(field)
                    if old_value != new_value:
                        changes[field] = {
                            'old': old_value,
                            'new': new_value
                        }
            except self.__class__.DoesNotExist:
                is_new = True
        
        # Save the model
        super().save(*args, **kwargs)
        
        # Create audit log
        try:
            request = get_current_request()
            audit_context = {}
            
            if request:
                audit_context = {
                    'ip_address': request.audit_context.get('ip_address'),
                    'user_agent': request.audit_context.get('user_agent'),
                    'request_id': request.audit_context.get('request_id'),
                    'session_key': request.audit_context.get('session_key'),
                }
            
            AuditLog.log_action(
                user=get_current_user(),
                tenant_id=get_current_tenant_id() or getattr(self, 'tenant_id', None),
                action='created' if is_new else 'updated',
                model_name=self.__class__.__name__,
                object_id=str(self.pk),
                object_repr=str(self),
                changes=changes if not is_new else {},
                old_values=old_values if not is_new else {},
                new_values=self.get_audit_data(),
                **audit_context
            )
        except Exception as e:
            # Don't let audit failures break the save
            import logging
            logger = logging.getLogger('audit')
            logger.error(f"Failed to create audit log for {self.__class__.__name__}: {str(e)}")
    
    def delete(self, *args, **kwargs):
        """Override delete to track deletions."""
        # Capture data before deletion
        old_values = self.get_audit_data()
        pk = self.pk
        
        # Delete the model
        super().delete(*args, **kwargs)
        
        # Create audit log
        try:
            request = get_current_request()
            audit_context = {}
            
            if request:
                audit_context = {
                    'ip_address': request.audit_context.get('ip_address'),
                    'user_agent': request.audit_context.get('user_agent'),
                    'request_id': request.audit_context.get('request_id'),
                    'session_key': request.audit_context.get('session_key'),
                }
            
            AuditLog.log_action(
                user=get_current_user(),
                tenant_id=get_current_tenant_id() or getattr(self, 'tenant_id', None),
                action='deleted',
                model_name=self.__class__.__name__,
                object_id=str(pk),
                object_repr=str(self),
                old_values=old_values,
                **audit_context
            )
        except Exception as e:
            # Don't let audit failures break the delete
            import logging
            logger = logging.getLogger('audit')
            logger.error(f"Failed to create audit log for deletion of {self.__class__.__name__}: {str(e)}")


class BulkAuditMixin:
    """
    Mixin for QuerySet to handle bulk operations auditing.
    """
    
    def bulk_create(self, objs, *args, **kwargs):
        """Audit bulk create operations."""
        result = super().bulk_create(objs, *args, **kwargs)
        
        try:
            request = get_current_request()
            audit_context = {}
            
            if request:
                audit_context = {
                    'ip_address': request.audit_context.get('ip_address'),
                    'user_agent': request.audit_context.get('user_agent'),
                    'request_id': request.audit_context.get('request_id'),
                    'session_key': request.audit_context.get('session_key'),
                }
            
            AuditLog.log_action(
                user=get_current_user(),
                tenant_id=get_current_tenant_id(),
                action='created',
                model_name=self.model.__name__,
                object_repr=f"Bulk created {len(objs)} objects",
                extra_data={
                    'count': len(objs),
                    'operation': 'bulk_create'
                },
                **audit_context
            )
        except Exception as e:
            import logging
            logger = logging.getLogger('audit')
            logger.error(f"Failed to audit bulk create: {str(e)}")
        
        return result
    
    def bulk_update(self, objs, fields, *args, **kwargs):
        """Audit bulk update operations."""
        result = super().bulk_update(objs, fields, *args, **kwargs)
        
        try:
            request = get_current_request()
            audit_context = {}
            
            if request:
                audit_context = {
                    'ip_address': request.audit_context.get('ip_address'),
                    'user_agent': request.audit_context.get('user_agent'),
                    'request_id': request.audit_context.get('request_id'),
                    'session_key': request.audit_context.get('session_key'),
                }
            
            AuditLog.log_action(
                user=get_current_user(),
                tenant_id=get_current_tenant_id(),
                action='updated',
                model_name=self.model.__name__,
                object_repr=f"Bulk updated {len(objs)} objects",
                extra_data={
                    'count': len(objs),
                    'fields': fields,
                    'operation': 'bulk_update'
                },
                **audit_context
            )
        except Exception as e:
            import logging
            logger = logging.getLogger('audit')
            logger.error(f"Failed to audit bulk update: {str(e)}")
        
        return result


class AuditQuerySet(BulkAuditMixin, models.QuerySet):
    """QuerySet that includes audit functionality."""
    pass


class AuditManager(models.Manager):
    """Manager that returns AuditQuerySet."""
    
    def get_queryset(self):
        return AuditQuerySet(self.model, using=self._db)