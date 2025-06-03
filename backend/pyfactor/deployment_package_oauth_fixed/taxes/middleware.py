# Example audit logging middleware
class TaxAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only log tax-related endpoints
        if '/api/taxes/' in request.path:
            from taxes.models import TaxAuditLog
            
            TaxAuditLog.objects.create(
                user_id=request.user.id if request.user.is_authenticated else None,
                path=request.path,
                method=request.method,
                ip_address=self.get_client_ip(request),
                status_code=response.status_code
            )
            
        return response
        
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip