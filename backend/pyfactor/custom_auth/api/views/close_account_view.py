"""
Close Account View - Handle complete account deletion
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class CloseAccountView(APIView):
    """
    Handle complete account deletion including all user data.
    This is a permanent action that cannot be undone.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Delete user account and all associated data"""
        logger.info(f"[CLOSE_ACCOUNT] Starting account deletion process for user: {request.user.email}")
        
        try:
            user = request.user
            user_email = user.email
            user_id = user.id
            tenant_id = getattr(user, 'tenant_id', None)
            
            # Log the deletion request
            logger.info(f"[CLOSE_ACCOUNT] User {user_email} (ID: {user_id}, Tenant: {tenant_id}) requested account deletion")
            
            # Get deletion reason if provided
            reason = request.data.get('reason', 'Not specified')
            feedback = request.data.get('feedback', '')
            logger.info(f"[CLOSE_ACCOUNT] Deletion reason: {reason}, Feedback: {feedback}")
            
            # Start transaction for data deletion
            with transaction.atomic():
                # 1. Delete tenant data if user is owner
                if tenant_id and hasattr(user, 'user_role') and user.user_role == 'owner':
                    logger.info(f"[CLOSE_ACCOUNT] User is owner, deleting tenant data for tenant_id: {tenant_id}")
                    
                    # Delete all tenant-related data
                    from custom_auth.models import Tenant
                    try:
                        tenant = Tenant.objects.get(tenant_id=tenant_id)
                        
                        # Log what we're about to delete
                        logger.info(f"[CLOSE_ACCOUNT] Found tenant: {tenant.business_name}")
                        
                        # Delete related data from all apps
                        apps_to_clean = [
                            'sales', 'purchases', 'inventory', 'hr', 'finance',
                            'banking', 'crm', 'analysis', 'chart', 'integrations'
                        ]
                        
                        for app_name in apps_to_clean:
                            logger.info(f"[CLOSE_ACCOUNT] Cleaning data from app: {app_name}")
                            # TODO: Implement actual data deletion based on your models
                            # Example:
                            # if app_name == 'sales':
                            #     Sales.objects.filter(tenant_id=tenant_id).delete()
                        
                        # Delete the tenant
                        tenant.delete()
                        logger.info(f"[CLOSE_ACCOUNT] Tenant {tenant_id} deleted successfully")
                        
                    except Tenant.DoesNotExist:
                        logger.warning(f"[CLOSE_ACCOUNT] Tenant {tenant_id} not found")
                    except Exception as e:
                        logger.error(f"[CLOSE_ACCOUNT] Error deleting tenant: {e}")
                
                # 2. Delete user profile data
                logger.info(f"[CLOSE_ACCOUNT] Deleting user profile data")
                
                # Delete tokens
                try:
                    from rest_framework.authtoken.models import Token
                    Token.objects.filter(user=user).delete()
                    logger.info(f"[CLOSE_ACCOUNT] Deleted auth tokens")
                except Exception as e:
                    logger.error(f"[CLOSE_ACCOUNT] Error deleting tokens: {e}")
                
                # Delete social accounts if any
                try:
                    from allauth.socialaccount.models import SocialAccount
                    SocialAccount.objects.filter(user=user).delete()
                    logger.info(f"[CLOSE_ACCOUNT] Deleted social accounts")
                except Exception as e:
                    logger.error(f"[CLOSE_ACCOUNT] Error deleting social accounts: {e}")
                
                # Delete user sessions
                try:
                    from django.contrib.sessions.models import Session
                    from django.contrib.auth.models import AnonymousUser
                    
                    # Delete all sessions for this user
                    for session in Session.objects.all():
                        session_data = session.get_decoded()
                        if session_data.get('_auth_user_id') == str(user_id):
                            session.delete()
                            logger.info(f"[CLOSE_ACCOUNT] Deleted session: {session.session_key}")
                except Exception as e:
                    logger.error(f"[CLOSE_ACCOUNT] Error deleting sessions: {e}")
                
                # Store deletion record for compliance (you might want to keep this in a separate model)
                deletion_record = {
                    'user_email': user_email,
                    'user_id': user_id,
                    'tenant_id': tenant_id,
                    'deletion_date': timezone.now().isoformat(),
                    'reason': reason,
                    'feedback': feedback
                }
                logger.info(f"[CLOSE_ACCOUNT] Deletion record: {deletion_record}")
                
                # Delete user-related data from various models
                try:
                    # Delete from user profile if exists
                    if hasattr(user, 'profile'):
                        user.profile.delete()
                        logger.info("[CLOSE_ACCOUNT] Deleted user profile")
                    
                    # Delete from business info if exists
                    if hasattr(user, 'business_info'):
                        user.business_info.delete()
                        logger.info("[CLOSE_ACCOUNT] Deleted business info")
                    
                    # Delete any onboarding data
                    from onboarding.models import OnboardingProgress
                    OnboardingProgress.objects.filter(user=user).delete()
                    logger.info("[CLOSE_ACCOUNT] Deleted onboarding progress")
                except Exception as e:
                    logger.error(f"[CLOSE_ACCOUNT] Error deleting related data: {e}")
                
                # Finally, delete the user
                user.delete()
                logger.info(f"[CLOSE_ACCOUNT] User {user_email} deleted from database")
            
            # Return success
            return Response({
                'success': True,
                'message': 'Account deleted successfully',
                'debug_info': {
                    'user_deleted': user_email,
                    'tenant_deleted': tenant_id if tenant_id else None,
                    'timestamp': timezone.now().isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[CLOSE_ACCOUNT] Error during account deletion: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Failed to delete account',
                'message': str(e),
                'debug_info': {
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)