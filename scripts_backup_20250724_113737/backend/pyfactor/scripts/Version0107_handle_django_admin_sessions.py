#!/usr/bin/env python3
"""
Version0107_handle_django_admin_sessions.py

Handle Django admin access without Django sessions.
Creates a custom admin authentication backend using our session_manager.

Author: Claude
Date: 2025-01-18
"""

import os
import sys

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_admin_auth_backend():
    """Create custom admin authentication backend."""
    print("\n=== Creating Admin Authentication Backend ===")
    
    backend_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'session_manager',
        'admin_auth.py'
    )
    
    admin_auth_code = '''"""
Custom authentication backend for Django admin using session_manager.
This allows Django admin to work without django.contrib.sessions.
"""

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from .models import UserSession

User = get_user_model()

class SessionManagerAdminBackend(ModelBackend):
    """
    Custom authentication backend that uses our session_manager
    for Django admin authentication.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """Authenticate user for admin access."""
        try:
            # Try to authenticate normally
            user = super().authenticate(request, username=username, password=password, **kwargs)
            
            if user and user.is_staff:
                # Create a session using our custom session manager
                from .services import session_service
                
                # Get request metadata
                request_meta = {
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')
                }
                
                # Create session
                session = session_service.create_session(
                    user=user,
                    access_token=f"admin_{user.id}",  # Dummy token for admin
                    request_meta=request_meta,
                    session_type='admin',
                    session_data={'is_admin_session': True}
                )
                
                # Store session ID in request for middleware
                request.admin_session_id = str(session.session_id)
                
                return user
                
        except Exception as e:
            print(f"[AdminAuth] Authentication error: {e}")
            
        return None
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def get_user(self, user_id):
        """Get user by ID."""
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
'''
    
    try:
        with open(backend_path, 'w') as f:
            f.write(admin_auth_code)
        print(f"✓ Created admin authentication backend at {backend_path}")
        return True
    except Exception as e:
        print(f"✗ Error creating admin auth backend: {e}")
        return False

def create_admin_middleware():
    """Create middleware to handle admin sessions."""
    print("\n=== Creating Admin Session Middleware ===")
    
    middleware_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'session_manager',
        'admin_middleware.py'
    )
    
    middleware_code = '''"""
Middleware to handle Django admin sessions using session_manager.
"""

from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import logout
from .models import UserSession
from .services import session_service

class AdminSessionMiddleware(MiddlewareMixin):
    """
    Handle session management for Django admin without django.contrib.sessions.
    """
    
    def process_request(self, request):
        """Process incoming request for admin sessions."""
        # Only process admin URLs
        if not request.path.startswith('/admin/'):
            return None
        
        # Check for session cookie
        session_id = request.COOKIES.get('admin_session_id')
        
        if session_id:
            try:
                # Get session from our custom session manager
                session = session_service.get_session(session_id)
                
                if session and session.is_active:
                    # Attach user to request
                    request.user = session.user
                    request.session_obj = session
                    
                    # Create a mock session object for admin compatibility
                    request.session = MockAdminSession(session)
                else:
                    # Invalid session
                    request.user = None
                    request.session = MockAdminSession(None)
                    
            except Exception as e:
                print(f"[AdminMiddleware] Error loading session: {e}")
                request.user = None
                request.session = MockAdminSession(None)
        else:
            request.session = MockAdminSession(None)
        
        return None
    
    def process_response(self, request, response):
        """Process outgoing response for admin sessions."""
        # Set session cookie if we created a new admin session
        if hasattr(request, 'admin_session_id'):
            response.set_cookie(
                'admin_session_id',
                request.admin_session_id,
                max_age=86400,  # 1 day
                httponly=True,
                secure=True,
                samesite='Lax'
            )
        
        return response


class MockAdminSession:
    """
    Mock session object for Django admin compatibility.
    Provides the minimal interface required by Django admin.
    """
    
    def __init__(self, session_obj):
        self.session_obj = session_obj
        self._data = session_obj.session_data if session_obj else {}
    
    def get(self, key, default=None):
        """Get value from session data."""
        return self._data.get(key, default)
    
    def set(self, key, value):
        """Set value in session data."""
        self._data[key] = value
        if self.session_obj:
            self.session_obj.session_data[key] = value
            self.session_obj.save()
    
    def __getitem__(self, key):
        return self._data[key]
    
    def __setitem__(self, key, value):
        self.set(key, value)
    
    def __contains__(self, key):
        return key in self._data
    
    def flush(self):
        """Clear session data."""
        self._data = {}
        if self.session_obj:
            session_service.invalidate_session(str(self.session_obj.session_id))
    
    @property
    def session_key(self):
        """Return session ID."""
        return str(self.session_obj.session_id) if self.session_obj else None
'''
    
    try:
        with open(middleware_path, 'w') as f:
            f.write(middleware_code)
        print(f"✓ Created admin session middleware at {middleware_path}")
        return True
    except Exception as e:
        print(f"✗ Error creating admin middleware: {e}")
        return False

def update_settings_for_admin():
    """Update settings.py to use custom admin auth."""
    print("\n=== Updating Settings for Admin Auth ===")
    
    print("\nAdd these to your settings.py manually:")
    print("\n1. Add to AUTHENTICATION_BACKENDS:")
    print("AUTHENTICATION_BACKENDS = [")
    print("    'session_manager.admin_auth.SessionManagerAdminBackend',")
    print("    'django.contrib.auth.backends.ModelBackend',  # Fallback")
    print("]")
    print("\n2. Add to MIDDLEWARE after SessionMiddleware:")
    print("'session_manager.admin_middleware.AdminSessionMiddleware',")
    print("\n3. Optional: Disable admin if not needed:")
    print("# INSTALLED_APPS.remove('django.contrib.admin')")
    
    return True

def main():
    """Main function."""
    print("=" * 60)
    print("Django Admin Session Handler")
    print("Version: 0107")
    print("=" * 60)
    print()
    
    print("This script creates a custom authentication system for")
    print("Django admin that works without django.contrib.sessions.")
    print()
    
    # Create admin auth backend
    if not create_admin_auth_backend():
        return False
    
    # Create admin middleware
    if not create_admin_middleware():
        return False
    
    # Show settings updates
    update_settings_for_admin()
    
    print("\n" + "=" * 60)
    print("✓ Admin session handler created successfully!")
    print("=" * 60)
    print()
    print("Note: If you don't use Django admin, you can simply")
    print("remove 'django.contrib.admin' from INSTALLED_APPS")
    print("to avoid any admin-related issues.")
    print()
    print("For production financial apps, consider using a")
    print("separate admin interface outside of Django admin.")

if __name__ == "__main__":
    main()