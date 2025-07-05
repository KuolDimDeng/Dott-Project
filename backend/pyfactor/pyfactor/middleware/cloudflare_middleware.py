"""
Cloudflare middleware to handle real IP forwarding and security headers.
"""
import ipaddress
import logging

from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class CloudflareMiddleware(MiddlewareMixin):
    """
    Middleware to handle Cloudflare-specific headers and real IP detection.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.cloudflare_ips = []
        
        # Parse Cloudflare IP ranges
        for ip_range in getattr(settings, 'CLOUDFLARE_IPS', []):
            try:
                self.cloudflare_ips.append(ipaddress.ip_network(ip_range))
            except ValueError:
                logger.warning(f"Invalid IP range in CLOUDFLARE_IPS: {ip_range}")
    
    def process_request(self, request):
        """
        Process incoming request to extract real client IP from Cloudflare headers.
        """
        # Get the immediate client IP
        remote_addr = request.META.get('REMOTE_ADDR', '')
        
        # Check if request is coming from Cloudflare
        is_cloudflare = False
        if remote_addr:
            try:
                client_ip = ipaddress.ip_address(remote_addr)
                for cf_network in self.cloudflare_ips:
                    if client_ip in cf_network:
                        is_cloudflare = True
                        break
            except ValueError:
                logger.warning(f"Invalid REMOTE_ADDR: {remote_addr}")
        
        # If request is from Cloudflare, use CF-Connecting-IP header
        if is_cloudflare or settings.DEBUG:
            cf_connecting_ip = request.META.get('HTTP_CF_CONNECTING_IP')
            if cf_connecting_ip:
                # Store original IP for reference
                request.META['ORIGINAL_REMOTE_ADDR'] = remote_addr
                # Set the real client IP
                request.META['REMOTE_ADDR'] = cf_connecting_ip
                
                # Also set X-Real-IP for compatibility
                request.META['HTTP_X_REAL_IP'] = cf_connecting_ip
                
                # Log for debugging
                logger.debug(f"Cloudflare request: Original IP={remote_addr}, Real IP={cf_connecting_ip}")
        
        # Add Cloudflare-specific headers to request
        request.cloudflare = {
            'is_cloudflare': is_cloudflare,
            'ray_id': request.META.get('HTTP_CF_RAY'),
            'country': request.META.get('HTTP_CF_IPCOUNTRY'),
            'visitor_scheme': request.META.get('HTTP_CF_VISITOR', {}).get('scheme'),
        }
        
        return None
    
    def process_response(self, request, response):
        """
        Add Cloudflare-compatible cache headers to response.
        """
        # Add cache control headers for static assets
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            response['Cache-Control'] = 'public, max-age=31536000, immutable'
        
        # Add Cloudflare cache tag headers if needed
        if hasattr(request, 'cache_tags'):
            response['Cache-Tag'] = ','.join(request.cache_tags)
        
        return response