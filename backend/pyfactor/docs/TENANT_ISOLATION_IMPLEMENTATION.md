# Tenant Isolation Implementation Guide
**Last Updated**: August 10, 2025  
**Version**: 2.0  
**Status**: Production

---

## Overview

This document describes the multi-tenant isolation architecture implemented to prevent cross-tenant data access. After discovering critical security breaches, we implemented a comprehensive 5-layer security model.

---

## Architecture Layers

### Layer 1: Database Level (PostgreSQL RLS)

#### Row Level Security Policies
```sql
-- Enable RLS on table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON invoices
    FOR ALL
    TO application_role
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

#### Session Variables
```python
# Set by middleware for each request
with connection.cursor() as cursor:
    cursor.execute(
        "SET LOCAL app.current_tenant_id = %s",
        [str(tenant_id)]
    )
```

---

### Layer 2: Model Level (Django ORM)

#### Base Model Class
```python
# custom_auth/tenant_base_model.py
class TenantAwareModel(models.Model):
    """
    Base model for all tenant-specific data.
    Automatically includes tenant_id field.
    """
    tenant_id = models.UUIDField(
        db_index=True,
        null=True,
        help_text="The tenant ID this record belongs to"
    )
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        # Auto-set tenant_id if not provided
        if not self.tenant_id:
            from custom_auth.rls import get_current_tenant_id
            self.tenant_id = get_current_tenant_id()
        super().save(*args, **kwargs)
```

#### Model Implementation
```python
# Example model with tenant isolation
class Invoice(TenantAwareModel):
    invoice_number = models.CharField(max_length=50)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    # tenant_id inherited from TenantAwareModel
