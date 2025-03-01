from django.http import HttpResponse
from rest_framework.response import Response

class CorsMiddleware:
    """
    Middleware to handle CORS headers for all responses.
    Authentication and permissions are handled by DRF permission classes.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle preflight OPTIONS requests
        if request.method == 'OPTIONS':
            response = HttpResponse()
            self._add_cors_headers(response, request)
            return response

        # Process the request
        response = self.get_response(request)
        
        # Add CORS headers to all responses
        self._add_cors_headers(response, request)
        
        return response

    def _add_cors_headers(self, response, request):
        """Add CORS headers to response"""
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            "accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, "
            "x-csrftoken, x-requested-with, x-request-id, cache-control, pragma, "
            "x-onboarding-step, x-debug-step, x-current-step, x-request-version, "
            "x-id-token, x-user-id"
        )
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Max-Age"] = "86400"  # 24 hours
        response["Access-Control-Expose-Headers"] = (
            "access-token, refresh-token, content-type, authorization, "
            "cache-control, last-modified, etag, x-debug-step, x-current-step"
        )
        return response