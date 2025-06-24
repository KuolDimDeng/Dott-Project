# Django Audit Trail System

## Overview

The audit trail system provides comprehensive logging of all database operations, API access, and user activities. It's designed for production use with minimal performance impact and helps with:

- **Compliance**: Track who did what, when, and from where
- **Security**: Monitor suspicious activities and unauthorized access attempts
- **Debugging**: Understand how data changed over time
- **Recovery**: Restore deleted data or revert unwanted changes

## Features

- ✅ Automatic tracking of all CRUD operations
- ✅ Captures before/after values for updates
- ✅ Records user, IP address, and user agent
- ✅ Tracks API access and authentication events
- ✅ Supports bulk operations
- ✅ Thread-safe request context
- ✅ Admin interface for viewing logs
- ✅ REST API for programmatic access
- ✅ Retention policies for compliance
- ✅ Performance optimized with database indexes

## Installation

The audit system has been added to your Django project. To start using it:

1. Run migrations:
```bash
python manage.py migrate audit
```

2. Set up retention policies (optional):
```bash
python manage.py shell
>>> from audit.models import AuditLogRetention
>>> AuditLogRetention.objects.create(model_name='Invoice', retention_days=2555)  # 7 years
>>> AuditLogRetention.objects.create(model_name='User', retention_days=90)  # 90 days
```

## Usage

### Method 1: Automatic Tracking with AuditMixin

Add `AuditMixin` to any model you want to track:

```python
from django.db import models
from audit.mixins import AuditMixin, AuditManager

class Product(AuditMixin, models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    tenant_id = models.UUIDField()
    
    objects = AuditManager()  # Optional: for bulk operations tracking
```

That's it! All create, update, and delete operations will be automatically logged.

### Method 2: Manual Logging

For custom actions or sensitive operations:

```python
from audit.models import AuditLog

# In a view
def export_report(request):
    AuditLog.log_action(
        user=request.user,
        tenant_id=request.user.tenant_id,
        action='exported',
        model_name='FinancialReport',
        object_repr='Q4 2024 Financial Report',
        ip_address=request.META.get('REMOTE_ADDR'),
        extra_data={'format': 'pdf', 'filters': {...}}
    )
```

### Method 3: Automatic Signal-Based Tracking

Models without AuditMixin are still tracked via signals (except Django system models).

## API Access

### Get audit logs via REST API:

```bash
# Get all logs (admin only)
GET /api/audit/logs/

# Filter by date range
GET /api/audit/logs/?days=7

# Filter by action
GET /api/audit/logs/?action=deleted

# Filter by model
GET /api/audit/logs/?model=Product

# Get summary statistics
GET /api/audit/logs/summary/?days=30

# Get current user's activity
GET /api/audit/logs/my_activity/
```

### Response format:
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2024-01-15T10:30:00Z",
    "user_display": {
        "id": "user123",
        "username": "john.doe",
        "email": "john@example.com"
    },
    "action": "updated",
    "model_name": "Product",
    "object_repr": "Widget XL",
    "changes": {
        "price": {
            "old": "19.99",
            "new": "24.99"
        }
    },
    "ip_address": "192.168.1.100"
}
```

## Admin Interface

Access audit logs at `/admin/audit/auditlog/`

Features:
- Search by user, model, object ID, IP address
- Filter by action type, date, success status
- Color-coded actions (created=green, deleted=red, etc.)
- View detailed changes with before/after values
- Manage retention policies

## Management Commands

### Clean up old logs:
```bash
# Clean all logs based on retention policies
python manage.py cleanup_audit_logs

# Dry run to see what would be deleted
python manage.py cleanup_audit_logs --dry-run

# Clean specific model
python manage.py cleanup_audit_logs --model Product --days 30
```

### Generate reports:
```bash
# Summary report
python manage.py audit_report

# CSV export
python manage.py audit_report --format csv --output report.csv

# Filter by date/user/model
python manage.py audit_report --days 30 --user john.doe --model Invoice
```

## Querying Audit Logs

### Find who deleted a record:
```python
from audit.models import AuditLog

log = AuditLog.objects.filter(
    model_name='Product',
    object_id='123',
    action='deleted'
).first()

print(f"Deleted by {log.user} at {log.timestamp}")
print(f"Deleted data: {log.old_values}")
```

### Track user activity:
```python
# Get all actions by a user today
from django.utils import timezone
from datetime import timedelta

user_logs = AuditLog.objects.filter(
    user=user,
    timestamp__gte=timezone.now() - timedelta(days=1)
).order_by('-timestamp')
```

### Monitor suspicious activity:
```python
# Check for mass deletions
recent_deletions = AuditLog.objects.filter(
    user=user,
    action='deleted',
    timestamp__gte=timezone.now() - timedelta(hours=1)
).count()

if recent_deletions > 10:
    # Alert administrators
    pass
```

## Performance Considerations

1. **Indexes**: The system creates indexes on commonly queried fields
2. **Async Options**: For high-volume systems, consider using Celery for async logging
3. **Retention**: Set up retention policies to prevent unlimited growth
4. **Bulk Operations**: Use the BulkAuditMixin for efficient bulk operation tracking

## Security

- Audit logs are read-only (no edit/delete in admin except for superusers)
- Sensitive data in `changes` field should be handled carefully
- IP addresses are captured from `X-Forwarded-For` header for proxy setups
- Failed operations are logged for security monitoring

## Customization

### Add custom fields to audit logs:
```python
# In your model's save method
AuditLog.log_action(
    # ... standard fields ...
    extra_data={
        'department': self.department,
        'approval_status': self.status,
        'custom_field': value
    }
)
```

### Exclude fields from tracking:
```python
class MyModel(AuditMixin, models.Model):
    # Fields to exclude from audit
    audit_exclude_fields = ['last_seen', 'view_count', 'cached_data']
```

### Custom action types:
```python
AuditLog.log_action(
    action='approved',  # Custom action
    model_name='PurchaseOrder',
    # ...
)
```

## Compliance Features

- **Data Retention**: Configurable retention periods per model
- **Immutable Logs**: Audit logs cannot be modified
- **Complete Trail**: Tracks all data access, not just modifications
- **Export Ready**: CSV/JSON export for auditors

## Troubleshooting

1. **Missing logs**: Ensure middleware is in MIDDLEWARE setting
2. **No user/tenant**: Check that middleware runs after authentication
3. **Performance issues**: Review indexes and consider archiving old logs
4. **Bulk operations not logged**: Use AuditManager for the model

## Best Practices

1. **Use AuditMixin** for all models containing sensitive data
2. **Set retention policies** based on compliance requirements
3. **Monitor failed operations** for security threats
4. **Regular cleanup** using the management command
5. **Document custom actions** in your codebase
6. **Test audit trail** in your test suite

## Example Implementation

See `/backend/pyfactor/audit/example_usage.py` for comprehensive examples including:
- Model setup with AuditMixin
- Manual logging in views
- Bulk operations
- Compliance reporting
- Admin customization
- Suspicious activity monitoring