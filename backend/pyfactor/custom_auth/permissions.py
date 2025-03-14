from rest_framework import permissions

class SetupEndpointPermission(permissions.BasePermission):
    """
    Custom permission class for setup endpoints.
    Allows unauthenticated access to setup-related endpoints while requiring
    authentication for all others.
    """
    
    def has_permission(self, request, view):
        # Define setup-related paths that don't require authentication
        setup_paths = [
            '/api/onboarding/setup/',
            '/api/onboarding/setup/status/',
            '/api/onboarding/setup/complete/',
            '/api/onboarding/setup/start/',
            '/api/onboarding/reset/',
            '/api/profile/'
        ]
        
        # Always allow OPTIONS requests for CORS
        if request.method == 'OPTIONS':
            return True
            
        # Check if the path is in setup paths
        path = request.path.rstrip('/')
        if any(path.startswith(setup_path) for setup_path in setup_paths):
            return True
            
        # For all other paths, require authentication
        return request.user and request.user.is_authenticated