"""
Context management for tenant identification.
This module provides functions to set, get, and clear the current tenant ID
for use with Row Level Security in PostgreSQL.
"""

import logging
import threading
import uuid
from django.db import connection

# Create a thread-local storage for holding tenant context
_thread_local = threading.local()

logger = logging.getLogger(__name__)

def get_current_tenant():
    """
    Get the current tenant ID from thread-local storage.
    
    Returns:
        UUID or None: The current tenant ID or None if not set
    """
    tenant_id = getattr(_thread_local, 'tenant_id', None)
    if tenant_id:
        return tenant_id
    
    # Try to get from database session if available
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
        result = cursor.fetchone()[0]
        
        if result and result != 'unset':
            return uuid.UUID(result)
    except Exception as e:
        logger.debug(f"Error getting tenant from database session: {str(e)}")
    
    return None

def set_current_tenant(tenant_id):
    """
    Set the current tenant ID in thread-local storage and database session.
    
    Args:
        tenant_id (UUID): The tenant ID to set
    """
    if tenant_id is None:
        clear_current_tenant()
        return
    
    # Convert to string if UUID
    tenant_id_str = str(tenant_id)
    
    # Set in thread-local storage
    setattr(_thread_local, 'tenant_id', tenant_id)
    
    # Set in database session
    try:
        cursor = connection.cursor()
        cursor.execute(f"SET app.current_tenant_id = '{tenant_id_str}'")
        logger.debug(f"Set current tenant in database session to {tenant_id_str}")
    except Exception as e:
        logger.error(f"Error setting tenant in database session: {str(e)}")

def clear_current_tenant():
    """
    Clear the current tenant ID from thread-local storage and database session.
    """
    # Clear from thread-local storage
    if hasattr(_thread_local, 'tenant_id'):
        delattr(_thread_local, 'tenant_id')
    
    # Clear from database session
    try:
        cursor = connection.cursor()
        cursor.execute("SET app.current_tenant_id = 'unset'")
        logger.debug("Cleared tenant from database session")
    except Exception as e:
        logger.error(f"Error clearing tenant in database session: {str(e)}")

class TenantContextManager:
    """
    Context manager for tenant operations.
    
    Usage:
        with TenantContextManager(tenant_id):
            # Operations in this block will use the specified tenant
    """
    def __init__(self, tenant_id):
        self.tenant_id = tenant_id
        self.previous_tenant_id = None
    
    def __enter__(self):
        self.previous_tenant_id = get_current_tenant()
        set_current_tenant(self.tenant_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        set_current_tenant(self.previous_tenant_id) 