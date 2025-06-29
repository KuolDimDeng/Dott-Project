# taxes/middleware/abuse_control_middleware.py
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


class TaxAbuseControlMiddleware(MiddlewareMixin):
    """
    Middleware to apply abuse control checks on tax-related endpoints
    """
    
    TAX_ENDPOINTS = [
        '/api/taxes/tax-rates/',
        '/api/taxes/tax-filings/',
        '/api/taxes/tax-forms/',
    ]
    
    def process_request(self, request):
        """
        Check if the request is for a tax endpoint and apply abuse control
        """
        # Only check for write operations
        if request.method not in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return None
        
        # Check if this is a tax endpoint
        is_tax_endpoint = False
        for endpoint in self.TAX_ENDPOINTS:
            if request.path.startswith(endpoint):
                is_tax_endpoint = True
                break
        
        if not is_tax_endpoint:
            return None
        
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        try:
            from custom_auth.rls import get_current_tenant_id
            from taxes.services.abuse_control_service import TaxDataAbuseControlService
            
            tenant_id = get_current_tenant_id()
            if not tenant_id:
                return None
            
            # Get IP and user agent
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Quick blacklist check
            if TaxDataAbuseControlService._is_blacklisted(tenant_id, request.user, ip_address):
                logger.warning(f"Blacklisted access attempt: user={request.user.email}, ip={ip_address}")
                return JsonResponse(
                    {"error": "Access denied"},
                    status=403
                )
            
            # Quick suspicious activity check
            if TaxDataAbuseControlService.check_suspicious_activity(tenant_id, request.user, ip_address):
                logger.warning(f"Suspicious activity detected: user={request.user.email}, ip={ip_address}")
                return JsonResponse(
                    {"error": "Suspicious activity detected. Please contact support."},
                    status=429
                )
            
        except Exception as e:
            logger.error(f"Error in TaxAbuseControlMiddleware: {str(e)}")
            # Don't block the request on middleware errors
            
        return None
    
    def _get_client_ip(self, request):
        """
        Get the client's IP address from the request
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or '0.0.0.0'