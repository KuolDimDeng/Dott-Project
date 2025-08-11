"""
POS Access Validation View
Validates POS access with strict tenant isolation and security checks
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
from hr.models import Employee
from custom_auth.models import Tenant, User
from audit.models import AuditLog

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class ValidatePOSAccessView(View):
    """
    Validates POS access with enhanced security checks
    """
    
    def post(self, request):
        """
        Validate POS access request
        """
        try:
            # Parse request body
            body = json.loads(request.body)
            tenant_id = body.get('tenantId')
            device_info = body.get('deviceInfo', {})
            
            # Get headers
            x_tenant_id = request.headers.get('X-Tenant-ID')
            x_device_fingerprint = request.headers.get('X-Device-Fingerprint')
            x_client_type = request.headers.get('X-Client-Type')
            
            logger.info(f"[ValidatePOSAccess] Request received - Tenant: {tenant_id}, Client: {x_client_type}")
            
            # Validate tenant ID consistency
            if x_tenant_id != tenant_id:
                logger.warning(f"[ValidatePOSAccess] Tenant ID mismatch - Header: {x_tenant_id}, Body: {tenant_id}")
                return JsonResponse({
                    'success': False,
                    'error': 'Tenant ID mismatch'
                }, status=403)
            
            # Get session from cookie
            session_id = request.COOKIES.get('sid')
            if not session_id:
                logger.warning("[ValidatePOSAccess] No session cookie found")
                return JsonResponse({
                    'success': False,
                    'error': 'No session found'
                }, status=401)
            
            # Validate session
            try:
                session = UserSession.objects.get(id=session_id, is_active=True)
                
                # Check session expiry
                if session.is_expired():
                    logger.warning(f"[ValidatePOSAccess] Session expired: {session_id}")
                    return JsonResponse({
                        'success': False,
                        'error': 'Session expired'
                    }, status=401)
                
                # Update last activity
                session.last_activity = datetime.now()
                session.save(update_fields=['last_activity'])
                
            except UserSession.DoesNotExist:
                logger.warning(f"[ValidatePOSAccess] Invalid session: {session_id}")
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid session'
                }, status=401)
            
            # Get user and tenant
            user = session.user
            if not user:
                logger.error(f"[ValidatePOSAccess] No user in session: {session_id}")
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid session state'
                }, status=401)
            
            # Validate tenant access
            user_tenant_id = str(user.tenant_id) if user.tenant_id else None
            if user_tenant_id != tenant_id:
                logger.error(f"[ValidatePOSAccess] Tenant access violation - User tenant: {user_tenant_id}, Requested: {tenant_id}")
                
                # Log security violation
                with transaction.atomic():
                    audit_data = {
                        'user': user,
                        'action': 'pos_access_violation',
                        'model_name': 'POS',
                        'object_id': tenant_id,
                        'extra_data': {
                            'user_tenant': user_tenant_id,
                            'requested_tenant': tenant_id,
                            'device_fingerprint': x_device_fingerprint,
                            'client_type': x_client_type,
                            'device_info': device_info
                        }
                    }
                    # Try to add resource field if it exists
                    if hasattr(AuditLog, 'resource'):
                        audit_data['resource'] = 'pos'
                    AuditLog.objects.create(**audit_data)
                
                return JsonResponse({
                    'success': False,
                    'error': 'Access denied'
                }, status=403)
            
            # Check POS permissions
            has_pos_permission = False
            permission_source = None
            
            # Check if user is business owner
            if user.tenant and user.tenant.owner_id == user.id:
                has_pos_permission = True
                permission_source = 'owner'
            
            # Check employee permissions
            if not has_pos_permission:
                try:
                    employee = Employee.objects.get(user=user, tenant_id=tenant_id)
                    # Check if employee has POS access role
                    if employee.role in ['ADMIN', 'MANAGER', 'CASHIER', 'SALES']:
                        has_pos_permission = True
                        permission_source = 'employee_role'
                except Employee.DoesNotExist:
                    pass
            
            # Check user permissions
            if not has_pos_permission and hasattr(user, 'user_permissions'):
                if user.has_perm('pos.access_pos') or user.has_perm('pos.complete_sale'):
                    has_pos_permission = True
                    permission_source = 'user_permission'
            
            if not has_pos_permission:
                logger.warning(f"[ValidatePOSAccess] No POS permission for user: {user.id}")
                
                # Log permission denial
                with transaction.atomic():
                    audit_data = {
                        'user': user,
                        'action': 'pos_permission_denied',
                        'model_name': 'POS',
                        'object_id': tenant_id,
                        'extra_data': {
                            'tenant_id': tenant_id,
                            'device_info': device_info
                        }
                    }
                    if hasattr(AuditLog, 'resource'):
                        audit_data['resource'] = 'pos'
                    AuditLog.objects.create(**audit_data)
                
                return JsonResponse({
                    'success': False,
                    'error': 'You do not have permission to access POS'
                }, status=403)
            
            # Get tenant information
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                tenant_name = tenant.business_name or tenant.name
                tenant_settings = {
                    'currency': getattr(tenant, 'currency', 'USD'),
                    'tax_rate': getattr(tenant, 'default_tax_rate', 0),
                    'receipt_footer': getattr(tenant, 'receipt_footer', ''),
                    'allow_discounts': getattr(tenant, 'allow_pos_discounts', True),
                    'require_customer': getattr(tenant, 'require_customer_for_sale', False)
                }
            except Tenant.DoesNotExist:
                tenant_name = user.business_name or 'Unknown Business'
                tenant_settings = {
                    'currency': 'USD',
                    'tax_rate': 0,
                    'receipt_footer': '',
                    'allow_discounts': True,
                    'require_customer': False
                }
            
            # Log successful validation
            with transaction.atomic():
                audit_data = {
                    'user': user,
                    'action': 'pos_access_validated',
                    'model_name': 'POS',
                    'object_id': tenant_id,
                    'extra_data': {
                        'tenant_id': tenant_id,
                        'permission_source': permission_source,
                        'device_fingerprint': x_device_fingerprint,
                        'client_type': x_client_type,
                        'device_info': device_info
                    }
                }
                if hasattr(AuditLog, 'resource'):
                    audit_data['resource'] = 'pos'
                AuditLog.objects.create(**audit_data)
            
            # Return validation response
            response = JsonResponse({
                'success': True,
                'tenantId': tenant_id,
                'tenantName': tenant_name,
                'permissions': {
                    'access_pos': True,
                    'complete_sale': True,
                    'void_sale': permission_source in ['owner', 'employee_role'],
                    'apply_discounts': tenant_settings['allow_discounts'],
                    'manage_cash_drawer': permission_source in ['owner', 'employee_role']
                },
                'settings': tenant_settings,
                'user': {
                    'id': str(user.id),
                    'name': user.get_full_name() or user.email,
                    'email': user.email,
                    'role': permission_source
                },
                'sessionValid': True,
                'timestamp': datetime.now().isoformat()
            })
            
            # Add tenant ID to response headers for verification
            response['X-Tenant-ID'] = tenant_id
            
            logger.info(f"[ValidatePOSAccess] Access granted - User: {user.id}, Tenant: {tenant_id}, Permission: {permission_source}")
            
            return response
            
        except json.JSONDecodeError:
            logger.error("[ValidatePOSAccess] Invalid JSON in request body")
            return JsonResponse({
                'success': False,
                'error': 'Invalid request format'
            }, status=400)
        except Exception as e:
            logger.error(f"[ValidatePOSAccess] Unexpected error: {str(e)}", exc_info=True)
            return JsonResponse({
                'success': False,
                'error': 'Internal server error'
            }, status=500)