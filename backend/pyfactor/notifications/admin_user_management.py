"""
Admin user management views

TODO: TEMPORARY TESTING FEATURE - REMOVE WHEN LIVE
Currently allowing OWNER users to be deleted and deactivated for testing purposes.
Search for "TODO: TEMPORARY" to find all locations that need to be reverted.
"""
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
import logging
import secrets
import string

from .admin_views import EnhancedAdminPermission
from .admin_security import rate_limit, log_security_event

User = get_user_model()
logger = logging.getLogger(__name__)


class UserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminUserListView(APIView):
    """
    List and search regular users (not admin users)
    """
    authentication_classes = []  # Bypass default auth, use only permission class
    permission_classes = [EnhancedAdminPermission]
    pagination_class = UserPagination
    
    @rate_limit('api')
    def get(self, request):
        """Get list of users with search and filters"""
        try:
            # Build query
            queryset = User.objects.all().order_by('-date_joined')
            
            # Search
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    email__icontains=search
                ) | queryset.filter(
                    first_name__icontains=search
                ) | queryset.filter(
                    last_name__icontains=search
                )
            
            # Filter by role
            role_filter = request.query_params.get('role')
            if role_filter:
                queryset = queryset.filter(role=role_filter)
            
            # Filter by active status
            is_active = request.query_params.get('is_active')
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
            # Filter by onboarding status
            onboarding_completed = request.query_params.get('onboarding_completed')
            if onboarding_completed is not None:
                queryset = queryset.filter(
                    onboarding_completed=onboarding_completed.lower() == 'true'
                )
            
            # Paginate
            paginator = UserPagination()
            page = paginator.paginate_queryset(queryset, request)
            
            # Serialize users
            users_data = []
            for user in page:
                user_data = {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'name': getattr(user, 'name', '') or f"{user.first_name} {user.last_name}".strip(),
                    'role': getattr(user, 'role', 'USER'),
                    'is_active': user.is_active,
                    'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'onboarding_completed': getattr(user, 'onboarding_completed', False),
                    'subscription_plan': getattr(user, 'subscription_plan', 'free'),
                    'tenant_id': str(user.tenant_id) if hasattr(user, 'tenant_id') and user.tenant_id else None,
                }
                users_data.append(user_data)
            
            # Return custom format expected by frontend
            return Response({
                'users': users_data,
                'pagination': {
                    'current_page': int(request.query_params.get('page', 1)),
                    'page_size': paginator.page_size,
                    'total_count': paginator.page.paginator.count,
                    'total_pages': paginator.page.paginator.num_pages,
                }
            })
            
        except Exception as e:
            log_security_event(
                request.admin_user, 'user_list_error',
                {'error': str(e)},
                request, False
            )
            return Response({
                'error': 'Failed to fetch users'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserDetailView(APIView):
    """
    Get, update, or delete a specific user
    """
    authentication_classes = []  # Bypass default auth, use only permission class
    permission_classes = [EnhancedAdminPermission]
    
    @rate_limit('api')
    def get(self, request, user_id):
        """Get user details"""
        try:
            user = User.objects.get(id=user_id)
            
            # Get related data
            tenant_data = None
            if hasattr(user, 'tenant') and user.tenant:
                tenant = user.tenant
                tenant_data = {
                    'id': str(tenant.id),
                    'name': tenant.name,
                    'created_at': tenant.created_at.isoformat() if hasattr(tenant, 'created_at') else None,
                }
            
            # Get onboarding progress
            onboarding_data = None
            if hasattr(user, 'onboardingprogress'):
                progress = user.onboardingprogress
                onboarding_data = {
                    'current_step': progress.current_step,
                    'completed_steps': progress.completed_steps,
                    'subscription_plan': progress.subscription_plan,
                    'setup_completed': progress.setup_completed,
                }
            
            user_data = {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'name': getattr(user, 'name', '') or f"{user.first_name} {user.last_name}".strip(),
                'role': getattr(user, 'role', 'USER'),
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'onboarding_completed': getattr(user, 'onboarding_completed', False),
                'subscription_plan': getattr(user, 'subscription_plan', 'free'),
                'tenant': tenant_data,
                'onboarding_progress': onboarding_data,
                'auth0_sub': getattr(user, 'auth0_sub', None),
                'email_verified': getattr(user, 'email_verified', False),
            }
            
            log_security_event(
                request.admin_user, 'user_view',
                {'user_id': str(user_id)},
                request, True
            )
            
            return Response(user_data)
            
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': 'Failed to fetch user details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @rate_limit('api')
    def patch(self, request, user_id):
        """Update user details"""
        try:
            # Only super_admin can modify users
            if request.admin_user.admin_role != 'super_admin':
                return Response({
                    'error': 'Insufficient permissions'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user = User.objects.get(id=user_id)
            
            # Track changes for audit
            changes = {}
            
            # Update allowed fields
            if 'role' in request.data:
                old_role = user.role
                new_role = request.data['role']
                if new_role in ['OWNER', 'ADMIN', 'USER']:
                    user.role = new_role
                    changes['role'] = {'old': old_role, 'new': new_role}
            
            if 'is_active' in request.data:
                old_active = user.is_active
                user.is_active = request.data['is_active']
                changes['is_active'] = {'old': old_active, 'new': user.is_active}
            
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
                changes['first_name'] = True
            
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
                changes['last_name'] = True
            
            if 'subscription_plan' in request.data and hasattr(user, 'subscription_plan'):
                old_plan = user.subscription_plan
                user.subscription_plan = request.data['subscription_plan']
                changes['subscription_plan'] = {'old': old_plan, 'new': user.subscription_plan}
            
            user.save()
            
            log_security_event(
                request.admin_user, 'user_update',
                {
                    'user_id': str(user_id),
                    'changes': changes
                },
                request, True
            )
            
            return Response({
                'message': 'User updated successfully',
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role,
                    'is_active': user.is_active,
                }
            })
            
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            log_security_event(
                request.admin_user, 'user_update_error',
                {
                    'user_id': str(user_id),
                    'error': str(e)
                },
                request, False
            )
            return Response({
                'error': 'Failed to update user'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @rate_limit('api')
    def delete(self, request, user_id):
        """Delete a user (cascade delete all related data)"""
        try:
            # Only super_admin can delete users
            if request.admin_user.admin_role != 'super_admin':
                return Response({
                    'error': 'Insufficient permissions'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user = User.objects.get(id=user_id)
            
            # TODO: TEMPORARY - Remove this when live with paying users
            # Currently allowing OWNER deletion for testing purposes
            # if user.role == 'OWNER':
            #     return Response({
            #         'error': 'Cannot delete OWNER users'
            #     }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if soft delete is requested
            if request.query_params.get('soft_delete') == 'true':
                # Soft delete - just deactivate
                user.is_active = False
                user.save()
                
                # Also disable in Auth0 if user has Auth0 ID
                if hasattr(user, 'auth0_sub') and user.auth0_sub:
                    self._update_auth0_user_status(user.auth0_sub, False)
                
                log_security_event(
                    request.admin_user, 'user_deactivate',
                    {'user_id': str(user_id), 'email': user.email},
                    request, True
                )
                
                return Response({
                    'message': 'User deactivated successfully'
                })
            else:
                # Hard delete - remove user and all related data
                email = user.email
                auth0_sub = getattr(user, 'auth0_sub', None)
                
                # Delete from Auth0 first if user has Auth0 ID
                if auth0_sub:
                    self._delete_auth0_user(auth0_sub)
                
                # Delete user (will cascade to all related models)
                user.delete()
                
                log_security_event(
                    request.admin_user, 'user_delete',
                    {'user_id': str(user_id), 'email': email},
                    request, True
                )
                
                return Response({
                    'message': 'User and all related data deleted successfully'
                })
            
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Failed to delete user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _update_auth0_user_status(self, auth0_sub, is_active):
        """Update user status in Auth0"""
        try:
            import requests
            from django.conf import settings
            
            # Get Auth0 management API token
            token_response = requests.post(
                f"https://{settings.AUTH0_DOMAIN}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": settings.AUTH0_M2M_CLIENT_ID,
                    "client_secret": settings.AUTH0_M2M_CLIENT_SECRET,
                    "audience": f"https://{settings.AUTH0_DOMAIN}/api/v2/"
                }
            )
            
            if token_response.status_code == 200:
                access_token = token_response.json()['access_token']
                
                # Update user in Auth0
                response = requests.patch(
                    f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{auth0_sub}",
                    headers={'Authorization': f'Bearer {access_token}'},
                    json={'blocked': not is_active}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to update Auth0 user status: {response.text}")
        except Exception as e:
            logger.error(f"Error updating Auth0 user status: {e}")
    
    def _delete_auth0_user(self, auth0_sub):
        """Delete user from Auth0"""
        try:
            import requests
            from django.conf import settings
            
            # Get Auth0 management API token
            token_response = requests.post(
                f"https://{settings.AUTH0_DOMAIN}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": settings.AUTH0_M2M_CLIENT_ID,
                    "client_secret": settings.AUTH0_M2M_CLIENT_SECRET,
                    "audience": f"https://{settings.AUTH0_DOMAIN}/api/v2/"
                }
            )
            
            if token_response.status_code == 200:
                access_token = token_response.json()['access_token']
                
                # Delete user from Auth0
                response = requests.delete(
                    f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{auth0_sub}",
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                
                if response.status_code not in [200, 204]:
                    logger.error(f"Failed to delete Auth0 user: {response.text}")
        except Exception as e:
            logger.error(f"Error deleting Auth0 user: {e}")


class AdminUserStatsView(APIView):
    """
    Get user statistics for dashboard
    """
    authentication_classes = []  # Bypass default auth, use only permission class
    permission_classes = [EnhancedAdminPermission]
    
    @rate_limit('api')
    def get(self, request):
        """Get user statistics"""
        try:
            from django.db.models import Count, Q
            from datetime import datetime, timedelta
            
            # Total users
            total_users = User.objects.count()
            
            # Active users
            active_users = User.objects.filter(is_active=True).count()
            
            # Users by role
            users_by_role = User.objects.values('role').annotate(count=Count('id'))
            
            # New users (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            new_users = User.objects.filter(date_joined__gte=thirty_days_ago).count()
            
            # Users with completed onboarding
            onboarded_users = User.objects.filter(onboarding_completed=True).count()
            
            # Users by subscription plan
            subscription_stats = {}
            if hasattr(User, 'subscription_plan'):
                subscription_stats = User.objects.values('subscription_plan').annotate(count=Count('id'))
            
            stats = {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': total_users - active_users,
                'new_users_30d': new_users,
                'onboarded_users': onboarded_users,
                'users_by_role': {item['role'] or 'None': item['count'] for item in users_by_role},
                'subscription_stats': {item['subscription_plan'] or 'free': item['count'] for item in subscription_stats},
            }
            
            return Response(stats)
            
        except Exception as e:
            return Response({
                'error': 'Failed to fetch statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserCreateView(APIView):
    """
    Create a new user with Auth0 integration
    """
    authentication_classes = []  # Bypass default auth, use only permission class
    permission_classes = [EnhancedAdminPermission]
    
    @rate_limit('api')
    def post(self, request):
        """Create a new user"""
        try:
            # Only super_admin can create users
            if request.admin_user.admin_role != 'super_admin':
                return Response({
                    'error': 'Insufficient permissions'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Validate required fields
            email = request.data.get('email', '').strip().lower()
            first_name = request.data.get('first_name', '').strip()
            last_name = request.data.get('last_name', '').strip()
            role = request.data.get('role', 'USER')
            send_invitation = request.data.get('send_invitation', True)
            
            if not email:
                return Response({
                    'error': 'Email is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                return Response({
                    'error': 'User with this email already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate role
            if role not in ['OWNER', 'ADMIN', 'USER']:
                return Response({
                    'error': 'Invalid role. Must be OWNER, ADMIN, or USER'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate temporary password
            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
            
            # Create user in Auth0 first
            auth0_user_id = self._create_auth0_user(email, temp_password, first_name, last_name)
            
            if not auth0_user_id:
                return Response({
                    'error': 'Failed to create user in Auth0'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create user in database
            with transaction.atomic():
                user = User.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    name=f"{first_name} {last_name}".strip() or email,
                    role=role,
                    auth0_sub=auth0_user_id,
                    is_active=True,
                    email_verified=False  # Will be verified through Auth0
                )
                
                # Create tenant for the user
                from users.models import Tenant
                tenant = Tenant.objects.create(
                    name=f"Tenant for {user.email}",
                    owner=user
                )
                user.tenant = tenant
                user.save()
                
                # Send invitation email if requested
                if send_invitation:
                    self._send_invitation_email(user, temp_password)
                
                log_security_event(
                    request.admin_user, 'user_create',
                    {
                        'user_id': str(user.id),
                        'email': email,
                        'role': role,
                        'invitation_sent': send_invitation
                    },
                    request, True
                )
                
                return Response({
                    'message': 'User created successfully',
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'name': user.name,
                        'role': user.role,
                        'invitation_sent': send_invitation
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return Response({
                'error': f'Failed to create user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_auth0_user(self, email, password, first_name, last_name):
        """Create user in Auth0"""
        try:
            import requests
            from django.conf import settings
            
            # Get Auth0 management API token
            token_response = requests.post(
                f"https://{settings.AUTH0_DOMAIN}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": settings.AUTH0_M2M_CLIENT_ID,
                    "client_secret": settings.AUTH0_M2M_CLIENT_SECRET,
                    "audience": f"https://{settings.AUTH0_DOMAIN}/api/v2/"
                }
            )
            
            if token_response.status_code == 200:
                access_token = token_response.json()['access_token']
                
                # Create user in Auth0
                response = requests.post(
                    f"https://{settings.AUTH0_DOMAIN}/api/v2/users",
                    headers={'Authorization': f'Bearer {access_token}'},
                    json={
                        'email': email,
                        'password': password,
                        'email_verified': False,
                        'given_name': first_name,
                        'family_name': last_name,
                        'name': f"{first_name} {last_name}".strip() or email,
                        'connection': 'Username-Password-Authentication'
                    }
                )
                
                if response.status_code == 201:
                    return response.json()['user_id']
                else:
                    logger.error(f"Failed to create Auth0 user: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Error creating Auth0 user: {e}")
            return None
    
    def _send_invitation_email(self, user, temp_password):
        """Send invitation email to new user"""
        try:
            # Send password reset email through Auth0
            import requests
            from django.conf import settings
            
            response = requests.post(
                f"https://{settings.AUTH0_DOMAIN}/dbconnections/change_password",
                json={
                    'client_id': settings.AUTH0_CLIENT_ID,
                    'email': user.email,
                    'connection': 'Username-Password-Authentication'
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Password reset email sent to {user.email}")
            else:
                logger.error(f"Failed to send password reset email: {response.text}")
        except Exception as e:
            logger.error(f"Error sending invitation email: {e}")


class AdminUserBlockView(APIView):
    """
    Block or unblock a user
    """
    authentication_classes = []  # Bypass default auth, use only permission class
    permission_classes = [EnhancedAdminPermission]
    
    @rate_limit('api')
    def post(self, request, user_id):
        """Block/unblock a user"""
        try:
            # Only super_admin can block/unblock users
            if request.admin_user.admin_role != 'super_admin':
                return Response({
                    'error': 'Insufficient permissions'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user = User.objects.get(id=user_id)
            
            # TODO: TEMPORARY - Remove this when live with paying users
            # Currently allowing OWNER blocking for testing purposes
            # if user.role == 'OWNER':
            #     return Response({
            #         'error': 'Cannot block OWNER users'
            #     }, status=status.HTTP_403_FORBIDDEN)
            
            # Get action (block or unblock)
            action = request.data.get('action', 'block')
            
            if action == 'block':
                user.is_active = False
                message = 'User blocked successfully'
                event_type = 'user_block'
            elif action == 'unblock':
                user.is_active = True
                message = 'User unblocked successfully'
                event_type = 'user_unblock'
            else:
                return Response({
                    'error': 'Invalid action. Must be "block" or "unblock"'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user.save()
            
            # Update Auth0 status if user has Auth0 ID
            if hasattr(user, 'auth0_sub') and user.auth0_sub:
                self._update_auth0_user_status(user.auth0_sub, user.is_active)
            
            log_security_event(
                request.admin_user, event_type,
                {'user_id': str(user_id), 'email': user.email},
                request, True
            )
            
            return Response({
                'message': message,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'is_active': user.is_active
                }
            })
            
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Failed to update user status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _update_auth0_user_status(self, auth0_sub, is_active):
        """Update user status in Auth0"""
        try:
            import requests
            from django.conf import settings
            
            # Get Auth0 management API token
            token_response = requests.post(
                f"https://{settings.AUTH0_DOMAIN}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": settings.AUTH0_M2M_CLIENT_ID,
                    "client_secret": settings.AUTH0_M2M_CLIENT_SECRET,
                    "audience": f"https://{settings.AUTH0_DOMAIN}/api/v2/"
                }
            )
            
            if token_response.status_code == 200:
                access_token = token_response.json()['access_token']
                
                # Update user in Auth0
                response = requests.patch(
                    f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{auth0_sub}",
                    headers={'Authorization': f'Bearer {access_token}'},
                    json={'blocked': not is_active}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to update Auth0 user status: {response.text}")
        except Exception as e:
            logger.error(f"Error updating Auth0 user status: {e}")