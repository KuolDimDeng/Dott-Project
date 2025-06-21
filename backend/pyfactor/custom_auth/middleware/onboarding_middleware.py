"""
Onboarding Middleware
Ensures users who haven't completed onboarding are redirected to the onboarding flow
"""
import logging
from django.urls import reverse
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class OnboardingMiddleware(MiddlewareMixin):
    """
    Middleware to handle onboarding redirects based on single source of truth
    """
    
    # Paths that don't require onboarding completion
    EXEMPT_PATHS = [
        '/api/auth/',
        '/api/sessions/',
        '/api/onboarding/',
        '/api/users/me',
        '/api/auth0/',
        '/admin/',
        '/health/',
        '/static/',
        '/media/',
    ]
    
    # Paths that require completed onboarding
    PROTECTED_PATHS = [
        '/api/accounting/',
        '/api/inventory/',
        '/api/dashboard/',
        '/api/reports/',
    ]
    
    def process_request(self, request):
        """Check if user needs onboarding and handle accordingly"""
        
        # Skip for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
            
        # Only check authenticated users
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
            
        # Check onboarding status from user model (single source of truth)
        if not request.user.onboarding_completed:
            logger.info(f"[OnboardingMiddleware] User {request.user.email} needs onboarding")
            
            # If trying to access protected paths, return 403 with specific error
            if any(request.path.startswith(path) for path in self.PROTECTED_PATHS):
                from rest_framework.response import Response
                from rest_framework import status
                
                return Response({
                    'error': 'onboarding_required',
                    'message': 'Please complete onboarding to access this feature',
                    'needs_onboarding': True
                }, status=status.HTTP_403_FORBIDDEN)
        
        return None