"""
Views for the notification system
"""
import jwt
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Count, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, AllowAny

from custom_auth.permissions import TenantAccessPermission

from .models import (
    AdminUser, Notification, NotificationRecipient, 
    NotificationTemplate, AdminAuditLog, UserNotificationSettings
)
from .serializers import (
    NotificationSerializer, NotificationRecipientSerializer,
    NotificationTemplateSerializer, AdminAuditLogSerializer,
    AdminUserSerializer
)


class AdminPermission(BasePermission):
    """
    Permission class for admin endpoints
    """
    def has_permission(self, request, view):
        # Check if JWT token is present and valid
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return False
        
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            admin_id = payload.get('admin_id')
            
            if not admin_id:
                return False
            
            # Get admin user
            admin_user = AdminUser.objects.filter(id=admin_id, is_active=True).first()
            if not admin_user:
                return False
            
            # Check IP whitelist
            client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
            if not admin_user.can_access_ip(client_ip):
                return False
            
            # Attach admin user to request
            request.admin_user = admin_user
            return True
            
        except (jwt.InvalidTokenError, AdminUser.DoesNotExist):
            return False


class AdminLoginView(APIView):
    """
    Admin authentication endpoint
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Username and password required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client IP
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        
        # Get admin user
        admin_user = AdminUser.objects.filter(username=username).first()
        if not admin_user:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if account is locked
        if admin_user.is_locked:
            return Response({
                'error': 'Account is locked. Please contact support.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check password
        if not admin_user.check_password(password):
            # Increment failed attempts
            admin_user.failed_login_attempts += 1
            if admin_user.failed_login_attempts >= 5:
                admin_user.account_locked_until = timezone.now() + timedelta(hours=1)
            admin_user.save()
            
            # Log failed attempt
            AdminAuditLog.objects.create(
                admin_user=admin_user,
                action='login',
                ip_address=client_ip,
                user_agent=request.headers.get('User-Agent', ''),
                success=False,
                error_message='Invalid password'
            )
            
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check IP whitelist
        if not admin_user.can_access_ip(client_ip):
            # Log unauthorized IP
            AdminAuditLog.objects.create(
                admin_user=admin_user,
                action='login',
                ip_address=client_ip,
                user_agent=request.headers.get('User-Agent', ''),
                success=False,
                error_message=f'Unauthorized IP: {client_ip}'
            )
            
            return Response({
                'error': 'Access denied from this location'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Reset failed attempts and update login info
        admin_user.failed_login_attempts = 0
        admin_user.last_login = timezone.now()
        admin_user.last_login_ip = client_ip
        admin_user.save()
        
        # Generate JWT token
        payload = {
            'admin_id': str(admin_user.id),
            'username': admin_user.username,
            'role': admin_user.admin_role,
            'exp': datetime.utcnow() + timedelta(hours=8)
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        
        # Log successful login
        AdminAuditLog.objects.create(
            admin_user=admin_user,
            action='login',
            ip_address=client_ip,
            user_agent=request.headers.get('User-Agent', ''),
            success=True
        )
        
        return Response({
            'access_token': token,
            'refresh_token': token,  # For simplicity, use same token
            'user': AdminUserSerializer(admin_user).data
        })


class AdminDashboardView(APIView):
    """
    Admin dashboard statistics
    """
    permission_classes = [AdminPermission]
    
    def _get_pending_feedback_count(self):
        """Safely get pending feedback count, handling migration state"""
        try:
            from taxes.models import TaxSuggestionFeedback
            return TaxSuggestionFeedback.objects.filter(status='pending').count()
        except (ImportError, Exception):
            # Model not available yet or migration not run
            return 0
    
    def get(self, request):
        # Get statistics
        stats = {
            'total_notifications': Notification.objects.count(),
            'notifications_sent_today': Notification.objects.filter(
                sent_at__date=timezone.now().date()
            ).count(),
            'total_recipients': NotificationRecipient.objects.count(),
            'unread_count': NotificationRecipient.objects.filter(is_read=False).count(),
            'pending_feedback': self._get_pending_feedback_count(),
            'recent_notifications': NotificationSerializer(
                Notification.objects.order_by('-created_at')[:10],
                many=True
            ).data
        }
        
        return Response(stats)


class UserNotificationListView(APIView):
    """
    List notifications for the authenticated user
    """
    permission_classes = [TenantAccessPermission]
    
    def get(self, request):
        # Get user's tenant ID from session
        tenant_id = request.session.get('tenant_id')
        user_email = request.session.get('user', {}).get('email') or (request.user.email if hasattr(request.user, 'email') else None)
        
        if not user_email:
            return Response({
                'error': 'User email not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get notifications for this user
        notifications = NotificationRecipient.objects.filter(
            tenant_id=tenant_id,
            user_email=user_email,
            notification__status='sent'
        ).select_related('notification').order_by('-notification__created_at')
        
        # Get unread only flag
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        if unread_only:
            notifications = notifications.filter(is_read=False)
        
        # Limit results
        limit = int(request.query_params.get('limit', 100))
        notifications = notifications[:limit]
        
        # Serialize
        data = []
        for recipient in notifications:
            notification_data = NotificationSerializer(recipient.notification).data
            notification_data['is_read'] = recipient.is_read
            notification_data['read_at'] = recipient.read_at
            data.append(notification_data)
        
        return Response({
            'notifications': data,
            'unread_count': NotificationRecipient.objects.filter(
                tenant_id=tenant_id,
                user_email=user_email,
                is_read=False,
                notification__status='sent'
            ).count()
        })


class MarkNotificationReadView(APIView):
    """
    Mark a notification as read
    """
    permission_classes = [TenantAccessPermission]
    
    def post(self, request, notification_id):
        tenant_id = request.session.get('tenant_id')
        user_email = request.session.get('user', {}).get('email') or (request.user.email if hasattr(request.user, 'email') else None)
        
        recipient = get_object_or_404(
            NotificationRecipient,
            notification_id=notification_id,
            tenant_id=tenant_id,
            user_email=user_email
        )
        
        if not recipient.is_read:
            recipient.is_read = True
            recipient.read_at = timezone.now()
            recipient.save()
            
            # Update notification read count
            Notification.objects.filter(id=notification_id).update(
                read_count=F('read_count') + 1
            )
        
        return Response({'success': True})


class MarkAllNotificationsReadView(APIView):
    """
    Mark all notifications as read for a user
    """
    permission_classes = [TenantAccessPermission]
    
    def post(self, request):
        tenant_id = request.session.get('tenant_id')
        user_email = request.session.get('user', {}).get('email') or (request.user.email if hasattr(request.user, 'email') else None)
        
        # Update all unread notifications
        updated = NotificationRecipient.objects.filter(
            tenant_id=tenant_id,
            user_email=user_email,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'success': True,
            'updated_count': updated
        })


class TaxFeedbackListView(APIView):
    """
    List tax suggestion feedback for admin review
    """
    permission_classes = [AdminPermission]
    
    def get(self, request):
        # Import here to avoid circular import issues
        try:
            from taxes.models import TaxSuggestionFeedback
        except ImportError:
            # Model not available yet
            return Response({
                'error': 'Tax feedback system is being deployed. Please try again in a few minutes.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        from rest_framework import serializers
        
        # Define serializer inline to avoid circular imports
        class TaxFeedbackSerializer(serializers.ModelSerializer):
            class Meta:
                model = TaxSuggestionFeedback
                fields = [
                    'id', 'tenant_id', 'user_email', 'country_code', 'country_name',
                    'business_type', 'tax_type', 'original_suggestion', 'user_feedback',
                    'correct_info', 'confidence_score', 'status', 'resolution_notes',
                    'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
                ]
                read_only_fields = [
                    'id', 'tenant_id', 'user_email', 'created_at', 'updated_at'
                ]
        
        if not request.admin_user.can_view_feedback:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get filters
        status_filter = request.query_params.get('status')
        country_filter = request.query_params.get('country')
        
        # Build query
        queryset = TaxSuggestionFeedback.objects.all()
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if country_filter:
            queryset = queryset.filter(country_code=country_filter)
        
        # Order by newest first
        queryset = queryset.order_by('-created_at')
        
        # Serialize
        serializer = TaxFeedbackSerializer(queryset[:100], many=True)
        
        # Log access
        AdminAuditLog.objects.create(
            admin_user=request.admin_user,
            action='view_feedback',
            ip_address=request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR'),
            user_agent=request.headers.get('User-Agent', ''),
            success=True
        )
        
        return Response(serializer.data)


class TaxFeedbackDetailView(APIView):
    """
    Update tax feedback status
    """
    permission_classes = [AdminPermission]
    
    def patch(self, request, feedback_id):
        # Import here to avoid circular import issues
        try:
            from taxes.models import TaxSuggestionFeedback
        except ImportError:
            # Model not available yet
            return Response({
                'error': 'Tax feedback system is being deployed. Please try again in a few minutes.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        from rest_framework import serializers
        
        # Define serializer inline to avoid circular imports
        class TaxFeedbackSerializer(serializers.ModelSerializer):
            class Meta:
                model = TaxSuggestionFeedback
                fields = [
                    'id', 'tenant_id', 'user_email', 'country_code', 'country_name',
                    'business_type', 'tax_type', 'original_suggestion', 'user_feedback',
                    'correct_info', 'confidence_score', 'status', 'resolution_notes',
                    'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
                ]
                read_only_fields = [
                    'id', 'tenant_id', 'user_email', 'created_at', 'updated_at'
                ]
        
        if not request.admin_user.can_view_feedback:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        feedback = get_object_or_404(TaxSuggestionFeedback, id=feedback_id)
        
        # Update status
        new_status = request.data.get('status')
        if new_status and new_status in ['pending', 'reviewed', 'resolved']:
            feedback.status = new_status
        
        # Add resolution notes
        resolution_notes = request.data.get('resolution_notes')
        if resolution_notes:
            feedback.resolution_notes = resolution_notes
        
        # Set reviewed by
        feedback.reviewed_by = request.admin_user.get_full_name()
        feedback.reviewed_at = timezone.now()
        
        feedback.save()
        
        return Response(TaxFeedbackSerializer(feedback).data)


class AdminNotificationListView(APIView):
    """
    List all notifications for admin
    """
    permission_classes = [AdminPermission]
    
    def get(self, request):
        if not request.admin_user.can_send_notifications:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        notifications = Notification.objects.select_related('created_by').order_by('-created_at')[:50]
        
        return Response(NotificationSerializer(notifications, many=True).data)


class CreateNotificationView(APIView):
    """
    Create a new notification
    """
    permission_classes = [AdminPermission]
    
    def post(self, request):
        if not request.admin_user.can_send_notifications:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Create notification
        notification = Notification.objects.create(
            title=request.data.get('title'),
            message=request.data.get('message'),
            icon_type=request.data.get('icon_type', 'info'),
            target_type=request.data.get('target_type', 'all_users'),
            target_criteria=request.data.get('target_criteria', {}),
            priority=request.data.get('priority', 'medium'),
            category=request.data.get('category'),
            send_email=request.data.get('send_email', False),
            scheduled_for=request.data.get('scheduled_for'),
            expires_at=request.data.get('expires_at'),
            action_button_text=request.data.get('action_button_text', ''),
            action_button_url=request.data.get('action_button_url', ''),
            created_by=request.admin_user,
            status='draft'
        )
        
        # Log creation
        AdminAuditLog.objects.create(
            admin_user=request.admin_user,
            action='create_notification',
            resource_type='notification',
            resource_id=str(notification.id),
            details={'title': notification.title},
            ip_address=request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR'),
            user_agent=request.headers.get('User-Agent', ''),
            success=True
        )
        
        return Response(NotificationSerializer(notification).data)


class SendNotificationView(APIView):
    """
    Send a notification to recipients
    """
    permission_classes = [AdminPermission]
    
    def post(self, request, notification_id):
        if not request.admin_user.can_send_notifications:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        notification = get_object_or_404(Notification, id=notification_id)
        
        if notification.status != 'draft':
            return Response({
                'error': 'Notification already sent'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mock sending - in production, this would create NotificationRecipient records
        # based on target_type and target_criteria
        with transaction.atomic():
            notification.status = 'sent'
            notification.sent_at = timezone.now()
            notification.total_recipients = 100  # Mock count
            notification.save()
            
            # Log send action
            AdminAuditLog.objects.create(
                admin_user=request.admin_user,
                action='send_notification',
                resource_type='notification',
                resource_id=str(notification.id),
                details={
                    'title': notification.title,
                    'recipients': notification.total_recipients
                },
                ip_address=request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR'),
                user_agent=request.headers.get('User-Agent', ''),
                success=True
            )
        
        return Response({
            'success': True,
            'recipients_count': notification.total_recipients
        })


class NotificationTemplateListView(APIView):
    """
    List notification templates
    """
    permission_classes = [AdminPermission]
    
    def get(self, request):
        templates = NotificationTemplate.objects.filter(is_active=True).order_by('category', 'name')
        return Response(NotificationTemplateSerializer(templates, many=True).data)