```

---

### Layer 3: ViewSet Level (REST API)

#### Base ViewSet Class
```python
# custom_auth/tenant_base_viewset.py
class TenantIsolatedViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that enforces tenant isolation.
    All ViewSets should inherit from this.
    """
    
    def get_tenant_id(self):
        """Get tenant_id from authenticated user"""
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Authentication required")
        
        tenant_id = (
            getattr(self.request.user, 'business_id', None) or
            getattr(self.request.user, 'tenant_id', None)
        )
        
        if not tenant_id:
            logger.critical(
                f"No tenant_id for user {self.request.user.email}"
            )
            raise PermissionDenied("No tenant association")
        
        return tenant_id
    
    def get_queryset(self):
        """Filter queryset by tenant_id"""
        tenant_id = self.get_tenant_id()
        queryset = super().get_queryset()
        
        # Apply tenant filter
        if hasattr(queryset.model, 'tenant_id'):
            return queryset.filter(tenant_id=tenant_id)
        elif hasattr(queryset.model, 'business_id'):
            return queryset.filter(business_id=tenant_id)
        else:
            logger.critical(
                f"Model {queryset.model.__name__} has no tenant field!"
            )
            return queryset.none()
    
    def perform_create(self, serializer):
        """Set tenant_id when creating objects"""
        tenant_id = self.get_tenant_id()
        
        if hasattr(serializer.Meta.model, 'tenant_id'):
            serializer.save(tenant_id=tenant_id)
        elif hasattr(serializer.Meta.model, 'business_id'):
            serializer.save(business_id=tenant_id)
        else:
            serializer.save()
```

#### ViewSet Implementation
```python
# Example ViewSet with tenant isolation
class InvoiceViewSet(TenantIsolatedViewSet):
    queryset = Invoice.objects.all()  # Automatically filtered
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    
    # No need to override get_queryset - filtering is automatic
```

---

### Layer 4: Middleware Level (Request Context)

#### Enhanced Tenant Middleware
```python
# custom_auth/middleware_enhanced.py
class EnhancedTenantMiddleware:
    """
    Middleware that sets tenant context for every request.
    This ensures RLS policies work at database level.
    """
    
    PUBLIC_PATHS = [
        '/health/',
        '/api/auth/signin',
        '/api/auth/signup',
        '/admin/',
        '/static/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_log = []
    
    def __call__(self, request):
        # Check if path requires tenant context
        is_public = any(
            request.path.startswith(p) for p in self.PUBLIC_PATHS
        )
        
        tenant_id = None
        
        try:
            # Get tenant_id from authenticated user
            if not is_public and request.user.is_authenticated:
                tenant_id = (
                    getattr(request.user, 'business_id', None) or
                    getattr(request.user, 'tenant_id', None)
                )
                
                if not tenant_id:
                    # Critical security event
                    self.log_security_event(
                        request=request,
                        event_type='NO_TENANT_CONTEXT',
                        severity='CRITICAL',
                        message=f"User {request.user.email} has no tenant"
                    )
                    
                    return JsonResponse({
                        'error': 'No tenant association',
                        'code': 'NO_TENANT_CONTEXT'
                    }, status=403)
                
                # Set PostgreSQL session variable
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SET LOCAL app.current_tenant_id = %s",
                        [str(tenant_id)]
                    )
                
                # Set Python context
                set_current_tenant_id(tenant_id)
                
                # Add to request for easy access
                request.tenant_id = tenant_id
            
            # Process request
            response = self.get_response(request)
            
            return response
            
        finally:
            # Clear tenant context
            if tenant_id:
                clear_current_tenant_id()
    
    def log_security_event(self, **kwargs):
        """Log security events for monitoring"""
        event = {
            'timestamp': timezone.now(),
            **kwargs
        }
        self.security_log.append(event)
        logger.critical(f"SECURITY EVENT: {event}")
```

---

### Layer 5: Monitoring Level (Runtime Security)

#### Security Monitoring
```python
# custom_auth/security_monitor.py
class SecurityMonitor:
    """
    Real-time security monitoring for tenant isolation.
    """
    
    @staticmethod
    def detect_cross_tenant_access(user, requested_tenant):
        """Detect and log cross-tenant access attempts"""
        user_tenant = user.business_id or user.tenant_id
        
        if str(user_tenant) != str(requested_tenant):
            # Critical security breach attempt
            logger.critical(
                f"🚨 CROSS-TENANT ACCESS: User {user.email} "
                f"(tenant {user_tenant}) tried to access "
                f"tenant {requested_tenant}"
            )
            
            # Send alert
            SecurityMonitor.send_security_alert(
                level='CRITICAL',
                message=f"Cross-tenant access attempt by {user.email}",
                details={
                    'user_id': user.id,
                    'user_email': user.email,
                    'user_tenant': str(user_tenant),
                    'requested_tenant': str(requested_tenant),
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            # Block access
            raise PermissionDenied("Cross-tenant access denied")
    
    @staticmethod
    def audit_query(queryset, user):
        """Audit database queries for security issues"""
        sql = str(queryset.query)
        
        # Check for missing WHERE clause on tenant field
        if 'tenant_id' not in sql and 'business_id' not in sql:
            logger.warning(
                f"⚠️ UNFILTERED QUERY: User {user.email} "
                f"executed query without tenant filter: {sql[:200]}"
            )
```

---

## Implementation Checklist

### For New Models ✅
```python
# 1. Inherit from TenantAwareModel
class NewModel(TenantAwareModel):
    # Your fields here
    pass

# 2. Add migration for tenant_id
python manage.py makemigrations
python manage.py migrate

# 3. Create RLS policy
ALTER TABLE new_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON new_model
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### For New ViewSets ✅
```python
# 1. Inherit from TenantIsolatedViewSet
class NewViewSet(TenantIsolatedViewSet):
    queryset = NewModel.objects.all()
    serializer_class = NewSerializer
    permission_classes = [IsAuthenticated]

# 2. Register in urls.py
router.register(r'new-endpoint', NewViewSet)
```

### For Custom Views ✅
```python
# Always filter by tenant explicitly
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def custom_view(request):
    tenant_id = request.user.business_id or request.user.tenant_id
    
    if not tenant_id:
        return Response(
            {"error": "No tenant association"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Always filter by tenant
    data = Model.objects.filter(tenant_id=tenant_id)
    
    return Response({"data": data})
```

---

## Security Best Practices

### DO ✅
- Always inherit from `TenantAwareModel` for tenant-specific data
- Always inherit from `TenantIsolatedViewSet` for API endpoints
- Always filter by `tenant_id` or `business_id` in custom views
- Always log security events for monitoring
- Always test with multiple tenant accounts

### DON'T ❌
- Never use `.all()` without tenant filtering
- Never use `.all_objects` or custom managers that bypass filtering
- Never trust client-provided tenant_id
- Never cache data across tenants
- Never share primary keys across tenants

---

## Testing Tenant Isolation

### Unit Tests
```python
class TenantIsolationTest(TestCase):
    def test_tenant_isolation(self):
        # Create two tenants
        tenant1 = Tenant.objects.create(name="Tenant 1")
        tenant2 = Tenant.objects.create(name="Tenant 2")
        
        # Create users for each tenant
        user1 = User.objects.create(
            email="user1@test.com",
            business_id=tenant1.id
        )
        user2 = User.objects.create(
            email="user2@test.com",
            business_id=tenant2.id
        )
        
        # Create data for each tenant
        Invoice.objects.create(
            tenant_id=tenant1.id,
            invoice_number="INV-001"
        )
        Invoice.objects.create(
            tenant_id=tenant2.id,
            invoice_number="INV-002"
        )
        
        # Test isolation
        self.client.force_authenticate(user=user1)
        response = self.client.get('/api/invoices/')
        
        # User1 should only see their invoice
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]['invoice_number'],
            'INV-001'
        )
```

### Security Audit Script
```python
# scripts/security_audit.py
def audit_tenant_isolation():
    """Audit all models and views for tenant isolation"""
    
    # Check all models
    for model in apps.get_models():
        if not hasattr(model, 'tenant_id') and \
           not hasattr(model, 'business_id'):
            print(f"⚠️ Model {model.__name__} has no tenant field")
    
    # Check all ViewSets
    for viewset in get_all_viewsets():
        if not issubclass(viewset, TenantIsolatedViewSet):
            print(f"⚠️ ViewSet {viewset.__name__} not isolated")
    
    # Check for dangerous managers
    for file in find_python_files():
        content = read_file(file)
        if '.all_objects' in content:
            print(f"🚨 CRITICAL: {file} uses .all_objects")
```

---

## Troubleshooting

### Common Issues

#### Issue: User sees no data
**Cause**: User's business_id is NULL  
**Fix**: Run `scripts/fix_user_business.py`

#### Issue: User sees all data
**Cause**: ViewSet not using TenantIsolatedViewSet  
**Fix**: Update ViewSet to inherit from TenantIsolatedViewSet

#### Issue: Cross-tenant data in reports
**Cause**: Aggregation queries not filtered  
**Fix**: Add tenant filter to all aggregation queries

---

## Migration Guide

### For Existing Code
1. Identify all models that need tenant isolation
2. Add `tenant_id` field via migration
3. Backfill existing data with correct tenant_id
4. Update all ViewSets to use TenantIsolatedViewSet
5. Add RLS policies to database tables
6. Test thoroughly with multiple tenants

### Backfill Script
```python
# scripts/backfill_tenant_ids.py
def backfill_tenant_ids():
    """Backfill tenant_id for existing records"""
    
    for model in [Invoice, Customer, Product, Service]:
        for record in model.objects.filter(tenant_id__isnull=True):
            # Try to determine tenant from relationships
            if hasattr(record, 'user'):
                record.tenant_id = record.user.business_id
            elif hasattr(record, 'business'):
                record.tenant_id = record.business.id
            else:
                print(f"Cannot determine tenant for {record}")
            
            record.save()
```

---

## Performance Considerations

### Indexing
```sql
-- Always index tenant_id for performance
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
```

### Query Optimization
```python
# Good - Single query with tenant filter
invoices = Invoice.objects.filter(
    tenant_id=tenant_id,
    status='pending'
).select_related('customer')

# Bad - Multiple queries without optimization
invoices = Invoice.objects.filter(tenant_id=tenant_id)
for invoice in invoices:
    customer = invoice.customer  # N+1 query problem
```

---

## Compliance & Regulations

### GDPR Compliance
- Tenant isolation ensures data segregation
- Each tenant's data is logically separated
- Data deletion affects only single tenant

### SOC 2 Compliance
- Access controls enforced at multiple layers
- Audit logs for all data access
- Monitoring for unauthorized access attempts

### HIPAA Compliance
- PHI data isolated per tenant
- Access logs maintained
- Encryption at rest and in transit

---

## Support

**Security Issues**: security@dottapps.com  
**Implementation Help**: dev@dottapps.com  
**Documentation**: docs@dottapps.com

---

*This document is part of the Dott Apps security documentation.*