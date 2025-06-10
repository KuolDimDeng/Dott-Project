"""
Close Account View - Handle complete account deletion with soft delete
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from custom_auth.models import AccountDeletionLog
from custom_auth.auth0_authentication import Auth0JWTAuthentication

logger = logging.getLogger(__name__)


class CloseAccountView(APIView):
    """
    Handle account closure with soft deletion.
    This marks the account as deleted but keeps the data for compliance.
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Soft delete user account and create audit log"""
        logger.info(f"[CLOSE_ACCOUNT] === ACCOUNT DELETION REQUEST RECEIVED ===")
        logger.info(f"[CLOSE_ACCOUNT] Request headers: {dict(request.headers)}")
        logger.info(f"[CLOSE_ACCOUNT] Request method: {request.method}")
        logger.info(f"[CLOSE_ACCOUNT] Request path: {request.path}")
        logger.info(f"[CLOSE_ACCOUNT] User authenticated: {request.user.is_authenticated}")
        logger.info(f"[CLOSE_ACCOUNT] User: {request.user}")
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            logger.info(f"[CLOSE_ACCOUNT] Authenticated user email: {request.user.email}")
            logger.info(f"[CLOSE_ACCOUNT] User ID: {request.user.id}")
        else:
            logger.error(f"[CLOSE_ACCOUNT] ❌ USER NOT AUTHENTICATED!")
            logger.error(f"[CLOSE_ACCOUNT] Request.user type: {type(request.user)}")
            return Response({
                'success': False,
                'error': 'Authentication required',
                'detail': 'User is not authenticated'
            }, status=status.HTTP_403_FORBIDDEN)
        
        logger.info(f"[CLOSE_ACCOUNT] Starting account deletion process for user: {request.user.email}")
        
        try:
            user = request.user
            user_email = user.email
            user_id = user.id
            tenant_id = getattr(user, 'tenant_id', None)
            auth0_sub = getattr(user, 'auth0_sub', None)
            
            # Log the deletion request
            logger.info(f"[CLOSE_ACCOUNT] User {user_email} (ID: {user_id}, Tenant: {tenant_id}) requested account deletion")
            
            # Get deletion reason and feedback from request
            reason = request.data.get('reason', 'Not specified')
            feedback = request.data.get('feedback', '')
            
            # Get client metadata
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            logger.info(f"[CLOSE_ACCOUNT] Deletion reason: {reason}, Feedback: {feedback}")
            logger.info(f"[CLOSE_ACCOUNT] IP: {ip_address}, User-Agent: {user_agent[:100]}")
            
            # Start transaction for atomicity
            with transaction.atomic():
                # 1. Create audit log first (always succeeds even if deletion fails)
                deletion_log = AccountDeletionLog.objects.create(
                    user_email=user_email,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    auth0_sub=auth0_sub,
                    deletion_reason=reason,
                    deletion_feedback=feedback,
                    deletion_initiated_by='user',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    deletion_date=timezone.now()
                )
                logger.info(f"[CLOSE_ACCOUNT] Created deletion audit log: {deletion_log.id}")
                
                # 2. Soft delete the user (mark as deleted but keep data)
                user.is_deleted = True
                user.deleted_at = timezone.now()
                user.deletion_reason = reason
                user.deletion_feedback = feedback
                user.deletion_initiated_by = 'user'
                user.is_active = False  # Also deactivate the account
                user.save()
                
                logger.info(f"[CLOSE_ACCOUNT] User {user_email} marked as deleted (soft delete)")
                
                # 3. Mark deletion as successful in audit log
                deletion_log.database_deleted = True
                deletion_log.save()
                
                # 4. If user is owner, deactivate tenant
                if tenant_id and hasattr(user, 'role') and user.role == 'owner':
                    logger.info(f"[CLOSE_ACCOUNT] User is owner, deactivating tenant: {tenant_id}")
                    
                    from custom_auth.models import Tenant
                    try:
                        tenant = Tenant.objects.get(id=tenant_id)
                        tenant.is_active = False
                        tenant.deactivated_at = timezone.now()
                        tenant.save()
                        
                        deletion_log.tenant_deleted = True
                        deletion_log.save()
                        
                        logger.info(f"[CLOSE_ACCOUNT] Tenant {tenant_id} deactivated")
                    except Tenant.DoesNotExist:
                        logger.warning(f"[CLOSE_ACCOUNT] Tenant {tenant_id} not found")
                
                # 5. Try to delete from Auth0 (optional, may fail)
                auth0_deleted = False
                auth0_error = None
                
                if auth0_sub:
                    try:
                        auth0_deleted, auth0_error = self._delete_from_auth0(auth0_sub)
                        if auth0_deleted:
                            deletion_log.auth0_deleted = True
                            deletion_log.save()
                            logger.info(f"[CLOSE_ACCOUNT] User deleted from Auth0")
                        else:
                            logger.warning(f"[CLOSE_ACCOUNT] Failed to delete from Auth0: {auth0_error}")
                            if not deletion_log.deletion_errors:
                                deletion_log.deletion_errors = {}
                            deletion_log.deletion_errors['auth0'] = str(auth0_error)
                            deletion_log.save()
                    except Exception as e:
                        logger.error(f"[CLOSE_ACCOUNT] Auth0 deletion error: {str(e)}")
                        if not deletion_log.deletion_errors:
                            deletion_log.deletion_errors = {}
                        deletion_log.deletion_errors['auth0'] = str(e)
                        deletion_log.save()
                
                # 6. Invalidate user sessions
                try:
                    from django.contrib.sessions.models import Session
                    sessions_deleted = 0
                    
                    for session in Session.objects.all():
                        session_data = session.get_decoded()
                        if session_data.get('_auth_user_id') == str(user_id):
                            session.delete()
                            sessions_deleted += 1
                    
                    logger.info(f"[CLOSE_ACCOUNT] Deleted {sessions_deleted} user sessions")
                except Exception as e:
                    logger.warning(f"[CLOSE_ACCOUNT] Error deleting sessions: {str(e)}")
            
            # Transaction complete - prepare response
            response_data = {
                'success': True,
                'message': 'Your account has been closed successfully.',
                'details': {
                    'account_closed': True,
                    'data_retained_for_compliance': True,
                    'auth0_deleted': auth0_deleted,
                    'sessions_cleared': True,
                    'deletion_log_id': str(deletion_log.id),
                    'timestamp': timezone.now().isoformat()
                }
            }
            
            logger.info(f"[CLOSE_ACCOUNT] Account closure completed for {user_email}")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[CLOSE_ACCOUNT] Error during account deletion: {str(e)}", exc_info=True)
            
            # Try to create error log even if deletion failed
            try:
                AccountDeletionLog.objects.create(
                    user_email=getattr(request.user, 'email', 'unknown'),
                    user_id=getattr(request.user, 'id', -1),
                    deletion_reason=request.data.get('reason', 'Not specified'),
                    deletion_feedback=request.data.get('feedback', ''),
                    deletion_initiated_by='user',
                    deletion_errors={'error': str(e), 'type': type(e).__name__},
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            except:
                pass
            
            return Response({
                'success': False,
                'error': 'Failed to close account. Please contact support.',
                'message': 'An error occurred while processing your request.',
                'debug_info': {
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _delete_from_auth0(self, auth0_sub):
        """
        Try to delete user from Auth0 using Management API.
        Returns (success, error_message)
        """
        try:
            import os
            import requests
            
            # Get Auth0 configuration
            auth0_domain = os.environ.get('AUTH0_DOMAIN', 'auth.dottapps.com')
            client_id = os.environ.get('AUTH0_MANAGEMENT_CLIENT_ID')
            client_secret = os.environ.get('AUTH0_MANAGEMENT_CLIENT_SECRET')
            
            if not client_id or not client_secret:
                return False, "Auth0 Management API credentials not configured"
            
            # Get Management API token
            token_url = f"https://{auth0_domain}/oauth/token"
            token_response = requests.post(token_url, json={
                'client_id': client_id,
                'client_secret': client_secret,
                'audience': f"https://{auth0_domain}/api/v2/",
                'grant_type': 'client_credentials'
            })
            
            if not token_response.ok:
                return False, f"Failed to get Management API token: {token_response.status_code}"
            
            access_token = token_response.json().get('access_token')
            
            # Delete user from Auth0
            delete_url = f"https://{auth0_domain}/api/v2/users/{auth0_sub}"
            delete_response = requests.delete(
                delete_url,
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if delete_response.ok or delete_response.status_code == 204:
                return True, None
            else:
                return False, f"Auth0 deletion failed: {delete_response.status_code} - {delete_response.text}"
                
        except Exception as e:
            return False, str(e)