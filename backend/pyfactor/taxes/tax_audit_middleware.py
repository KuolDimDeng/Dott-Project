# Tax API logging middleware with detailed request/response logging
import logging
import json
import time

logger = logging.getLogger('taxes.middleware')

class TaxAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log incoming request for tax endpoints
        if '/taxes/' in request.path or '/api/settings/taxes' in request.path:
            start_time = time.time()
            
            logger.info(f"\n{'='*60}")
            logger.info(f"[TAX API REQUEST] {request.method} {request.path}")
            logger.info(f"[TAX API] User: {getattr(request.user, 'email', 'Anonymous')} (ID: {getattr(request.user, 'id', 'None')})")
            logger.info(f"[TAX API] Tenant ID: {getattr(request.user, 'tenant_id', 'None')}")
            
            # Log request body for POST/PUT/PATCH
            if request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    body = request.body.decode('utf-8')
                    if body:
                        logger.info(f"[TAX API] Request Body: {body[:500]}...")
                except:
                    logger.info("[TAX API] Request Body: <unable to decode>")
        
        response = self.get_response(request)
        
        # Log response for tax endpoints
        if '/taxes/' in request.path or '/api/settings/taxes' in request.path:
            duration = (time.time() - start_time) * 1000  # ms
            
            logger.info(f"[TAX API RESPONSE] Status: {response.status_code} | Duration: {duration:.2f}ms")
            
            # Log error responses in detail
            if response.status_code >= 400:
                try:
                    content = response.content.decode('utf-8')
                    logger.error(f"[TAX API ERROR] Response: {content[:1000]}")
                except:
                    logger.error("[TAX API ERROR] Response: <unable to decode>")
            
            # Audit log for database
            try:
                from taxes.models import TaxAuditLog
                TaxAuditLog.objects.create(
                    user_id=request.user.id if request.user.is_authenticated else None,
                    path=request.path,
                    method=request.method,
                    ip_address=self.get_client_ip(request),
                    status_code=response.status_code
                )
            except:
                pass  # Don't break request if audit fails
            
            logger.info(f"{'='*60}\n")
            
        return response
        
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip