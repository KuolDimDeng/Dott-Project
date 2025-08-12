"""
Content Security Policy Nonce Support for Django
Provides nonce generation and template context for inline scripts
"""

import secrets
import base64
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


def generate_nonce():
    """Generate a cryptographically secure nonce for CSP"""
    random_bytes = secrets.token_bytes(16)
    return base64.b64encode(random_bytes).decode('ascii')


class CSPNonceMiddleware(MiddlewareMixin):
    """
    Middleware to add CSP nonce to requests and responses
    This allows specific inline scripts while maintaining security
    """
    
    def process_request(self, request):
        """Add nonce to request for use in templates"""
        request.csp_nonce = generate_nonce()
        return None
    
    def process_response(self, request, response):
        """Add nonce to CSP header if present"""
        if hasattr(request, 'csp_nonce') and not settings.DEBUG:
            # Get existing CSP header
            csp = response.get('Content-Security-Policy', '')
            
            # Add nonce to script-src if CSP exists
            if csp and 'script-src' in csp:
                # Find script-src directive and add nonce
                csp_parts = csp.split(';')
                for i, part in enumerate(csp_parts):
                    if 'script-src' in part:
                        # Add nonce after 'self'
                        if "'self'" in part:
                            csp_parts[i] = part.replace("'self'", f"'self' 'nonce-{request.csp_nonce}'")
                        else:
                            csp_parts[i] = f"{part} 'nonce-{request.csp_nonce}'"
                        break
                
                # Update CSP header
                response['Content-Security-Policy'] = ';'.join(csp_parts)
        
        return response


def csp_nonce_processor(request):
    """
    Context processor to add CSP nonce to template context
    Add to TEMPLATES['OPTIONS']['context_processors'] in settings.py
    """
    return {
        'csp_nonce': getattr(request, 'csp_nonce', '')
    }


# Template usage example:
"""
In your Django templates, use the nonce for inline scripts:

{% if csp_nonce %}
<script nonce="{{ csp_nonce }}">
    // Your inline JavaScript here
    console.log('This script is allowed by CSP with nonce');
</script>
{% endif %}

For inline styles:
<style nonce="{{ csp_nonce }}">
    /* Your inline CSS here */
</style>
"""