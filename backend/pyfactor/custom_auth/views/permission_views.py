"""
Enhanced Permission System API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta

from ..models import User
from ..permission_models import (
    PermissionTemplate, Department, UserDepartment,
    TemporaryPermission, PermissionDelegation,
    PermissionAuditLog, PermissionRequest
)
from ..serializers import (
    PermissionTemplateSerializer, DepartmentSerializer,
    UserDepartmentSerializer, TemporaryPermissionSerializer,
    PermissionDelegationSerializer, PermissionAuditLogSerializer,
    PermissionRequestSerializer, ApplyTemplateSerializer,
    BulkPermissionUpdateSerializer
)
from ..permission_service import PermissionService
from ..permissions import IsOwnerOrAdmin


class PermissionTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing permission templates"""
    serializer_class = PermissionTemplateSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get templates for current tenant"""
        queryset = PermissionTemplate.objects.filter(
            tenant=self.request.tenant
        )
        
        # Filter by type if specified
        template_type = self.request.query_params.get('type')
        if template_type:
            queryset = queryset.filter(template_type=template_type)
        
        # Filter active only by default
        show_inactive = self.request.query_params.get('show_inactive', 'false').lower() == 'true'
        if not show_inactive:
            queryset = queryset.filter(is_active=True)
        
        return queryset.order_by('template_type', 'name')
    
    def perform_create(self, serializer):
        """Create template with current tenant and user"""
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )
    
    @action(detail=False, methods=['get'])
    def system_templates(self, request):
        """Get available system templates"""
        service = PermissionService()
        templates = []
        
        for code, template_data in service.SYSTEM_TEMPLATES.items():
            templates.append({
                'code': code,
                'name': template_data['name'],
                'description': template_data['description'],
                'permissions': template_data['permissions']
            })
        
        return Response(templates)
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply template to users"""
        template = self.get_object()
        serializer = ApplyTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        merge = serializer.validated_data.get('merge_permissions', False)
        
        service = PermissionService()
        results = []
        errors = []
        
        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id, tenant=request.tenant)
                success = service.apply_template(user, template, merge=merge)
                if success:
                    results.append({
                        'user_id': user_id,
                        'email': user.email,
                        'status': 'success'
                    })
                else:
                    errors.append({
                        'user_id': user_id,
                        'email': user.email,
                        'error': 'Failed to apply template'
                    })
            except User.DoesNotExist:
                errors.append({
                    'user_id': user_id,
                    'error': 'User not found'
                })
            except Exception as e:
                errors.append({
                    'user_id': user_id,
                    'error': str(e)
                })
        
        return Response({
            'success': results,
            'errors': errors,
            'summary': {
                'total': len(user_ids),
                'successful': len(results),
                'failed': len(errors)
            }
        })
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template"""
        template = self.get_object()
        
        new_name = request.data.get('name', f"{template.name} (Copy)")
        new_code = request.data.get('code', f"{template.code}_copy")
        
        # Create duplicate
        new_template = PermissionTemplate.objects.create(
            name=new_name,
            code=new_code,
            description=template.description,
            permissions=template.permissions,
            template_type='CUSTOM',
            tenant=request.tenant,
            created_by=request.user
        )
        
        serializer = self.get_serializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing departments"""
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get departments for current tenant"""
        queryset = Department.objects.filter(tenant=self.request.tenant)
        
        # Filter active only by default
        show_inactive = self.request.query_params.get('show_inactive', 'false').lower() == 'true'
        if not show_inactive:
            queryset = queryset.filter(is_active=True)
        
        return queryset.order_by('name')
    
    def perform_create(self, serializer):
        """Create department with current tenant"""
        serializer.save(tenant=self.request.tenant)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get department members"""
        department = self.get_object()
        memberships = UserDepartment.objects.filter(
            department=department,
            is_active=True
        ).select_related('user')
        
        serializer = UserDepartmentSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add user to department"""
        department = self.get_object()
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'MEMBER')
        
        try:
            user = User.objects.get(id=user_id, tenant=request.tenant)
            
            membership, created = UserDepartment.objects.update_or_create(
                user=user,
                department=department,
                defaults={
                    'role': role,
                    'is_active': True,
                    'joined_date': timezone.now().date()
                }
            )
            
            # Apply department's default permissions if new member
            if created and department.default_template:
                service = PermissionService()
                service.apply_template(user, department.default_template)
            
            serializer = UserDepartmentSerializer(membership)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remove user from department"""
        department = self.get_object()
        user_id = request.data.get('user_id')
        
        try:
            membership = UserDepartment.objects.get(
                user_id=user_id,
                department=department
            )
            membership.is_active = False
            membership.left_date = timezone.now().date()
            membership.save()
            
            return Response({'status': 'Member removed'})
            
        except UserDepartment.DoesNotExist:
            return Response(
                {'error': 'Membership not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class TemporaryPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing temporary permissions"""
    serializer_class = TemporaryPermissionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get temporary permissions for current tenant"""
        queryset = TemporaryPermission.objects.filter(tenant=self.request.tenant)
        
        # Filter by user if specified
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by validity
        show_expired = self.request.query_params.get('show_expired', 'false').lower() == 'true'
        if not show_expired:
            now = timezone.now()
            queryset = queryset.filter(
                valid_until__gte=now,
                revoked=False
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create temporary permission"""
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            approved_by=self.request.user if self.request.user.role == 'OWNER' else None,
            approved_at=timezone.now() if self.request.user.role == 'OWNER' else None
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve temporary permission request"""
        temp_permission = self.get_object()
        
        if temp_permission.approved_by:
            return Response(
                {'error': 'Already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        temp_permission.approved_by = request.user
        temp_permission.approved_at = timezone.now()
        temp_permission.save()
        
        # Log the approval
        PermissionAuditLog.objects.create(
            user=temp_permission.user,
            action='TEMP_GRANT',
            new_permissions=temp_permission.permissions,
            changes_summary=f"Temporary permissions approved until {temp_permission.valid_until}",
            changed_by=request.user,
            change_reason=temp_permission.reason,
            tenant=request.tenant
        )
        
        serializer = self.get_serializer(temp_permission)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke temporary permission"""
        temp_permission = self.get_object()
        
        if temp_permission.revoked:
            return Response(
                {'error': 'Already revoked'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        temp_permission.revoked = True
        temp_permission.revoked_by = request.user
        temp_permission.revoked_at = timezone.now()
        temp_permission.revoke_reason = request.data.get('reason', '')
        temp_permission.save()
        
        serializer = self.get_serializer(temp_permission)
        return Response(serializer.data)


class PermissionDelegationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing permission delegations"""
    serializer_class = PermissionDelegationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get delegations for current user/tenant"""
        queryset = PermissionDelegation.objects.filter(tenant=self.request.tenant)
        
        # Filter by user role
        if self.request.user.role not in ['OWNER', 'ADMIN']:
            # Regular users can only see their own delegations
            queryset = queryset.filter(
                models.Q(delegator=self.request.user) |
                models.Q(delegate=self.request.user)
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create delegation from current user"""
        serializer.save(
            delegator=self.request.user,
            tenant=self.request.tenant
        )
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept delegation"""
        delegation = self.get_object()
        
        if delegation.delegate != request.user:
            return Response(
                {'error': 'You can only accept delegations to yourself'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if delegation.accepted:
            return Response(
                {'error': 'Already accepted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        delegation.accepted = True
        delegation.accepted_at = timezone.now()
        delegation.save()
        
        serializer = self.get_serializer(delegation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke delegation"""
        delegation = self.get_object()
        
        if delegation.delegator != request.user and request.user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {'error': 'You can only revoke your own delegations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        delegation.revoked = True
        delegation.revoked_at = timezone.now()
        delegation.revoke_reason = request.data.get('reason', '')
        delegation.save()
        
        serializer = self.get_serializer(delegation)
        return Response(serializer.data)


class PermissionAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing permission audit logs"""
    serializer_class = PermissionAuditLogSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get audit logs for current tenant"""
        queryset = PermissionAuditLog.objects.filter(tenant=self.request.tenant)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get audit log summary statistics"""
        queryset = self.get_queryset()
        
        # Get counts by action type
        action_counts = {}
        for action, label in PermissionAuditLog.ACTION_TYPES:
            action_counts[action] = queryset.filter(action=action).count()
        
        # Get recent activity
        last_7_days = timezone.now() - timedelta(days=7)
        recent_count = queryset.filter(created_at__gte=last_7_days).count()
        
        # Get most active users
        from django.db.models import Count
        top_users = queryset.values('changed_by__email').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return Response({
            'total_changes': queryset.count(),
            'action_counts': action_counts,
            'recent_activity': recent_count,
            'top_users': top_users
        })


class PermissionRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing permission requests"""
    serializer_class = PermissionRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get permission requests"""
        queryset = PermissionRequest.objects.filter(tenant=self.request.tenant)
        
        # Regular users can only see their own requests
        if self.request.user.role not in ['OWNER', 'ADMIN']:
            queryset = queryset.filter(requester=self.request.user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create permission request"""
        serializer.save(
            requester=self.request.user,
            tenant=self.request.tenant
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve permission request"""
        if request.user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {'error': 'Only owners and admins can approve requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        permission_request = self.get_object()
        
        if permission_request.status != 'PENDING':
            return Response(
                {'error': f'Request is already {permission_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get approved permissions (may be modified from requested)
        approved_permissions = request.data.get('approved_permissions', permission_request.requested_permissions)
        
        # Calculate valid_until for temporary permissions
        valid_until = None
        if not permission_request.is_permanent:
            duration_days = permission_request.requested_duration_days or 30
            valid_until = timezone.now() + timedelta(days=duration_days)
        
        # Update request
        permission_request.status = 'APPROVED'
        permission_request.reviewed_by = request.user
        permission_request.reviewed_at = timezone.now()
        permission_request.review_notes = request.data.get('review_notes', '')
        permission_request.approved_permissions = approved_permissions
        permission_request.valid_until = valid_until
        permission_request.save()
        
        # Apply the permissions
        service = PermissionService()
        service.update_permissions(
            permission_request.requester,
            approved_permissions,
            request.user,
            reason=f"Approved request: {permission_request.justification}"
        )
        
        # Create temporary permission record if not permanent
        if not permission_request.is_permanent:
            TemporaryPermission.objects.create(
                user=permission_request.requester,
                permissions=approved_permissions,
                reason=permission_request.justification,
                valid_until=valid_until,
                approved_by=request.user,
                approved_at=timezone.now(),
                tenant=request.tenant,
                created_by=request.user
            )
        
        serializer = self.get_serializer(permission_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        """Deny permission request"""
        if request.user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {'error': 'Only owners and admins can deny requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        permission_request = self.get_object()
        
        if permission_request.status != 'PENDING':
            return Response(
                {'error': f'Request is already {permission_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        permission_request.status = 'DENIED'
        permission_request.reviewed_by = request.user
        permission_request.reviewed_at = timezone.now()
        permission_request.review_notes = request.data.get('review_notes', '')
        permission_request.save()
        
        serializer = self.get_serializer(permission_request)
        return Response(serializer.data)


class PermissionValidationViewSet(viewsets.ViewSet):
    """ViewSet for permission validation and checking"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        """Validate a set of permissions"""
        permissions = request.data.get('permissions', {})
        
        service = PermissionService()
        validation_result = service.validate_permissions(permissions)
        
        return Response(validation_result)
    
    @action(detail=False, methods=['get'])
    def effective(self, request):
        """Get effective permissions for current user"""
        service = PermissionService()
        permissions = service.get_effective_permissions(request.user)
        
        return Response({
            'user_id': request.user.id,
            'email': request.user.email,
            'role': request.user.role,
            'permissions': permissions,
            'generated_at': timezone.now()
        })
    
    @action(detail=False, methods=['post'])
    def check_access(self, request):
        """Check if user has access to specific pages"""
        user_id = request.data.get('user_id', request.user.id)
        pages = request.data.get('pages', [])
        
        try:
            user = User.objects.get(id=user_id, tenant=request.tenant)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        service = PermissionService()
        results = {}
        
        for page in pages:
            results[page] = service.has_permission(user, page)
        
        return Response({
            'user_id': user.id,
            'email': user.email,
            'access': results
        })