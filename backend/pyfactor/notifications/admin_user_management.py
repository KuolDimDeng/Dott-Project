"""
Admin user management views
"""
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .admin_views import EnhancedAdminPermission
from .admin_security import rate_limit, log_security_event

User = get_user_model()


class UserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminUserListView(APIView):
    """
    List and search regular users (not admin users)
    """
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
            
            return paginator.get_paginated_response(users_data)
            
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
        """Deactivate a user (soft delete)"""
        try:
            # Only super_admin can delete users
            if request.admin_user.admin_role != 'super_admin':
                return Response({
                    'error': 'Insufficient permissions'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user = User.objects.get(id=user_id)
            
            # Don't allow deleting OWNER users
            if user.role == 'OWNER':
                return Response({
                    'error': 'Cannot delete OWNER users'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Soft delete - just deactivate
            user.is_active = False
            user.save()
            
            log_security_event(
                request.admin_user, 'user_deactivate',
                {'user_id': str(user_id), 'email': user.email},
                request, True
            )
            
            return Response({
                'message': 'User deactivated successfully'
            })
            
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': 'Failed to deactivate user'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserStatsView(APIView):
    """
    Get user statistics for dashboard
    """
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