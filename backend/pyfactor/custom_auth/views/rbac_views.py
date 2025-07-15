from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import secrets
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
import requests

from ..models import User, PagePermission, UserPageAccess, UserInvitation, RoleTemplate
from ..serializers import (
    UserListSerializer, PagePermissionSerializer, UserPageAccessSerializer,
    CreateUserInvitationSerializer, UserInvitationSerializer,
    UpdateUserPermissionsSerializer, RoleTemplateSerializer
)
from ..auth0_service import create_auth0_user_with_invitation, send_auth0_invitation_email

logger = logging.getLogger(__name__)


class IsOwnerOrAdmin(permissions.BasePermission):
    """Custom permission to only allow owners and admins to manage users"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['OWNER', 'ADMIN']


class UserManagementViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users within a tenant"""
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get users for the current tenant only"""
        queryset = User.objects.filter(
            tenant=self.request.user.tenant
        ).select_related('tenant').prefetch_related('page_access__page')
        
        # Filter for unlinked users (users without an employee record)
        if self.request.query_params.get('unlinked') == 'true':
            queryset = queryset.filter(employee_profile__isnull=True)
            
        return queryset
    
    @action(detail=True, methods=['post'])
    def update_permissions(self, request, pk=None):
        """Update user role and permissions"""
        user = self.get_object()
        
        # Prevent changing owner role
        if user.role == 'OWNER':
            return Response(
                {"error": "Cannot modify owner permissions"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Prevent non-owners from modifying admins
        if user.role == 'ADMIN' and request.user.role != 'OWNER':
            return Response(
                {"error": "Only owners can modify admin permissions"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UpdateUserPermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Update role if provided
            new_role = serializer.validated_data.get('role')
            if new_role and new_role != user.role:
                user.role = new_role
                user.save()
            
            # Update page permissions
            page_permissions = serializer.validated_data.get('page_permissions', [])
            
            # Clear existing permissions
            UserPageAccess.objects.filter(user=user, tenant=request.user.tenant).delete()
            
            # Create new permissions
            for perm_data in page_permissions:
                UserPageAccess.objects.create(
                    user=user,
                    page_id=perm_data['page_id'],
                    can_read=perm_data['can_read'],
                    can_write=perm_data['can_write'],
                    can_edit=perm_data['can_edit'],
                    can_delete=perm_data['can_delete'],
                    tenant=request.user.tenant,
                    granted_by=request.user
                )
        
        # Return updated user
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user"""
        user = self.get_object()
        
        if user.role == 'OWNER':
            return Response(
                {"error": "Cannot deactivate the owner"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.is_active = False
        user.save()
        
        return Response({"status": "User deactivated"})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user"""
        user = self.get_object()
        
        user.is_active = True
        user.save()
        
        return Response({"status": "User activated"})


class PagePermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing available pages"""
    queryset = PagePermission.objects.filter(is_active=True)
    serializer_class = PagePermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter pages based on user role"""
        queryset = super().get_queryset()
        
        # Hide system pages from non-admins/owners
        if self.request.user.role == 'USER':
            queryset = queryset.exclude(category='System')
        
        # Hide owner-only pages from admins
        if self.request.user.role == 'ADMIN':
            queryset = queryset.exclude(path__in=[
                '/settings/subscription',
                '/settings/close-account'
            ])
        
        return queryset


class UserInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user invitations"""
    serializer_class = UserInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get invitations for the current tenant"""
        return UserInvitation.objects.filter(
            tenant=self.request.user.tenant
        ).select_related('invited_by')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserInvitationSerializer
        return UserInvitationSerializer
    
    def create(self, request, *args, **kwargs):
        """Create and send user invitation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create invitation
        invitation = UserInvitation.objects.create(
            email=serializer.validated_data['email'],
            role=serializer.validated_data['role'],
            invited_by=request.user,
            tenant=request.user.tenant,
            invitation_token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=7),
            page_permissions=serializer.validated_data.get('page_permissions', {})
        )
        
        # Create Auth0 user and send invitation
        try:
            # Create user in Auth0 with invitation metadata
            auth0_user = create_auth0_user_with_invitation(
                email=invitation.email,
                role=invitation.role,
                tenant_id=invitation.tenant.id,
                invitation_token=invitation.invitation_token
            )
            
            if auth0_user:
                # Generate invitation acceptance URL
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://dottapps.com')
                accept_url = f"{frontend_url}/auth/accept-invitation?token={invitation.invitation_token}&email={invitation.email}"
                
                # Send password reset ticket as invitation
                ticket_url = send_auth0_invitation_email(invitation.email, accept_url)
                
                if ticket_url:
                    # Send custom invitation email with the ticket URL
                    self._send_invitation_email(invitation, ticket_url)
                    
                    invitation.status = 'sent'
                    invitation.sent_at = timezone.now()
                    invitation.save()
                    
                    logger.info(f"[RBAC] Successfully sent invitation to {invitation.email}")
                else:
                    logger.error(f"[RBAC] Failed to create Auth0 password reset ticket for {invitation.email}")
                    invitation.status = 'failed'
                    invitation.save()
            else:
                logger.error(f"[RBAC] Failed to create Auth0 user for {invitation.email}")
                invitation.status = 'failed'
                invitation.save()
                
        except Exception as e:
            logger.error(f"[RBAC] Error sending invitation: {str(e)}")
            invitation.status = 'failed'
            invitation.save()
        
        return Response(
            UserInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend invitation email"""
        invitation = self.get_object()
        
        if invitation.status == 'accepted':
            return Response(
                {"error": "Invitation already accepted"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new token and extend expiry
        invitation.invitation_token = secrets.token_urlsafe(32)
        invitation.expires_at = timezone.now() + timedelta(days=7)
        
        try:
            # Update Auth0 user metadata with new invitation token
            auth0_user = create_auth0_user_with_invitation(
                email=invitation.email,
                role=invitation.role,
                tenant_id=invitation.tenant.id,
                invitation_token=invitation.invitation_token
            )
            
            if auth0_user:
                # Generate new invitation acceptance URL
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://dottapps.com')
                accept_url = f"{frontend_url}/auth/accept-invitation?token={invitation.invitation_token}&email={invitation.email}"
                
                # Send new password reset ticket
                ticket_url = send_auth0_invitation_email(invitation.email, accept_url)
                
                if ticket_url:
                    # Send invitation email
                    self._send_invitation_email(invitation, ticket_url)
                    
                    invitation.status = 'sent'
                    invitation.sent_at = timezone.now()
                    invitation.save()
                    
                    logger.info(f"[RBAC] Successfully resent invitation to {invitation.email}")
                    return Response({"status": "Invitation resent"})
                else:
                    logger.error(f"[RBAC] Failed to create Auth0 password reset ticket for {invitation.email}")
                    return Response(
                        {"error": "Failed to send invitation email"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                logger.error(f"[RBAC] Failed to update Auth0 user for {invitation.email}")
                return Response(
                    {"error": "Failed to update user invitation"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"[RBAC] Error resending invitation: {str(e)}")
            return Response(
                {"error": "Failed to resend invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel invitation"""
        invitation = self.get_object()
        
        if invitation.status == 'accepted':
            return Response(
                {"error": "Cannot cancel accepted invitation"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invitation.status = 'cancelled'
        invitation.save()
        
        return Response({"status": "Invitation cancelled"})
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verify invitation token"""
        token = request.data.get('token')
        email = request.data.get('email')
        
        if not token or not email:
            return Response(
                {"error": "Token and email are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = UserInvitation.objects.get(
                invitation_token=token,
                email__iexact=email,
                status='sent'
            )
            
            # Check if invitation has expired
            if invitation.expires_at < timezone.now():
                return Response(
                    {"error": "Invitation has expired"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Return invitation details
            return Response({
                "tenant_name": invitation.tenant.name,
                "role": invitation.role,
                "invited_by_name": invitation.invited_by.full_name or invitation.invited_by.email,
                "page_permissions": invitation.page_permissions,
                "expires_at": invitation.expires_at
            })
            
        except UserInvitation.DoesNotExist:
            return Response(
                {"error": "Invalid invitation"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def accept(self, request):
        """Accept invitation and create user account"""
        token = request.data.get('token')
        email = request.data.get('email')
        
        if not token or not email:
            return Response(
                {"error": "Token and email are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get invitation
            invitation = UserInvitation.objects.get(
                invitation_token=token,
                email__iexact=email,
                status='sent'
            )
            
            # Check if invitation has expired
            if invitation.expires_at < timezone.now():
                return Response(
                    {"error": "Invitation has expired"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response(
                    {"error": "User must be authenticated"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Verify the authenticated user's email matches the invitation
            if request.user.email.lower() != invitation.email.lower():
                return Response(
                    {"error": "Authenticated user email does not match invitation"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            with transaction.atomic():
                # Update user with tenant and role
                user = request.user
                user.tenant = invitation.tenant
                user.role = invitation.role
                user.save()
                
                # Create page permissions
                if invitation.page_permissions:
                    for page_id, permissions in invitation.page_permissions.items():
                        try:
                            page = PagePermission.objects.get(id=page_id)
                            UserPageAccess.objects.create(
                                user=user,
                                page=page,
                                can_read=permissions.get('can_read', False),
                                can_write=permissions.get('can_write', False),
                                can_edit=permissions.get('can_edit', False),
                                can_delete=permissions.get('can_delete', False)
                            )
                        except PagePermission.DoesNotExist:
                            logger.warning(f"Page permission {page_id} not found")
                
                # Mark invitation as accepted
                invitation.status = 'accepted'
                invitation.accepted_at = timezone.now()
                invitation.save()
                
                # Get user's permissions
                user_permissions = []
                for access in user.page_access.all():
                    user_permissions.append({
                        'page_id': str(access.page.id),
                        'path': access.page.path,
                        'can_read': access.can_read,
                        'can_write': access.can_write,
                        'can_edit': access.can_edit,
                        'can_delete': access.can_delete
                    })
                
                return Response({
                    "success": True,
                    "tenant_id": str(invitation.tenant.id),
                    "role": user.role,
                    "permissions": user_permissions
                })
                
        except UserInvitation.DoesNotExist:
            return Response(
                {"error": "Invalid invitation"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"[RBAC] Error accepting invitation: {str(e)}")
            return Response(
                {"error": "Failed to accept invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_invitation_email(self, invitation, ticket_url):
        """Send custom invitation email"""
        try:
            subject = f"You've been invited to join {invitation.tenant.name}"
            
            # Email context
            context = {
                'user_name': invitation.invited_by.full_name or invitation.invited_by.email,
                'business_name': invitation.tenant.name,
                'role': invitation.role,
                'invitation_url': ticket_url,
                'expires_at': invitation.expires_at.strftime('%B %d, %Y'),
            }
            
            # HTML message
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to {context['business_name']}!</h2>
                <p>Hello,</p>
                <p>{context['user_name']} has invited you to join {context['business_name']} as a {context['role']}.</p>
                <p>To accept this invitation and set up your account, please click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{context['invitation_url']}" 
                       style="background-color: #0066cc; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Accept Invitation
                    </a>
                </div>
                <p>This invitation will expire on {context['expires_at']}.</p>
                <p>If you have any questions, please contact {context['user_name']}.</p>
                <hr style="margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                    If you didn't expect this invitation, you can safely ignore this email.
                </p>
            </div>
            """
            
            # Plain text message
            plain_message = f"""
Welcome to {context['business_name']}!

{context['user_name']} has invited you to join {context['business_name']} as a {context['role']}.

To accept this invitation and set up your account, please visit:
{context['invitation_url']}

This invitation will expire on {context['expires_at']}.

If you have any questions, please contact {context['user_name']}.

If you didn't expect this invitation, you can safely ignore this email.
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"[RBAC] Invitation email sent to {invitation.email}")
            
        except Exception as e:
            logger.error(f"[RBAC] Failed to send invitation email: {str(e)}")
            raise


class RoleTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for role templates"""
    queryset = RoleTemplate.objects.filter(is_active=True).prefetch_related('pages')
    serializer_class = RoleTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """Get detailed permissions for a role template"""
        template = self.get_object()
        
        permissions = []
        for template_page in template.roletemplatepages_set.select_related('page'):
            permissions.append({
                'page': PagePermissionSerializer(template_page.page).data,
                'can_read': template_page.can_read,
                'can_write': template_page.can_write,
                'can_edit': template_page.can_edit,
                'can_delete': template_page.can_delete
            })
        
        return Response(permissions)


class DirectUserCreationViewSet(viewsets.ViewSet):
    """ViewSet for direct user creation (no invitation)"""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    @action(detail=False, methods=['post'], url_path='check-exists')
    def check_user_exists(self, request):
        """Check if user exists with given email"""
        email = request.data.get('email')
        tenant_id = request.data.get('tenant_id') or request.user.tenant.id
        
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        exists = User.objects.filter(
            email__iexact=email,
            tenant_id=tenant_id
        ).exists()
        
        return Response({"exists": exists})
    
    @action(detail=False, methods=['post'], url_path='create')
    @transaction.atomic
    def create_user(self, request):
        """Create user directly in Auth0 and backend"""
        try:
            logger.info(f"[DirectUserCreation] === Starting user creation ===")
            logger.info(f"[DirectUserCreation] Raw request data: {request.data}")
            logger.info(f"[DirectUserCreation] Request data type: {type(request.data)}")
            
            # Validate request data
            email = request.data.get('email')
            role = request.data.get('role', 'USER')
            permissions_raw = request.data.get('permissions', [])
            
            # Handle permissions - could be string or list
            import json
            if isinstance(permissions_raw, str):
                try:
                    permissions = json.loads(permissions_raw)
                except json.JSONDecodeError:
                    permissions = []
            else:
                permissions = permissions_raw or []
            create_employee = request.data.get('create_employee', False)
            link_employee = request.data.get('link_employee', False)
            employee_id = request.data.get('employee_id')
            employee_data_raw = request.data.get('employee_data', {})
            
            # Handle employee_data - could be string or dict
            if isinstance(employee_data_raw, str):
                try:
                    employee_data = json.loads(employee_data_raw) if employee_data_raw else {}
                except json.JSONDecodeError:
                    employee_data = {}
            else:
                employee_data = employee_data_raw or {}
            
            # Validation
            if not email:
                return Response(
                    {"error": "Email is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user already exists
            try:
                existing_user = User.objects.filter(email__iexact=email).first()
                if existing_user:
                    if existing_user.tenant == request.user.tenant:
                        logger.warning(f"[DirectUserCreation] User with email {email} already exists in tenant")
                        return Response(
                            {
                                "error": "A user with this email already exists", 
                                "message": "This email address is already associated with a user account. Please use a different email address or contact the existing user.",
                                "userFriendly": True
                            },
                            status=status.HTTP_409_CONFLICT
                        )
                    else:
                        logger.warning(f"[DirectUserCreation] User with email {email} exists in different tenant")
                        return Response(
                            {
                                "error": "Email already in use",
                                "message": "This email address is already registered. Please use a different email address.",
                                "userFriendly": True
                            },
                            status=status.HTTP_409_CONFLICT
                        )
            except Exception as e:
                logger.error(f"[DirectUserCreation] Error checking existing user: {str(e)}")
                # Continue anyway - better to try creating than fail here
            
            if role not in ['ADMIN', 'USER']:
                return Response(
                    {"error": "Invalid role. Must be ADMIN or USER"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if link_employee and not employee_id:
                return Response(
                    {"error": "Employee ID is required when linking to existing employee"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            
            # Check if employee exists (if linking)
            employee = None
            if link_employee:
                try:
                    from hr.models import Employee
                    employee = Employee.objects.get(
                        id=employee_id,
                        business_id=request.user.business_id
                    )
                    if employee.user_id:
                        return Response(
                            {"error": "Employee already has a user account"},
                            status=status.HTTP_409_CONFLICT
                        )
                except Employee.DoesNotExist:
                    return Response(
                        {"error": "Employee not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Create user in database (within transaction)
            logger.info(f"[DirectUserCreation] Creating user in database for {email}")
            try:
                user = User.objects.create(
                    email=email,
                    role=role,
                    tenant=request.user.tenant,
                    business_id=request.user.business_id,
                    is_active=True,
                    auth0_sub=f"pending_{email}_{timezone.now().timestamp()}"  # Temporary ID
                )
                logger.info(f"[DirectUserCreation] User created in database with ID: {user.id}")
            except Exception as db_error:
                logger.error(f"[DirectUserCreation] Database error creating user: {str(db_error)}")
                raise
            
            # Create page permissions
            from custom_auth.models import UserPageAccess, PagePermission
            logger.info(f"[DirectUserCreation] Processing permissions: {permissions}, type: {type(permissions)}")
            
            try:
                # Ensure permissions is a list
                if not isinstance(permissions, list):
                    logger.warning(f"[DirectUserCreation] Permissions is not a list: {type(permissions)}")
                    permissions = []
                
                for perm in permissions:
                    # Skip if perm is not a dict
                    if not isinstance(perm, dict):
                        logger.warning(f"[DirectUserCreation] Skipping non-dict permission: {perm}")
                        continue
                        
                    page_id = perm.get('pageId')
                    if page_id:
                        try:
                            page = PagePermission.objects.get(id=page_id)
                            UserPageAccess.objects.create(
                                user=user,
                                page=page,
                                can_read=perm.get('canRead', True),
                                can_write=perm.get('canWrite', False),
                                can_edit=perm.get('canEdit', False),
                                can_delete=perm.get('canDelete', False)
                            )
                        except PagePermission.DoesNotExist:
                            logger.warning(f"Page permission {page_id} not found")
            except Exception as perm_error:
                logger.error(f"[DirectUserCreation] Error processing permissions: {str(perm_error)}")
                # Don't fail user creation just because of permissions
            
            # Link to existing employee or create new one
            if link_employee and employee:
                employee.user = user
                employee.save()
                
                # Sync permissions based on employee role
                from custom_auth.employee_sync import sync_employee_role_to_user_permissions
                sync_employee_role_to_user_permissions(employee, user)
                
            elif create_employee:
                from hr.models import Employee
                Employee.objects.create(
                    user=user,
                    business_id=request.user.business_id,
                    tenant_id=request.user.tenant.id,
                    first_name=email.split('@')[0],
                    last_name='',
                    email=email,
                    department=employee_data.get('department', ''),
                    job_title=employee_data.get('jobTitle', ''),
                    employment_type=employee_data.get('employmentType', 'FT'),
                    hire_date=timezone.now().date(),
                    is_active=True
                )
            
            # Note: Auth0 user creation will be handled by the frontend API
            # The frontend will create the Auth0 user and send the password reset email
            
            # Create Auth0 user and send password reset email
            logger.info(f"[DirectUserCreation] User created in database successfully, now creating Auth0 user")
            
            try:
                auth0_user_id = self._create_auth0_user_and_send_reset(email, user, request.user.tenant)
                if auth0_user_id:
                    # Update user with real Auth0 ID
                    user.auth0_sub = auth0_user_id
                    user.save()
                    logger.info(f"[DirectUserCreation] Auth0 user created successfully: {auth0_user_id}")
                else:
                    logger.warning(f"[DirectUserCreation] Auth0 user creation failed, but database user exists")
            except Exception as auth0_error:
                logger.error(f"[DirectUserCreation] Auth0 integration error: {str(auth0_error)}")
                # Don't fail the entire operation if Auth0 fails
            
            # Return user data
            serializer = UserListSerializer(user)
            return Response({
                "user": serializer.data,
                "message": f"User created successfully. Password reset email sent to {email}"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"[DirectUserCreation] Error creating user: {str(e)}")
            logger.info(f"[DirectUserCreation] Transaction will be rolled back due to error")
            # @transaction.atomic ensures all database changes are rolled back automatically
            return Response(
                {"error": f"Failed to create user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _create_auth0_user_and_send_reset(self, email, user, tenant):
        """Create Auth0 user and send custom password reset email"""
        try:
            logger.info(f"[DirectUserCreation] Starting Auth0 user creation for {email}")
            
            # Get Auth0 Management API token
            auth0_tenant_domain = 'dev-cbyy63jovi6zrcos.us.auth0.com'
            auth0_config = {
                'domain': auth0_tenant_domain,
                'client_id': settings.AUTH0_MANAGEMENT_CLIENT_ID,
                'client_secret': settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                'audience': f"https://{auth0_tenant_domain}/api/v2/"
            }
            
            if not all([auth0_config['domain'], auth0_config['client_id'], auth0_config['client_secret']]):
                logger.error("[DirectUserCreation] Auth0 M2M credentials not configured")
                return None
            
            # Get Management API access token
            token_url = f"https://{auth0_config['domain']}/oauth/token"
            token_payload = {
                'client_id': auth0_config['client_id'],
                'client_secret': auth0_config['client_secret'],
                'audience': auth0_config['audience'],
                'grant_type': 'client_credentials'
            }
            
            token_response = requests.post(token_url, json=token_payload)
            if token_response.status_code != 200:
                logger.error(f"[DirectUserCreation] Failed to get Auth0 token: {token_response.text}")
                return None
            
            access_token = token_response.json().get('access_token')
            self.management_api_token = access_token  # Store for later use
            
            # Generate a secure temporary password
            import string
            import random
            temp_password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=20)) + 'Aa1!'
            
            # Create Auth0 user
            users_url = f"https://{auth0_config['domain']}/api/v2/users"
            user_payload = {
                'email': email,
                'password': temp_password,
                'connection': 'Username-Password-Authentication',
                'email_verified': True,  # Mark as verified to prevent verification emails
                'verify_email': False,  # Don't send any Auth0 emails
                'app_metadata': {
                    'tenant_id': str(tenant.id),
                    'tenant_name': tenant.name,
                    'role': user.role,
                    'created_by': 'admin_user_management'
                },
                'user_metadata': {
                    'tenant_id': str(tenant.id),
                    'created_via': 'admin_panel'
                }
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            user_response = requests.post(users_url, json=user_payload, headers=headers)
            
            if user_response.status_code == 201:
                auth0_user = user_response.json()
                auth0_user_id = auth0_user.get('user_id')
                logger.info(f"[DirectUserCreation] Auth0 user created: {auth0_user_id}")
                
                # Try to use custom password reset flow, fall back to dbconnections if model doesn't exist
                try:
                    from ..models import PasswordResetToken
                    import secrets
                    reset_token = secrets.token_urlsafe(32)
                    
                    # Store token with 24 hour expiry
                    PasswordResetToken.objects.create(
                        user=user,
                        token=reset_token,
                        expires_at=timezone.now() + timedelta(hours=24)
                    )
                    
                    # Send custom email with our password reset link
                    self._send_custom_password_reset_email(email, reset_token, tenant.name, user.role)
                    logger.info(f"[DirectUserCreation] Custom password reset email sent")
                    
                except Exception as e:
                    logger.warning(f"[DirectUserCreation] PasswordResetToken not available, using Auth0 dbconnections: {str(e)}")
                    
                    # Fallback: Send password reset via Auth0 dbconnections API
                    import time
                    time.sleep(2)
                    
                    reset_url = f"https://{auth0_tenant_domain}/dbconnections/change_password"
                    reset_payload = {
                        'client_id': settings.AUTH0_CLIENT_ID,
                        'email': email,
                        'connection': 'Username-Password-Authentication'
                    }
                    
                    logger.info(f"[DirectUserCreation] Sending password reset via dbconnections API")
                    reset_response = requests.post(reset_url, json=reset_payload)
                    
                    if reset_response.status_code == 200:
                        logger.info(f"[DirectUserCreation] Password reset email sent via Auth0")
                    else:
                        logger.error(f"[DirectUserCreation] Failed to send password reset: {reset_response.text}")
                
                return auth0_user_id
            else:
                logger.error(f"[DirectUserCreation] Failed to create Auth0 user: {user_response.text}")
                return None
                
        except Exception as e:
            logger.error(f"[DirectUserCreation] Auth0 integration error: {str(e)}")
            import traceback
            logger.error(f"[DirectUserCreation] Auth0 error traceback: {traceback.format_exc()}")
            return None
    
    def _send_custom_password_reset_email(self, email, token, tenant_name, role):
        """Send custom password reset email"""
        try:
            from django.core.mail import send_mail
            from django.template.loader import render_to_string
            
            # Generate reset URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://dottapps.com')
            reset_url = f"{frontend_url}/auth/set-password?token={token}&email={email}"
            
            subject = f"Set your password for {tenant_name}"
            
            # HTML message
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to {tenant_name}!</h2>
                <p>Your account has been created with the role of <strong>{role}</strong>.</p>
                <p>Please click the button below to set your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #0066cc; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Set Your Password
                    </a>
                </div>
                <p>This link will expire in 24 hours.</p>
                <p>If you have any questions, please contact your administrator.</p>
                <hr style="margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                    If you didn't expect this email, you can safely ignore it.
                </p>
            </div>
            """
            
            # Plain text message
            plain_message = f"""
Welcome to {tenant_name}!

Your account has been created with the role of {role}.

Please visit the following link to set your password:
{reset_url}

This link will expire in 24 hours.

If you have any questions, please contact your administrator.

If you didn't expect this email, you can safely ignore it.
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"[DirectUserCreation] Custom password reset email sent to {email}")
            
        except Exception as e:
            logger.error(f"[DirectUserCreation] Failed to send custom email: {str(e)}")
            raise