"""
Mobile User Management API Views
Handles user invitations, management, and permissions for mobile app
"""
import logging
from django.db import transaction
from django.db.models import Q, Prefetch
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
import uuid

from .models import User, UserInvitation, UserPageAccess, PagePermission
from hr.models import Employee
from users.models import UserProfile
from .serializers import UserSerializer

logger = logging.getLogger(__name__)


class MobileUserManagementViewSet(viewsets.ModelViewSet):
    """
    Mobile-specific user management for business owners
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        """Get all users in the same business"""
        user = self.request.user
        if not user.business_id:
            return User.objects.none()
        
        # Include user profiles and employee data
        return User.objects.filter(
            business_id=user.business_id,
            tenant=user.tenant
        ).select_related(
            'profile',
            'employee'
        ).prefetch_related(
            'page_permissions'
        )
    
    @action(detail=False, methods=['get'])
    def team_members(self, request):
        """
        Get all team members with their status and permissions
        Only OWNER and ADMIN can access
        """
        user = request.user
        
        # Check permissions
        if user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {'error': 'Only owners and admins can view team members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all users in the business
        team_members = self.get_queryset()
        
        # Format response with audit logs
        members_data = []
        for member in team_members:
            # Get recent audit logs (last 7 days)
            recent_logs = []
            if hasattr(member, 'employee') and member.employee:
                # Get sign in/out logs from employee timesheet or audit
                pass  # Implement based on your audit system
            
            member_data = {
                'id': member.id,
                'email': member.email,
                'full_name': member.full_name,
                'phone': member.phone_number,
                'role': member.role,
                'is_active': member.is_active,
                'created_at': member.created_at,
                'last_login': member.last_login,
                'employee_id': member.employee.id if hasattr(member, 'employee') and member.employee else None,
                'permissions': self._get_user_permissions(member),
                'recent_activity': recent_logs,
                'status': 'active' if member.is_active else 'inactive'
            }
            members_data.append(member_data)
        
        return Response({
            'success': True,
            'data': members_data,
            'count': len(members_data)
        })
    
    @action(detail=False, methods=['post'])
    def invite_user(self, request):
        """
        Invite a new user via phone number or email
        OWNER only functionality
        """
        user = request.user
        
        # Only owners can invite users
        if user.role != 'OWNER':
            return Response(
                {'error': 'Only business owners can invite users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get invitation data
        phone = request.data.get('phone')
        email = request.data.get('email')
        full_name = request.data.get('full_name')
        permissions = request.data.get('permissions', [])
        
        if not phone and not email:
            return Response(
                {'error': 'Phone number or email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Check if user already exists
                existing_user = User.objects.filter(
                    Q(email=email) | Q(phone_number=phone),
                    business_id=user.business_id
                ).first()
                
                if existing_user:
                    return Response(
                        {'error': 'User already exists in your business'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create invitation
                invitation = UserInvitation.objects.create(
                    inviter=user,
                    tenant=user.tenant,
                    email=email or f"{phone}@temp.dottapps.com",
                    phone=phone,
                    role='USER',  # All invited users get USER role
                    expires_at=timezone.now() + timedelta(days=7),
                    metadata={
                        'full_name': full_name,
                        'permissions': permissions,
                        'invited_via': 'mobile_app',
                        'business_id': str(user.business_id)
                    }
                )
                
                # Send invitation (SMS or Email)
                self._send_invitation(invitation, phone, email)
                
                return Response({
                    'success': True,
                    'message': 'Invitation sent successfully',
                    'data': {
                        'invitation_id': invitation.id,
                        'expires_at': invitation.expires_at
                    }
                })
                
        except Exception as e:
            logger.error(f"Failed to invite user: {str(e)}")
            return Response(
                {'error': 'Failed to send invitation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """
        Activate or deactivate a user
        OWNER and ADMIN only
        """
        user = request.user
        
        if user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {'error': 'Insufficient permissions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            target_user = self.get_object()
            
            # Prevent deactivating owner
            if target_user.role == 'OWNER':
                return Response(
                    {'error': 'Cannot deactivate business owner'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Toggle status
            target_user.is_active = not target_user.is_active
            target_user.save()
            
            action_text = 'activated' if target_user.is_active else 'deactivated'
            
            return Response({
                'success': True,
                'message': f'User {action_text} successfully',
                'data': {
                    'user_id': target_user.id,
                    'is_active': target_user.is_active
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to toggle user status: {str(e)}")
            return Response(
                {'error': 'Failed to update user status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['delete'])
    def remove_user(self, request, pk=None):
        """
        Remove a user from the business
        OWNER only
        """
        user = request.user
        
        if user.role != 'OWNER':
            return Response(
                {'error': 'Only owners can remove users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            target_user = self.get_object()
            
            # Prevent removing owner
            if target_user.role == 'OWNER':
                return Response(
                    {'error': 'Cannot remove business owner'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete - just remove from business
            target_user.business_id = None
            target_user.is_active = False
            target_user.save()
            
            return Response({
                'success': True,
                'message': 'User removed successfully'
            })
            
        except Exception as e:
            logger.error(f"Failed to remove user: {str(e)}")
            return Response(
                {'error': 'Failed to remove user'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def update_permissions(self, request, pk=None):
        """
        Update user's menu permissions
        OWNER only
        """
        user = request.user
        
        if user.role != 'OWNER':
            return Response(
                {'error': 'Only owners can update permissions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            target_user = self.get_object()
            permissions = request.data.get('permissions', [])
            
            # Clear existing permissions
            UserPageAccess.objects.filter(
                user=target_user,
                tenant=user.tenant
            ).delete()
            
            # Add new permissions
            for perm in permissions:
                page_perm = PagePermission.objects.filter(
                    page_name=perm,
                    tenant=user.tenant
                ).first()
                
                if page_perm:
                    UserPageAccess.objects.create(
                        user=target_user,
                        page_permission=page_perm,
                        tenant=user.tenant,
                        can_read=True,
                        can_write=perm in request.data.get('write_permissions', []),
                        can_edit=perm in request.data.get('edit_permissions', []),
                        can_delete=perm in request.data.get('delete_permissions', [])
                    )
            
            return Response({
                'success': True,
                'message': 'Permissions updated successfully'
            })
            
        except Exception as e:
            logger.error(f"Failed to update permissions: {str(e)}")
            return Response(
                {'error': 'Failed to update permissions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def audit_logs(self, request, pk=None):
        """
        Get audit logs for a specific user
        OWNER and ADMIN only
        """
        user = request.user
        
        if user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {'error': 'Insufficient permissions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            target_user = self.get_object()
            
            # Get audit logs (implement based on your audit system)
            logs = []
            
            # Example structure - adjust based on your audit implementation
            # This would typically come from an AuditLog model or timesheet data
            
            return Response({
                'success': True,
                'data': {
                    'user_id': target_user.id,
                    'user_name': target_user.full_name,
                    'logs': logs
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to get audit logs: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve audit logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def available_permissions(self, request):
        """
        Get list of available menu permissions
        """
        # Define available mobile menu items
        menu_items = [
            {'name': 'pos_terminal', 'label': 'POS Terminal', 'category': 'operations'},
            {'name': 'inventory', 'label': 'Inventory', 'category': 'operations'},
            {'name': 'expenses', 'label': 'Expenses', 'category': 'finance'},
            {'name': 'invoices', 'label': 'Invoices', 'category': 'finance'},
            {'name': 'banking', 'label': 'Banking', 'category': 'finance'},
            {'name': 'jobs', 'label': 'Jobs', 'category': 'operations'},
            {'name': 'dashboard', 'label': 'Dashboard', 'category': 'analytics'},
            {'name': 'transactions', 'label': 'Transactions', 'category': 'finance'},
            {'name': 'customers', 'label': 'Customers', 'category': 'crm'},
            {'name': 'orders', 'label': 'Orders', 'category': 'operations'},
            {'name': 'messages', 'label': 'Messages', 'category': 'communication'},
            {'name': 'whatsapp', 'label': 'WhatsApp', 'category': 'communication'},
            {'name': 'hr', 'label': 'HR', 'category': 'management'},
            {'name': 'payroll', 'label': 'Payroll', 'category': 'management'},
            {'name': 'advertise', 'label': 'Advertise', 'category': 'marketing'},
            {'name': 'services', 'label': 'Services', 'category': 'operations'},
            {'name': 'smart_insights', 'label': 'Smart Insights', 'category': 'analytics'},
            {'name': 'tax_filing', 'label': 'Tax Filing', 'category': 'finance'},
            {'name': 'transport', 'label': 'Transport', 'category': 'operations'},
            {'name': 'tables', 'label': 'Tables', 'category': 'operations'},
            {'name': 'delivery', 'label': 'Delivery', 'category': 'operations'},
        ]
        
        return Response({
            'success': True,
            'data': menu_items
        })
    
    def _get_user_permissions(self, user):
        """Helper to get user's current permissions"""
        permissions = UserPageAccess.objects.filter(
            user=user,
            tenant=user.tenant
        ).select_related('page_permission')
        
        return [
            {
                'page': perm.page_permission.page_name,
                'can_read': perm.can_read,
                'can_write': perm.can_write,
                'can_edit': perm.can_edit,
                'can_delete': perm.can_delete
            }
            for perm in permissions
        ]
    
    def _send_invitation(self, invitation, phone, email):
        """Send invitation via SMS or Email"""
        # Download link for the app
        app_download_link = "https://dottapps.com/download"
        
        if phone:
            # Send SMS invitation (implement your SMS service)
            message = f"You've been invited to join {invitation.inviter.business_name} on Dott. Download the app: {app_download_link}"
            # TODO: Implement SMS sending
            logger.info(f"SMS invitation would be sent to {phone}: {message}")
        
        if email and '@temp.dottapps.com' not in email:
            # Send email invitation
            from django.core.mail import send_mail
            subject = f"Invitation to join {invitation.inviter.business_name} on Dott"
            message = f"""
            You have been invited to join {invitation.inviter.business_name} on Dott.
            
            Download the app and sign up with this email to accept the invitation:
            {app_download_link}
            
            This invitation expires on {invitation.expires_at.strftime('%Y-%m-%d')}.
            """
            
            try:
                send_mail(
                    subject,
                    message,
                    'noreply@dottapps.com',
                    [email],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Failed to send email invitation: {str(e)}")