"""
Tenant context utilities.
This module provides functions to manage tenant context in a thread-local way.
"""

import logging
import uuid
import threading
from typing import Optional, Union

# Thread-local storage for tenant context
_thread_local = threading.local()

logger = logging.getLogger(__name__)

def set_current_tenant(tenant_id: Optional[Union[uuid.UUID, str]]) -> None:
    """
    Set the current tenant ID in thread-local storage.
    
    Args:
        tenant_id: The tenant ID to set, or None to unset
    """
    if tenant_id is None:
        if hasattr(_thread_local, 'tenant_id'):
            delattr(_thread_local, 'tenant_id')
        logger.debug("Cleared tenant context in thread-local storage")
        return
        
    if isinstance(tenant_id, str):
        try:
            tenant_id = uuid.UUID(tenant_id)
        except ValueError:
            logger.error(f"Invalid tenant ID format: {tenant_id}")
            return
            
    _thread_local.tenant_id = tenant_id
    logger.debug(f"Set tenant context to {tenant_id} in thread-local storage")
    
def get_current_tenant() -> Optional[uuid.UUID]:
    """
    Get the current tenant ID from thread-local storage.
    
    Returns:
        The current tenant ID or None if not set
    """
    return getattr(_thread_local, 'tenant_id', None)
    
def clear_current_tenant() -> None:
    """
    Clear the current tenant ID from thread-local storage.
    """
    if hasattr(_thread_local, 'tenant_id'):
        delattr(_thread_local, 'tenant_id')
    logger.debug("Cleared tenant context in thread-local storage")

# Aliases for compatibility with RLS module naming
set_current_tenant_id = set_current_tenant
get_current_tenant_id = get_current_tenant
clear_current_tenant_id = clear_current_tenant 