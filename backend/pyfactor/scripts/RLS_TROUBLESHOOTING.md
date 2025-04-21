# PostgreSQL Row Level Security (RLS) Troubleshooting

## Issue Summary

We've identified and attempted to fix issues with PostgreSQL Row Level Security (RLS) in the application. The key problem is that while RLS is properly configured and enabled, the policies are not actually enforcing tenant isolation.

## What We Discovered

1. **RLS Configuration**: 
   - PostgreSQL version is 16.3, which fully supports RLS
   - RLS is correctly enabled on all tables with tenant_id columns
   - FORCE ROW LEVEL SECURITY is enabled on relevant tables
   - RLS policies are correctly defined using the current_setting function

2. **RLS Functions**:
   - We've created and validated tenant context functions
   - Session parameters are correctly set and readable
   - Function security contexts (SECURITY DEFINER vs INVOKER) are properly set

3. **Direct Testing**:
   - Setting session parameters works correctly
   - The policy definition is correct: `((tenant_id::text = current_setting('app.current_tenant_id', true)) OR (current_setting('app.current_tenant_id', true) = 'unset'))`
   - But testing shows that the policies do not restrict access based on tenant_id

## What We've Tried

1. **Fixed RLS Functions**: Created proper tenant context functions with appropriate security contexts.
2. **Updated RLS Policies**: Applied updated RLS policies to all tables with tenant_id columns.
3. **Enforced FORCE ROW LEVEL SECURITY**: Ensured RLS applies to all users including the table owner.
4. **Direct PostgreSQL Connection**: Confirmed issues persist even with direct database connection.
5. **Tested Direct Session Parameters**: Verified session parameters are set correctly.

## Possible Root Causes

1. **Cloud Database Constraints**: The AWS RDS PostgreSQL instance might have limitations on RLS.
2. **PostgreSQL Configuration**: There might be database-level settings that affect RLS functionality.
3. **Permissions Issue**: The database user might have override privileges for RLS.
4. **Database Extensions**: Some extensions might interfere with RLS functioning.

## Recommended Next Steps

1. **Contact AWS Support**: If using RDS, check with AWS support about any RLS limitations.

2. **Database Configuration Check**: Have a DBA check PostgreSQL configuration:
   ```sql
   SHOW rds.force_ssl;
   SHOW rds.logical_replication;
   SHOW rds.restrict_password_commands;
   SELECT name, setting FROM pg_settings WHERE name LIKE '%rls%';
   ```

3. **Alternative Approaches** if RLS can't be fixed:

   a. **Application-Level Filtering**: Implement filtering in Django ORM:
   ```python
   # In models.py
   class TenantFilteredModel(models.Model):
       tenant_id = models.UUIDField()
       
       class Meta:
           abstract = True
       
       @classmethod
       def get_queryset(cls, tenant_id=None):
           if tenant_id is None:
               # Admin access
               return cls.objects.all()
           return cls.objects.filter(tenant_id=tenant_id)
   ```

   b. **Schema-Based Isolation**: Use separate schemas for each tenant:
   ```sql
   CREATE SCHEMA tenant_12345;
   SET search_path TO tenant_12345, public;
   ```

   c. **Database-Level User Roles**: Create separate database roles for each tenant:
   ```sql
   CREATE ROLE tenant_12345;
   GRANT tenant_12345 TO application_user;
   SET ROLE tenant_12345;
   ```

4. **RLS Debug Logging**: Enable detailed RLS debug logging:
   ```sql
   SET client_min_messages TO DEBUG1;
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_messages = 'debug1';
   SELECT pg_reload_conf();
   ```

5. **Recreate Test Tables**: Start fresh with new test tables for isolation testing:
   ```sql
   DROP TABLE IF EXISTS rls_test_table CASCADE;
   CREATE TABLE rls_test_table (
       id SERIAL PRIMARY KEY,
       tenant_id TEXT NOT NULL,
       value TEXT NOT NULL
   );
   
   ALTER TABLE rls_test_table ENABLE ROW LEVEL SECURITY;
   ALTER TABLE rls_test_table FORCE ROW LEVEL SECURITY;
   
   CREATE POLICY tenant_isolation_policy ON rls_test_table
   FOR ALL
   USING (tenant_id = current_setting('app.current_tenant_id', TRUE) OR 
          current_setting('app.current_tenant_id', TRUE) = 'unset');
          
   INSERT INTO rls_test_table (tenant_id, value) VALUES 
   ('tenant1', 'value for tenant 1'),
   ('tenant1', 'second value for tenant 1'),
   ('tenant2', 'value for tenant 2'),
   ('tenant3', 'value for tenant 3');
   ```

## Immediate Fix

Until the RLS issue is fully resolved, implement explicit tenant filtering in all Django queries:

```python
# In middleware.py
class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            tenant_id = getattr(request.user, 'tenant_id', None)
            request.tenant_id = tenant_id
            # Set PostgreSQL session parameter anyway (even though RLS isn't working)
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_tenant_context(%s)", [str(tenant_id) if tenant_id else 'unset'])
        return self.get_response(request)

# In views/viewsets
def get_queryset(self):
    queryset = super().get_queryset()
    tenant_id = getattr(self.request, 'tenant_id', None)
    if tenant_id and not self.request.user.is_superuser:
        # Explicit tenant filtering
        queryset = queryset.filter(tenant_id=tenant_id)
    return queryset
```

## Conclusion

The RLS issue appears to be related to the specific PostgreSQL configuration rather than our code. While we've correctly configured RLS based on PostgreSQL documentation, it's not enforcing tenant isolation as expected. Until the underlying database issue is resolved, implement application-level tenant filtering to ensure data isolation.

Contact the database administrators to investigate PostgreSQL server configuration and any potential limitations of the managed database service being used. 