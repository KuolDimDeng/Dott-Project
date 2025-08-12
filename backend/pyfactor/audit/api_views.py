"""
Audit API Views
Simple audit logging endpoint for frontend applications
"""

import json
import logging
from datetime import datetime
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import transaction
from session_manager.models import UserSession
from custom_auth.models import User

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class AuditLogView(View):
    """
    Simple audit logging endpoint that accepts logs from frontend
    """
    
    def post(self, request):
        """
        Log an audit event
        """
        try:
            # Parse request body
            body = json.loads(request.body)
            action = body.get('action')
            resource = body.get('resource')
            resource_id = body.get('resourceId')
            details = body.get('details', {})
            
            # Get tenant ID from header
            tenant_id = request.headers.get('X-Tenant-ID')
            
            # Get session
            session_id = request.COOKIES.get('sid')
            user = None
            
            if session_id:
                try:
                    session = UserSession.objects.get(id=session_id, is_active=True)
                    user = session.user
                except UserSession.DoesNotExist:
                    pass
            
            # Log to Django logger for now (can be extended to save to database)
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'action': action,
                'resource': resource,
                'resource_id': resource_id,
                'tenant_id': tenant_id,
                'user_id': str(user.id) if user else None,
                'user_email': user.email if user else None,
                'details': details,
                'ip_address': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
            
            # Log based on action type
            if 'violation' in action or 'denied' in action or 'failed' in action:
                logger.warning(f"[AUDIT] Security Event: {action}", extra={'audit_log': log_entry})
            elif 'error' in action:
                logger.error(f"[AUDIT] Error Event: {action}", extra={'audit_log': log_entry})
            else:
                logger.info(f"[AUDIT] {action}", extra={'audit_log': log_entry})
            
            # For POS sales, we might want to store in database
            if action == 'pos_sale_completed' and resource == 'sale':
                # This could be extended to save to a Sales audit table
                logger.info(f"[AUDIT] POS Sale Completed: ${details.get('amount', 0)} via {details.get('paymentMethod', 'unknown')}")
            
            return JsonResponse({
                'success': True,
                'message': 'Audit log recorded',
                'timestamp': log_entry['timestamp']
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON'
            }, status=400)
        except Exception as e:
            logger.error(f"[AUDIT] Error recording audit log: {str(e)}", exc_info=True)
            return JsonResponse({
                'success': False,
                'error': 'Failed to record audit log'
            }, status=500)
    
    def get_client_ip(self, request):
        """
        Get client IP address from request
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip