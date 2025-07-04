"""
Admin notification system API views
"""
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Case, When, IntegerField
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import user_passes_test
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.pagination import PageNumberPagination
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
import json

from taxes.models import TaxRateFeedback
from custom_auth.models import User
from .models import (
    AdminUser, Notification, NotificationRecipient, 
    NotificationTemplate, AdminAuditLog, UserNotificationSettings
)

logger = logging.getLogger(__name__)


def is_admin_user(user):
    """Check if user is an admin user"""
    return hasattr(user, 'adminuser') and user.is_staff


class AdminAuthMixin:
    """Mixin to ensure only admin users can access views"""
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        if not is_admin_user(request.user):
            AdminAuditLog.objects.create(
                admin_user=request.user,
                action='unauthorized_access',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=False,
                error_message='Unauthorized admin access attempt'
            )
            return JsonResponse({'error': 'Admin access required'}, status=403)
        
        return super().dispatch(request, *args, **kwargs)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def log_admin_action(self, request, action, resource_type='', resource_id='', details=None, success=True, error_message=''):
        """Log admin action for audit trail"""
        AdminAuditLog.objects.create(
            admin_user=request.user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=success,
            error_message=error_message
        )


class AdminLoginView(APIView):
    """Admin authentication endpoint"""
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        ip_address = self.get_client_ip(request)
        
        if not username or not password:
            return Response({'error': 'Username and password required'}, status=400)
        
        # Try to find admin user
        try:
            admin_user = AdminUser.objects.get(username=username, is_staff=True, is_active=True)
        except AdminUser.DoesNotExist:
            AdminAuditLog.objects.create(
                admin_user=None,
                action='login',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=False,
                error_message=f'Admin user not found: {username}'
            )
            return Response({'error': 'Invalid credentials'}, status=401)
        
        # Check if account is locked
        if admin_user.is_locked:
            return Response({
                'error': 'Account temporarily locked',
                'locked_until': admin_user.account_locked_until
            }, status=423)
        
        # Check IP whitelist
        if not admin_user.can_access_ip(ip_address):
            AdminAuditLog.objects.create(
                admin_user=admin_user,
                action='login',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=False,
                error_message=f'IP not whitelisted: {ip_address}'
            )
            return Response({'error': 'Access denied from this IP address'}, status=403)
        
        # Authenticate
        user = authenticate(request, username=username, password=password)
        if user and user == admin_user:
            # Reset failed attempts
            admin_user.failed_login_attempts = 0
            admin_user.last_login_ip = ip_address
            admin_user.save()
            
            # Create JWT token
            refresh = RefreshToken.for_user(user)
            
            AdminAuditLog.objects.create(
                admin_user=admin_user,
                action='login',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            return Response({
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': {
                    'id': str(admin_user.id),
                    'username': admin_user.username,
                    'email': admin_user.email,
                    'full_name': admin_user.get_full_name(),
                    'admin_role': admin_user.admin_role,
                    'department': admin_user.department,
                    'permissions': {
                        'can_send_notifications': admin_user.can_send_notifications,
                        'can_view_all_users': admin_user.can_view_all_users,
                        'can_view_feedback': admin_user.can_view_feedback,
                        'can_moderate_content': admin_user.can_moderate_content,
                    }
                }
            })
        else:
            # Increment failed attempts
            admin_user.failed_login_attempts += 1
            if admin_user.failed_login_attempts >= 5:
                admin_user.account_locked_until = timezone.now() + timedelta(hours=1)
            admin_user.save()
            
            AdminAuditLog.objects.create(
                admin_user=admin_user,
                action='login',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=False,
                error_message='Invalid password'
            )
            
            return Response({'error': 'Invalid credentials'}, status=401)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class AdminDashboardView(AdminAuthMixin, APIView):
    """Main admin dashboard with overview statistics"""
    
    def get(self, request):
        try:
            # Get basic stats
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            stats = {
                'notifications': {
                    'total': Notification.objects.count(),
                    'sent_today': Notification.objects.filter(sent_at__date=today).count(),
                    'active': Notification.objects.filter(status='sent', expires_at__gt=timezone.now()).count(),
                    'pending': Notification.objects.filter(status__in=['draft', 'scheduled']).count(),
                },
                'users': {
                    'total': User.objects.count(),
                    'active_today': User.objects.filter(last_login__date=today).count(),
                    'new_this_week': User.objects.filter(date_joined__gte=week_ago).count(),
                },
                'feedback': {
                    'total': TaxRateFeedback.objects.count(),
                    'pending': TaxRateFeedback.objects.filter(status='pending').count(),
                    'this_week': TaxRateFeedback.objects.filter(created_at__gte=week_ago).count(),
                },
                'engagement': {
                    'avg_read_rate': self.get_average_read_rate(),
                    'notifications_this_month': Notification.objects.filter(created_at__gte=month_ago).count(),
                }
            }
            
            # Recent activity
            recent_notifications = Notification.objects.select_related('created_by').order_by('-created_at')[:5]
            recent_feedback = TaxRateFeedback.objects.order_by('-created_at')[:5]
            
            self.log_admin_action(request, 'view_dashboard')
            
            return Response({
                'stats': stats,
                'recent_notifications': [
                    {
                        'id': str(n.id),
                        'title': n.title,
                        'status': n.status,
                        'total_recipients': n.total_recipients,
                        'read_count': n.read_count,
                        'created_at': n.created_at,
                        'created_by': n.created_by.get_full_name()
                    } for n in recent_notifications
                ],
                'recent_feedback': [
                    {
                        'id': str(f.id),
                        'feedback_type': f.feedback_type,
                        'country': f.country,
                        'state_province': f.state_province,
                        'city': f.city,
                        'submitted_by': f.submitted_by,
                        'created_at': f.created_at,
                        'status': f.status
                    } for f in recent_feedback
                ]
            })
            
        except Exception as e:
            logger.error(f"Error in admin dashboard: {str(e)}")
            return Response({'error': 'Internal server error'}, status=500)
    
    def get_average_read_rate(self):
        """Calculate average notification read rate"""
        notifications = Notification.objects.filter(status='sent', total_recipients__gt=0)
        if not notifications.exists():
            return 0
        
        total_sent = sum(n.total_recipients for n in notifications)
        total_read = sum(n.read_count for n in notifications)
        
        return round((total_read / total_sent * 100), 1) if total_sent > 0 else 0


class TaxFeedbackManagementView(AdminAuthMixin, APIView):
    """Manage tax rate feedback from users"""
    
    def get(self, request):
        try:
            # Pagination
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            
            # Filters
            status_filter = request.GET.get('status', 'all')
            country_filter = request.GET.get('country', 'all')
            feedback_type_filter = request.GET.get('feedback_type', 'all')
            search = request.GET.get('search', '')
            
            # Build queryset
            queryset = TaxRateFeedback.objects.all()
            
            if status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            if country_filter != 'all':
                queryset = queryset.filter(country=country_filter)
            
            if feedback_type_filter != 'all':
                queryset = queryset.filter(feedback_type=feedback_type_filter)
            
            if search:
                queryset = queryset.filter(
                    Q(feedback_details__icontains=search) |
                    Q(submitted_by__icontains=search) |
                    Q(city__icontains=search) |
                    Q(state_province__icontains=search)
                )
            
            # Order by most recent
            queryset = queryset.order_by('-created_at')
            
            # Paginate
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)
            
            # Serialize feedback
            feedback_list = []
            for feedback in page_obj:
                feedback_list.append({
                    'id': str(feedback.id),
                    'feedback_type': feedback.feedback_type,
                    'country': feedback.country,
                    'state_province': feedback.state_province,
                    'city': feedback.city,
                    'business_type': feedback.business_type,
                    'feedback_details': feedback.feedback_details,
                    'inaccurate_fields': feedback.inaccurate_fields,
                    'suggested_sources': feedback.suggested_sources,
                    'displayed_rates': feedback.displayed_rates,
                    'ai_confidence_score': feedback.ai_confidence_score,
                    'submitted_by': feedback.submitted_by,
                    'user_role': feedback.user_role,
                    'status': feedback.status,
                    'created_at': feedback.created_at,
                    'reviewed_at': feedback.reviewed_at,
                    'reviewed_by': feedback.reviewed_by,
                    'resolution_notes': feedback.resolution_notes,
                })
            
            # Get filter options
            countries = TaxRateFeedback.objects.values_list('country', flat=True).distinct()
            feedback_types = TaxRateFeedback.objects.values_list('feedback_type', flat=True).distinct()
            
            self.log_admin_action(request, 'view_feedback', details={'filters': {
                'status': status_filter,
                'country': country_filter,
                'feedback_type': feedback_type_filter,
                'search': search
            }})
            
            return Response({
                'feedback': feedback_list,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'page_size': page_size,
                    'has_previous': page_obj.has_previous(),
                    'has_next': page_obj.has_next(),
                },
                'filter_options': {
                    'countries': list(countries),
                    'feedback_types': list(feedback_types),
                    'statuses': ['pending', 'reviewed', 'resolved', 'invalid']
                }
            })
            
        except Exception as e:
            logger.error(f"Error in tax feedback management: {str(e)}")
            self.log_admin_action(request, 'view_feedback', success=False, error_message=str(e))
            return Response({'error': 'Internal server error'}, status=500)
    
    def patch(self, request, feedback_id):
        """Update feedback status and resolution"""
        try:
            feedback = TaxRateFeedback.objects.get(id=feedback_id)
            
            # Update allowed fields
            status_value = request.data.get('status')
            resolution_notes = request.data.get('resolution_notes')
            
            if status_value:
                feedback.status = status_value
            
            if resolution_notes:
                feedback.resolution_notes = resolution_notes
            
            if status_value in ['reviewed', 'resolved', 'invalid']:
                feedback.reviewed_by = request.user.email
                feedback.reviewed_at = timezone.now()
            
            feedback.save()
            
            self.log_admin_action(
                request, 
                'update_feedback',
                resource_type='feedback',
                resource_id=str(feedback_id),
                details={'status': status_value, 'resolution_notes': resolution_notes}
            )
            
            return Response({'message': 'Feedback updated successfully'})
            
        except TaxRateFeedback.DoesNotExist:
            return Response({'error': 'Feedback not found'}, status=404)
        except Exception as e:
            logger.error(f"Error updating feedback: {str(e)}")
            self.log_admin_action(request, 'update_feedback', success=False, error_message=str(e))
            return Response({'error': 'Internal server error'}, status=500)


class NotificationManagementView(AdminAuthMixin, APIView):
    """Manage notifications - create, send, view"""
    
    def get(self, request):
        """Get notifications with filtering and pagination"""
        try:
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            status_filter = request.GET.get('status', 'all')
            
            queryset = Notification.objects.select_related('created_by', 'template_used')
            
            if status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            queryset = queryset.order_by('-created_at')
            
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)
            
            notifications = []
            for notif in page_obj:
                notifications.append({
                    'id': str(notif.id),
                    'title': notif.title,
                    'message': notif.message[:100] + ('...' if len(notif.message) > 100 else ''),
                    'target_type': notif.target_type,
                    'priority': notif.priority,
                    'status': notif.status,
                    'total_recipients': notif.total_recipients,
                    'delivered_count': notif.delivered_count,
                    'read_count': notif.read_count,
                    'created_by': notif.created_by.get_full_name(),
                    'created_at': notif.created_at,
                    'sent_at': notif.sent_at,
                    'scheduled_for': notif.scheduled_for,
                })
            
            return Response({
                'notifications': notifications,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'page_size': page_size,
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting notifications: {str(e)}")
            return Response({'error': 'Internal server error'}, status=500)
    
    def post(self, request):
        """Create new notification"""
        try:
            if not request.user.can_send_notifications:
                return Response({'error': 'No permission to send notifications'}, status=403)
            
            data = request.data
            
            # Validate required fields
            required_fields = ['title', 'message', 'target_type']
            for field in required_fields:
                if not data.get(field):
                    return Response({'error': f'{field} is required'}, status=400)
            
            # Create notification
            notification = Notification.objects.create(
                title=data['title'],
                message=data['message'],
                icon_type=data.get('icon_type', 'info'),
                target_type=data['target_type'],
                target_criteria=data.get('target_criteria', {}),
                priority=data.get('priority', 'medium'),
                send_email=data.get('send_email', False),
                send_push=data.get('send_push', False),
                auto_dismiss_after=data.get('auto_dismiss_after'),
                scheduled_for=data.get('scheduled_for'),
                expires_at=data.get('expires_at'),
                action_button_text=data.get('action_button_text', ''),
                action_button_url=data.get('action_button_url', ''),
                created_by=request.user,
                status='draft'
            )
            
            self.log_admin_action(
                request,
                'create_notification',
                resource_type='notification',
                resource_id=str(notification.id),
                details={'title': notification.title, 'target_type': notification.target_type}
            )
            
            return Response({
                'id': str(notification.id),
                'message': 'Notification created successfully'
            })
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            self.log_admin_action(request, 'create_notification', success=False, error_message=str(e))
            return Response({'error': 'Internal server error'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_notification(request, notification_id):
    """Send a notification to its targeted users"""
    try:
        if not hasattr(request.user, 'adminuser') or not request.user.can_send_notifications:
            return Response({'error': 'No permission to send notifications'}, status=403)
        
        notification = Notification.objects.get(id=notification_id, status='draft')
        
        # Get target users based on targeting criteria
        target_users = get_target_users(notification)
        
        # Create recipient records
        recipients_created = 0
        for user in target_users:
            NotificationRecipient.objects.create(
                notification=notification,
                tenant_id=user.tenant_id,
                user_email=user.email,
                user_name=user.get_full_name() if hasattr(user, 'get_full_name') else user.email,
                delivery_status='pending'
            )
            recipients_created += 1
        
        # Update notification status
        notification.status = 'sent'
        notification.total_recipients = recipients_created
        notification.sent_at = timezone.now()
        notification.save()
        
        # Log admin action
        AdminAuditLog.objects.create(
            admin_user=request.user,
            action='send_notification',
            resource_type='notification',
            resource_id=str(notification_id),
            details={'recipients_count': recipients_created},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=True
        )
        
        return Response({
            'message': f'Notification sent to {recipients_created} users',
            'recipients_count': recipients_created
        })
        
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found or already sent'}, status=404)
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)


def get_target_users(notification):
    """Get users based on notification targeting criteria"""
    target_type = notification.target_type
    criteria = notification.target_criteria
    
    if target_type == 'all_users':
        return User.objects.filter(is_active=True)
    
    elif target_type == 'specific_users':
        emails = criteria.get('emails', [])
        return User.objects.filter(email__in=emails, is_active=True)
    
    elif target_type == 'by_plan':
        plans = criteria.get('plans', [])
        return User.objects.filter(subscription_plan__in=plans, is_active=True)
    
    elif target_type == 'by_role':
        roles = criteria.get('roles', [])
        return User.objects.filter(role__in=roles, is_active=True)
    
    elif target_type == 'by_country':
        countries = criteria.get('countries', [])
        # This would need to be adjusted based on how you store user location
        return User.objects.filter(country__in=countries, is_active=True)
    
    elif target_type == 'active_users':
        days_ago = criteria.get('days_active', 30)
        since_date = timezone.now() - timedelta(days=days_ago)
        return User.objects.filter(last_login__gte=since_date, is_active=True)
    
    else:
        return User.objects.none()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification_templates(request):
    """Get available notification templates"""
    try:
        if not hasattr(request.user, 'adminuser'):
            return Response({'error': 'Admin access required'}, status=403)
        
        templates = NotificationTemplate.objects.filter(is_active=True).order_by('category', 'name')
        
        template_list = []
        for template in templates:
            template_list.append({
                'id': str(template.id),
                'name': template.name,
                'category': template.category,
                'title_template': template.title_template,
                'message_template': template.message_template,
                'icon_type': template.icon_type,
                'priority': template.priority,
                'available_variables': template.available_variables,
            })
        
        return Response({'templates': template_list})
        
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)


class UserNotificationView(APIView):
    """User notifications endpoint - for regular users to view their notifications"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get notifications for the authenticated user"""
        try:
            # Get tenant_id from user
            user = request.user
            tenant_id = getattr(user, 'tenant_id', None)
            
            if not tenant_id:
                return Response({'error': 'User tenant not found'}, status=400)
            
            # Pagination
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('limit', 50)), 100)  # Max 100 per page
            unread_only = request.GET.get('unread_only', 'false').lower() == 'true'
            
            # Get notifications for this user's tenant
            queryset = NotificationRecipient.objects.filter(
                tenant_id=tenant_id
            ).select_related('notification')
            
            if unread_only:
                queryset = queryset.filter(is_read=False)
            
            # Order by most recent
            queryset = queryset.order_by('-notification__created_at')
            
            # Paginate
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)
            
            # Serialize notifications
            notifications = []
            for recipient in page_obj:
                notification = recipient.notification
                notifications.append({
                    'id': str(notification.id),
                    'title': notification.title,
                    'message': notification.message,
                    'icon_type': notification.icon_type,
                    'priority': notification.priority,
                    'category': notification.category,
                    'action_button_text': notification.action_button_text,
                    'action_button_url': notification.action_button_url,
                    'is_read': recipient.is_read,
                    'read_at': recipient.read_at,
                    'created_at': notification.created_at,
                    'expires_at': notification.expires_at,
                })
            
            return Response({
                'results': notifications,
                'count': paginator.count,
                'next': page_obj.has_next(),
                'previous': page_obj.has_previous(),
                'current_page': page,
                'total_pages': paginator.num_pages,
                'unread_count': NotificationRecipient.objects.filter(
                    tenant_id=tenant_id, 
                    is_read=False
                ).count()
            })
            
        except Exception as e:
            logger.error(f"Error getting user notifications: {str(e)}")
            return Response({'error': 'Internal server error'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read for the authenticated user"""
    try:
        user = request.user
        tenant_id = getattr(user, 'tenant_id', None)
        
        if not tenant_id:
            return Response({'error': 'User tenant not found'}, status=400)
        
        # Find the notification recipient record
        try:
            recipient = NotificationRecipient.objects.get(
                notification_id=notification_id,
                tenant_id=tenant_id
            )
        except NotificationRecipient.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=404)
        
        # Mark as read if not already read
        if not recipient.is_read:
            recipient.is_read = True
            recipient.read_at = timezone.now()
            recipient.save()
            
            # Update notification read count
            notification = recipient.notification
            notification.read_count = NotificationRecipient.objects.filter(
                notification=notification,
                is_read=True
            ).count()
            notification.save()
        
        return Response({'message': 'Notification marked as read'})
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the authenticated user"""
    try:
        user = request.user
        tenant_id = getattr(user, 'tenant_id', None)
        
        if not tenant_id:
            return Response({'error': 'User tenant not found'}, status=400)
        
        # Mark all unread notifications as read
        unread_recipients = NotificationRecipient.objects.filter(
            tenant_id=tenant_id,
            is_read=False
        )
        
        now = timezone.now()
        updated_count = 0
        
        for recipient in unread_recipients:
            recipient.is_read = True
            recipient.read_at = now
            recipient.save()
            updated_count += 1
        
        # Update read counts for all affected notifications
        affected_notifications = set(r.notification for r in unread_recipients)
        for notification in affected_notifications:
            notification.read_count = NotificationRecipient.objects.filter(
                notification=notification,
                is_read=True
            ).count()
            notification.save()
        
        return Response({
            'message': f'Marked {updated_count} notifications as read'
        })
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)