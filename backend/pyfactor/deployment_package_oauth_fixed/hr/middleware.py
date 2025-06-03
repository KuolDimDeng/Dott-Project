"""
HR API CORS Middleware

This middleware ensures all responses from the HR API include the proper
CORS headers, particularly for business ID headers.
"""

class HrCorsMiddleware:
    """
    Middleware to add CORS headers to all responses from the HR API.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Process the request
        response = self.get_response(request)
        
        # Only add CORS headers to HR API requests
        if not request.path.startswith('/api/hr/'):
            return response
            
        # Add CORS headers to all HR API responses
        origin = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Origin"] = origin
        
        # For OPTIONS requests (preflight), add additional headers
        if request.method == 'OPTIONS':
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
                "x-business-id, X-Business-ID, X-BUSINESS-ID, "
                "access-control-allow-headers, Access-Control-Allow-Headers, "
                "access-control-allow-origin, Access-Control-Allow-Origin, "
                "access-control-allow-methods, Access-Control-Allow-Methods, "
                "x-request-id, cache-control, x-user-id, x-id-token, "
                "X-Requires-Auth, x-schema-name, X-Schema-Name"
            )
            response["Access-Control-Max-Age"] = "86400"
            
        # Common headers for all responses
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Expose-Headers"] = (
            "Content-Type, x-tenant-id, X-Tenant-ID, X-TENANT-ID, "
            "x-business-id, X-Business-ID, X-BUSINESS-ID, "
            "x-schema-name, X-Schema-Name"
        )
        
        return response 