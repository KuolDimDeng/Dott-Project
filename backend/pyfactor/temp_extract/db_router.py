import os

"""
Database router for handling row-level multi-tenancy.
This router ensures queries are properly filtered by tenant ID.
"""

class TenantAwareRouter:
    """
    A router to control database operations for tenant-aware models.
    This router doesn't change the database connection but may modify queries.
    """
    
    def db_for_read(self, model, **hints):
        """
        All reads go to the default database.
        Tenant filtering is handled at the model level.
        """
        return 'default'
        
    def db_for_write(self, model, **hints):
        """
        All writes go to the default database.
        Tenant assignment is handled at the model level.
        """
        return 'default'
        
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations between objects if they have the same tenant ID or at least one is not tenant-aware.
        """
        # If either object is not tenant-aware, allow the relation
        if not hasattr(obj1, 'tenant_id') or not hasattr(obj2, 'tenant_id'):
            return True
            
        # Both are tenant-aware, ensure they belong to the same tenant
        return obj1.tenant_id == obj2.tenant_id
        
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        All migrations go to all databases.
        """
        return True 