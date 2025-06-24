"""
Example usage of the Django Audit Trail System

This file demonstrates how to use the audit trail system in your Django models and views.
"""

# Example 1: Using AuditMixin in a model
from django.db import models
from audit.mixins import AuditMixin, AuditManager


class Product(AuditMixin, models.Model):
    """Example model with automatic audit tracking."""
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    tenant_id = models.UUIDField()
    
    # Use the AuditManager for bulk operations auditing
    objects = AuditManager()
    
    def __str__(self):
        return self.name


# Example 2: Manual audit logging in views
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from audit.models import AuditLog
from audit.middleware import get_current_request


@api_view(['POST'])
def export_financial_report(request):
    """Example view that manually logs sensitive operations."""
    try:
        # Your export logic here
        report_data = generate_report(request.data)
        
        # Log the export action
        AuditLog.log_action(
            user=request.user,
            tenant_id=request.user.tenant_id,
            action='exported',
            model_name='FinancialReport',
            object_repr=f"Financial report for {request.data.get('date_range')}",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            extra_data={
                'date_range': request.data.get('date_range'),
                'format': request.data.get('format', 'pdf'),
                'filters': request.data.get('filters', {}),
            }
        )
        
        return Response({'report': report_data}, status=status.HTTP_200_OK)
    
    except Exception as e:
        # Log failed export attempt
        AuditLog.log_action(
            user=request.user,
            tenant_id=request.user.tenant_id,
            action='failed_attempt',
            model_name='FinancialReport',
            object_repr="Failed financial report export",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            is_successful=False,
            error_message=str(e),
            extra_data=request.data
        )
        
        return Response({'error': 'Export failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Example 3: Bulk operations with audit
def bulk_update_prices(products, price_increase_percent):
    """Example of auditing bulk operations."""
    from audit.models import AuditLog
    from audit.middleware import get_current_request, get_current_user, get_current_tenant_id
    
    # Update prices
    for product in products:
        old_price = product.price
        product.price = old_price * (1 + price_increase_percent / 100)
    
    # Bulk update
    Product.objects.bulk_update(products, ['price'])
    
    # Log the bulk operation
    request = get_current_request()
    AuditLog.log_action(
        user=get_current_user(),
        tenant_id=get_current_tenant_id(),
        action='updated',
        model_name='Product',
        object_repr=f"Bulk price update for {len(products)} products",
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT') if request else None,
        extra_data={
            'product_count': len(products),
            'price_increase_percent': price_increase_percent,
            'product_ids': [str(p.id) for p in products],
        }
    )


# Example 4: Querying audit logs
from django.utils import timezone
from datetime import timedelta


def get_user_activity_report(user, days=7):
    """Get a user's activity for the past N days."""
    start_date = timezone.now() - timedelta(days=days)
    
    # Get all actions by user
    user_logs = AuditLog.objects.filter(
        user=user,
        timestamp__gte=start_date
    ).order_by('-timestamp')
    
    # Get failed login attempts
    failed_logins = AuditLog.objects.filter(
        action='failed_attempt',
        model_name='User',
        extra_data__username=user.username,
        timestamp__gte=start_date
    ).count()
    
    # Get data modifications
    modifications = user_logs.filter(
        action__in=['created', 'updated', 'deleted']
    ).count()
    
    return {
        'total_actions': user_logs.count(),
        'failed_logins': failed_logins,
        'data_modifications': modifications,
        'recent_activity': list(user_logs[:10].values(
            'timestamp', 'action', 'model_name', 'object_repr'
        ))
    }


# Example 5: Monitoring suspicious activity
def check_suspicious_activity(user):
    """Check for suspicious patterns in user activity."""
    last_hour = timezone.now() - timedelta(hours=1)
    
    # Check for rapid deletions
    recent_deletions = AuditLog.objects.filter(
        user=user,
        action='deleted',
        timestamp__gte=last_hour
    ).count()
    
    if recent_deletions > 10:
        # Alert admins
        AuditLog.log_action(
            user=user,
            action='permission_changed',
            model_name='SecurityAlert',
            object_repr=f"Suspicious deletion pattern detected for user {user.username}",
            extra_data={
                'deletion_count': recent_deletions,
                'time_window': '1 hour',
            }
        )
        
        # You might want to temporarily restrict the user
        return True
    
    return False


# Example 6: Compliance reporting
def generate_compliance_report(tenant_id, start_date, end_date):
    """Generate a compliance report for auditors."""
    # Get all logs for tenant within date range
    logs = AuditLog.objects.filter(
        tenant_id=tenant_id,
        timestamp__range=[start_date, end_date]
    )
    
    # Group by model and action
    summary = logs.values('model_name', 'action').annotate(
        count=models.Count('id')
    ).order_by('model_name', 'action')
    
    # Get user access patterns
    user_access = logs.filter(
        action__in=['viewed', 'exported']
    ).values('user__username', 'user__email').annotate(
        access_count=models.Count('id')
    ).order_by('-access_count')
    
    # Get data modifications
    modifications = logs.filter(
        action__in=['created', 'updated', 'deleted']
    ).select_related('user').order_by('-timestamp')
    
    return {
        'summary': list(summary),
        'user_access': list(user_access),
        'modifications': modifications,
        'total_events': logs.count(),
    }


# Example 7: Using audit in Django admin
from django.contrib import admin
from django.utils.html import format_html


class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'last_modified_by', 'modification_count']
    
    def last_modified_by(self, obj):
        """Show who last modified this product."""
        last_log = AuditLog.objects.filter(
            model_name='Product',
            object_id=str(obj.id),
            action='updated'
        ).order_by('-timestamp').first()
        
        if last_log and last_log.user:
            return format_html(
                '<a href="/admin/audit/auditlog/?user__id__exact={}">{}</a>',
                last_log.user.id,
                last_log.user.username
            )
        return '-'
    
    def modification_count(self, obj):
        """Show how many times this product was modified."""
        count = AuditLog.objects.filter(
            model_name='Product',
            object_id=str(obj.id),
            action__in=['created', 'updated']
        ).count()
        
        return format_html(
            '<a href="/admin/audit/auditlog/?model_name=Product&object_id={}">{} changes</a>',
            obj.id,
            count
        )


# Example 8: Retention policy setup
from audit.models import AuditLogRetention


def setup_retention_policies():
    """Set up retention policies for different models."""
    # Keep financial data for 7 years
    AuditLogRetention.objects.update_or_create(
        model_name='Invoice',
        defaults={'retention_days': 365 * 7, 'is_active': True}
    )
    
    AuditLogRetention.objects.update_or_create(
        model_name='Payment',
        defaults={'retention_days': 365 * 7, 'is_active': True}
    )
    
    # Keep general data for 1 year
    AuditLogRetention.objects.update_or_create(
        model_name='Product',
        defaults={'retention_days': 365, 'is_active': True}
    )
    
    # Keep authentication logs for 90 days
    AuditLogRetention.objects.update_or_create(
        model_name='User',
        defaults={'retention_days': 90, 'is_active': True}
    )