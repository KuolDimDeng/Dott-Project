"""
Custom authentication views package.

This package contains the various views for custom authentication functionality.
The views are organized into modules by feature area.
"""

# Import the tenant views for direct import from views package
from .tenant import TenantVerifyView, TenantCreateView

# Import signup views
from .signup import SignupView

# Explicitly document what's available when importing from this package
__all__ = [
    'TenantVerifyView', 
    'TenantCreateView',
    'SignupView'
] 