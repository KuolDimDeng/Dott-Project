"""
Tenant context utilities for row-level multi-tenancy.
This module provides functions to manage the current tenant in thread-local storage.
"""

import threading

# Thread-local storage for tenant context
_thread_local = threading.local()

def get_current_tenant():
    """
    Get the current tenant ID from thread-local storage.
    Returns None if no tenant is set.
    """
    return getattr(_thread_local, 'tenant_id', None)

def set_current_tenant(tenant_id):
    """
    Set the current tenant ID in thread-local storage.
    """
    _thread_local.tenant_id = tenant_id

def clear_current_tenant():
    """
    Remove the tenant ID from thread-local storage.
    """
    if hasattr(_thread_local, 'tenant_id'):
        delattr(_thread_local, 'tenant_id') 