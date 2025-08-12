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
        '/api/crm/',  # Allow CRM access before onboarding completion
        '/api/inventory/',  # Allow inventory access - same as CRM
        '/api/jobs/',  # Allow jobs access - same as CRM and inventory
        '/admin/',
        '/health/',
        '/static/',
        '/media/',
    ]
    
    # Paths that require completed onboarding
    PROTECTED_PATHS = [
        '/api/accounting/',
        '/api/dashboard/',
        '/api/reports/',
    ]
    
    def process_request(self, request):
        """Check if user needs onboarding and handle accordingly"""
        
        # Skip for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
            
        # Check if request has user attribute
        if not hasattr(request, 'user'):
            logger.debug(f"[OnboardingMiddleware] No user attribute on request for path: {request.path}")
            return None
            
        # Check if user is None
        if request.user is None:
            logger.debug(f"[OnboardingMiddleware] request.user is None for path: {request.path}")
            return None
            
        # Check if user is anonymous (not authenticated)
        try:
            if not request.user.is_authenticated:
                logger.debug(f"[OnboardingMiddleware] User not authenticated for path: {request.path}")
                return None
        except AttributeError as e:
            logger.error(f"[OnboardingMiddleware] Error checking authentication: {e}, user type: {type(request.user)}")
            return None
            
        # Check onboarding status from user model (single source of truth)
        try:
            if not hasattr(request.user, 'onboarding_completed'):
                logger.debug(f"[OnboardingMiddleware] User has no onboarding_completed attribute")
                return None
                
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
        except Exception as e:
            logger.error(f"[OnboardingMiddleware] Error checking onboarding status: {e}")
            return None
        
        return None