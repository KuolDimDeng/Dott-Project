import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.core.serializers.json import DjangoJSONEncoder
import json

from .models import AuditLog
from .middleware import get_current_user, get_current_tenant_id, get_current_request

logger = logging.getLogger('audit')


def should_audit_model(sender):
    """Determine if a model should be audited."""
    # Skip audit log itself to prevent recursion
    if sender.__name__ == 'AuditLog':
        return False
    
    # Skip Django internal models
    if sender._meta.app_label in ['contenttypes', 'sessions', 'admin', 'auth']:
        # Still audit User model from auth
        if sender.__name__ == 'User':
            return True
        return False
    
    # Skip migration models
    if sender.__name__ in ['Migration']:
        return False
    
    return True


def get_model_changes(sender, instance):
    """Get changes made to a model instance."""
    if not instance.pk:
        return {}, {}
    
    try:
        old_instance = sender.objects.get(pk=instance.pk)
        old_values = {}
        new_values = {}
        changes = {}
        
        for field in instance._meta.fields:
            field_name = field.name
            old_value = getattr(old_instance, field_name)
            new_value = getattr(instance, field_name)
            
            # Serialize values for JSON storage
            if hasattr(old_value, 'pk'):
                old_value = str(old_value.pk)
            if hasattr(new_value, 'pk'):
                new_value = str(new_value.pk)
            
            if old_value != new_value:
                changes[field_name] = {
                    'old': str(old_value) if old_value is not None else None,
                    'new': str(new_value) if new_value is not None else None
                }
                old_values[field_name] = str(old_value) if old_value is not None else None
                new_values[field_name] = str(new_value) if new_value is not None else None
        
        return changes, old_values
    except sender.DoesNotExist:
        return {}, {}


@receiver(pre_save)
def audit_pre_save(sender, instance, **kwargs):
    """Capture old values before save."""
    if not should_audit_model(sender):
        return
    
    # Skip if model has AuditMixin (it handles its own auditing)
    if hasattr(instance, 'get_audit_data'):
        return
    
    if instance.pk:
        changes, old_values = get_model_changes(sender, instance)
        instance._audit_changes = changes
        instance._audit_old_values = old_values


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    """Log model creation or update."""
    if not should_audit_model(sender):
        return
    
    # Skip if model has AuditMixin (it handles its own auditing)
    if hasattr(instance, 'get_audit_data'):
        return
    
    try:
        request = get_current_request()
        audit_context = {}
        
        if request:
            audit_context = {
                'ip_address': getattr(request, 'audit_context', {}).get('ip_address'),
                'user_agent': getattr(request, 'audit_context', {}).get('user_agent'),
                'request_id': getattr(request, 'audit_context', {}).get('request_id'),
                'session_key': getattr(request, 'audit_context', {}).get('session_key'),
            }
        
        changes = {}
        old_values = {}
        
        if not created and hasattr(instance, '_audit_changes'):
            changes = instance._audit_changes
            old_values = instance._audit_old_values
            # Clean up
            delattr(instance, '_audit_changes')
            delattr(instance, '_audit_old_values')
        
        # Get current values
        new_values = {}
        for field in instance._meta.fields:
            value = getattr(instance, field.name)
            if hasattr(value, 'pk'):
                value = str(value.pk)
            new_values[field.name] = str(value) if value is not None else None
        
        tenant_id = get_current_tenant_id()
        if not tenant_id and hasattr(instance, 'tenant_id'):
            tenant_id = getattr(instance, 'tenant_id')
        
        AuditLog.log_action(
            user=get_current_user(),
            tenant_id=tenant_id,
            action='created' if created else 'updated',
            model_name=sender.__name__,
            object_id=str(instance.pk),
            object_repr=str(instance),
            changes=changes,
            old_values=old_values,
            new_values=new_values,
            **audit_context
        )
    except Exception as e:
        logger.error(f"Failed to audit save for {sender.__name__}: {str(e)}")


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    """Log model deletion."""
    if not should_audit_model(sender):
        return
    
    # Skip if model has AuditMixin (it handles its own auditing)
    if hasattr(instance, 'get_audit_data'):
        return
    
    try:
        request = get_current_request()
        audit_context = {}
        
        if request:
            audit_context = {
                'ip_address': getattr(request, 'audit_context', {}).get('ip_address'),
                'user_agent': getattr(request, 'audit_context', {}).get('user_agent'),
                'request_id': getattr(request, 'audit_context', {}).get('request_id'),
                'session_key': getattr(request, 'audit_context', {}).get('session_key'),
            }
        
        # Get final values before deletion
        old_values = {}
        for field in instance._meta.fields:
            value = getattr(instance, field.name)
            if hasattr(value, 'pk'):
                value = str(value.pk)
            old_values[field.name] = str(value) if value is not None else None
        
        tenant_id = get_current_tenant_id()
        if not tenant_id and hasattr(instance, 'tenant_id'):
            tenant_id = getattr(instance, 'tenant_id')
        
        AuditLog.log_action(
            user=get_current_user(),
            tenant_id=tenant_id,
            action='deleted',
            model_name=sender.__name__,
            object_id=str(instance.pk),
            object_repr=str(instance),
            old_values=old_values,
            **audit_context
        )
    except Exception as e:
        logger.error(f"Failed to audit delete for {sender.__name__}: {str(e)}")


# Authentication signals
@receiver(user_logged_in)
def audit_user_login(sender, request, user, **kwargs):
    """Log successful user login."""
    try:
        AuditLog.log_action(
            user=user,
            tenant_id=get_current_tenant_id(),
            action='login',
            model_name='User',
            object_id=str(user.pk),
            object_repr=str(user),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            is_successful=True,
            extra_data={
                'username': user.username,
                'email': getattr(user, 'email', None),
            }
        )
    except Exception as e:
        logger.error(f"Failed to audit user login: {str(e)}")


@receiver(user_logged_out)
def audit_user_logout(sender, request, user, **kwargs):
    """Log user logout."""
    if not user:
        return
        
    try:
        AuditLog.log_action(
            user=user,
            tenant_id=get_current_tenant_id(),
            action='logout',
            model_name='User',
            object_id=str(user.pk),
            object_repr=str(user),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            is_successful=True,
        )
    except Exception as e:
        logger.error(f"Failed to audit user logout: {str(e)}")


@receiver(user_login_failed)
def audit_failed_login(sender, credentials, request, **kwargs):
    """Log failed login attempts."""
    try:
        AuditLog.log_action(
            user=None,
            action='failed_attempt',
            model_name='User',
            object_repr=f"Failed login for {credentials.get('username', 'unknown')}",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            is_successful=False,
            error_message="Invalid credentials",
            extra_data={
                'username': credentials.get('username', 'unknown'),
            }
        )
    except Exception as e:
        logger.error(f"Failed to audit failed login: {str(e)}")