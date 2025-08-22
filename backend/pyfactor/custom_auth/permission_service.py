"""
Permission Service - Core business logic for permission management
"""
import json
import logging
from typing import Dict, List, Optional, Set
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

from .models import User, PagePermission, UserPageAccess, Tenant
from .permission_models import (
    PermissionTemplate, Department, UserDepartment,
    TemporaryPermission, PermissionDelegation,
    PermissionAuditLog, PermissionRequest
)

logger = logging.getLogger(__name__)


class PermissionService:
    """
    Centralized service for all permission-related operations
    """
    
    # System permission templates (hardcoded for consistency)
    SYSTEM_TEMPLATES = {
        'sales_manager': {
            'name': 'Sales Manager',
            'description': 'Full access to sales, customers, and invoicing',
            'permissions': {
                'sales-dashboard': {'canAccess': True, 'canWrite': True},
                'sales-products': {'canAccess': True, 'canWrite': True},
                'sales-services': {'canAccess': True, 'canWrite': True},
                'sales-customers': {'canAccess': True, 'canWrite': True},
                'sales-estimates': {'canAccess': True, 'canWrite': True},
                'sales-orders': {'canAccess': True, 'canWrite': True},
                'sales-invoices': {'canAccess': True, 'canWrite': True},
                'sales-reports': {'canAccess': True, 'canWrite': False},
                'dashboard': {'canAccess': True, 'canWrite': False},
            }
        },
        'hr_admin': {
            'name': 'HR Administrator',
            'description': 'Manage employees, timesheets, and payroll',
            'permissions': {
                'hr-dashboard': {'canAccess': True, 'canWrite': True},
                'hr-employees': {'canAccess': True, 'canWrite': True},
                'hr-timesheets': {'canAccess': True, 'canWrite': True},
                'hr-benefits': {'canAccess': True, 'canWrite': True},
                'hr-performance': {'canAccess': True, 'canWrite': True},
                'payroll-dashboard': {'canAccess': True, 'canWrite': True},
                'payroll-run': {'canAccess': True, 'canWrite': True},
                'payroll-schedule': {'canAccess': True, 'canWrite': True},
                'payroll-reports': {'canAccess': True, 'canWrite': False},
                'dashboard': {'canAccess': True, 'canWrite': False},
            }
        },
        'accountant': {
            'name': 'Accountant',
            'description': 'Financial management and reporting',
            'permissions': {
                'banking-dashboard': {'canAccess': True, 'canWrite': False},
                'banking-transactions': {'canAccess': True, 'canWrite': True},
                'banking-reconciliation': {'canAccess': True, 'canWrite': True},
                'banking-reports': {'canAccess': True, 'canWrite': False},
                'taxes-dashboard': {'canAccess': True, 'canWrite': False},
                'taxes-forms': {'canAccess': True, 'canWrite': True},
                'taxes-filing': {'canAccess': True, 'canWrite': True},
                'taxes-reports': {'canAccess': True, 'canWrite': False},
                'purchases-bills': {'canAccess': True, 'canWrite': True},
                'purchases-expenses': {'canAccess': True, 'canWrite': True},
                'analytics-financial': {'canAccess': True, 'canWrite': False},
                'dashboard': {'canAccess': True, 'canWrite': False},
            }
        },
        'inventory_manager': {
            'name': 'Inventory Manager',
            'description': 'Manage inventory, stock, and suppliers',
            'permissions': {
                'inventory-dashboard': {'canAccess': True, 'canWrite': True},
                'inventory-stock': {'canAccess': True, 'canWrite': True},
                'inventory-locations': {'canAccess': True, 'canWrite': True},
                'inventory-suppliers': {'canAccess': True, 'canWrite': True},
                'inventory-reports': {'canAccess': True, 'canWrite': False},
                'purchases-orders': {'canAccess': True, 'canWrite': True},
                'sales-products': {'canAccess': True, 'canWrite': True},
                'dashboard': {'canAccess': True, 'canWrite': False},
            }
        },
        'customer_service': {
            'name': 'Customer Service',
            'description': 'Handle customer inquiries and basic transactions',
            'permissions': {
                'sales-customers': {'canAccess': True, 'canWrite': True},
                'sales-orders': {'canAccess': True, 'canWrite': False},
                'sales-invoices': {'canAccess': True, 'canWrite': False},
                'payments-receive': {'canAccess': True, 'canWrite': True},
                'dashboard': {'canAccess': True, 'canWrite': False},
            }
        },
        'viewer': {
            'name': 'Viewer',
            'description': 'Read-only access to all non-sensitive areas',
            'permissions': {
                'dashboard': {'canAccess': True, 'canWrite': False},
                'sales-dashboard': {'canAccess': True, 'canWrite': False},
                'inventory-dashboard': {'canAccess': True, 'canWrite': False},
                'sales-reports': {'canAccess': True, 'canWrite': False},
                'inventory-reports': {'canAccess': True, 'canWrite': False},
                'analytics-dashboard': {'canAccess': True, 'canWrite': False},
                'analytics-sales': {'canAccess': True, 'canWrite': False},
                'analytics-customer': {'canAccess': True, 'canWrite': False},
            }
        }
    }
    
    def __init__(self):
        self.cache_timeout = 300  # 5 minutes
    
    @transaction.atomic
    def apply_template(self, user: User, template: PermissionTemplate) -> bool:
        """
        Apply a permission template to a user
        """
        try:
            logger.info(f"Applying template {template.code} to user {user.email}")
            
            # Clear existing permissions
            UserPageAccess.objects.filter(user=user, tenant=user.tenant).delete()
            
            # Apply template permissions
            permissions = template.permissions
            created_count = 0
            
            for page_id, perms in permissions.items():
                # Find or create the page permission
                page, _ = PagePermission.objects.get_or_create(
                    name=page_id,
                    defaults={
                        'path': f'/dashboard/{page_id.replace("-", "/")}',
                        'category': page_id.split('-')[0].upper(),
                        'description': f'Access to {page_id}',
                    }
                )
                
                # Create user access
                UserPageAccess.objects.create(
                    user=user,
                    page=page,
                    tenant=user.tenant,
                    can_read=perms.get('canAccess', False),
                    can_write=perms.get('canWrite', False),
                    can_edit=perms.get('canWrite', False),
                    can_delete=perms.get('canWrite', False),
                    granted_by=user  # TODO: Get from request context
                )
                created_count += 1
            
            # Log the change
            self.audit_permission_change(
                user=user,
                action='TEMPLATE_APPLY',
                old_permissions={},
                new_permissions=permissions,
                changed_by=user,  # TODO: Get from request context
                reason=f"Applied template: {template.name}"
            )
            
            # Clear cache
            self.clear_user_permission_cache(user)
            
            logger.info(f"Successfully applied {created_count} permissions to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Error applying template to user {user.email}: {str(e)}")
            raise
    
    def validate_permissions(self, permissions: Dict) -> Dict[str, List[str]]:
        """
        Validate permission set for consistency and conflicts
        Returns dict of warnings and errors
        """
        issues = {
            'errors': [],
            'warnings': []
        }
        
        # Check for orphaned child permissions
        for page_id, perms in permissions.items():
            if '-' in page_id:  # This is a child page
                parent_id = page_id.split('-')[0]
                if parent_id not in permissions:
                    issues['warnings'].append(
                        f"Child permission '{page_id}' granted without parent '{parent_id}'"
                    )
        
        # Check for write without read
        for page_id, perms in permissions.items():
            if perms.get('canWrite') and not perms.get('canAccess'):
                issues['errors'].append(
                    f"Permission '{page_id}' has write access without read access"
                )
        
        # Check for delete without write
        for page_id, perms in permissions.items():
            if perms.get('canDelete') and not perms.get('canWrite'):
                issues['warnings'].append(
                    f"Permission '{page_id}' has delete access without write access"
                )
        
        return issues
    
    def get_effective_permissions(self, user: User, include_temp: bool = True) -> Dict:
        """
        Get all effective permissions for a user including:
        - Direct permissions
        - Department permissions
        - Temporary permissions
        - Delegated permissions
        """
        cache_key = f"user_permissions_{user.id}_{include_temp}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        permissions = {}
        
        # 1. Direct permissions
        direct_perms = UserPageAccess.objects.filter(
            user=user,
            tenant=user.tenant
        ).select_related('page')
        
        for access in direct_perms:
            permissions[access.page.name] = {
                'canAccess': access.can_read,
                'canWrite': access.can_write,
                'canEdit': access.can_edit,
                'canDelete': access.can_delete,
                'source': 'direct'
            }
        
        # 2. Department permissions
        dept_memberships = UserDepartment.objects.filter(
            user=user,
            is_active=True
        ).select_related('department')
        
        for membership in dept_memberships:
            if membership.department.default_permissions:
                for page_id, perms in membership.department.default_permissions.items():
                    if page_id not in permissions:
                        permissions[page_id] = {**perms, 'source': 'department'}
        
        # 3. Temporary permissions (if included)
        if include_temp:
            temp_perms = TemporaryPermission.objects.filter(
                user=user,
                is_active=True,
                revoked=False,
                valid_from__lte=timezone.now(),
                valid_until__gte=timezone.now()
            )
            
            for temp in temp_perms:
                for page_id, perms in temp.permissions.items():
                    if page_id not in permissions:
                        permissions[page_id] = {**perms, 'source': 'temporary'}
                    else:
                        # Merge with existing (take the higher permission)
                        for key in ['canAccess', 'canWrite', 'canEdit', 'canDelete']:
                            if perms.get(key):
                                permissions[page_id][key] = True
        
        # 4. Delegated permissions
        delegations = PermissionDelegation.objects.filter(
            delegate=user,
            is_active=True,
            accepted=True,
            revoked=False,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now()
        ).select_related('delegator')
        
        for delegation in delegations:
            if delegation.permissions_to_delegate == 'ALL':
                # Get all permissions of delegator
                delegator_perms = self.get_effective_permissions(
                    delegation.delegator, 
                    include_temp=False
                )
                for page_id, perms in delegator_perms.items():
                    if page_id not in permissions:
                        permissions[page_id] = {**perms, 'source': 'delegated'}
            else:
                # Specific permissions
                for page_id, perms in delegation.permissions_to_delegate.items():
                    if page_id not in permissions:
                        permissions[page_id] = {**perms, 'source': 'delegated'}
        
        # Cache the result
        cache.set(cache_key, permissions, self.cache_timeout)
        
        return permissions
    
    def audit_permission_change(
        self,
        user: User,
        action: str,
        old_permissions: Dict,
        new_permissions: Dict,
        changed_by: User,
        reason: str = "",
        ip_address: str = None,
        user_agent: str = None
    ):
        """
        Create an audit log entry for permission changes
        """
        # Generate human-readable summary
        summary = self._generate_change_summary(old_permissions, new_permissions)
        
        # Create audit log
        audit = PermissionAuditLog.objects.create(
            user=user,
            action=action,
            old_permissions=old_permissions,
            new_permissions=new_permissions,
            changes_summary=summary,
            changed_by=changed_by,
            change_reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            tenant=user.tenant
        )
        
        # Send notification if significant changes
        if action in ['GRANT', 'REVOKE', 'TEMPLATE_APPLY']:
            self._send_permission_change_notification(user, summary, changed_by)
        
        return audit
    
    def _generate_change_summary(self, old_perms: Dict, new_perms: Dict) -> str:
        """
        Generate human-readable summary of permission changes
        """
        added = set(new_perms.keys()) - set(old_perms.keys())
        removed = set(old_perms.keys()) - set(new_perms.keys())
        modified = []
        
        for key in set(old_perms.keys()) & set(new_perms.keys()):
            if old_perms[key] != new_perms[key]:
                modified.append(key)
        
        summary_parts = []
        if added:
            summary_parts.append(f"Added: {', '.join(added)}")
        if removed:
            summary_parts.append(f"Removed: {', '.join(removed)}")
        if modified:
            summary_parts.append(f"Modified: {', '.join(modified)}")
        
        return "; ".join(summary_parts) if summary_parts else "No changes"
    
    def _send_permission_change_notification(
        self,
        user: User,
        summary: str,
        changed_by: User
    ):
        """
        Send email notification about permission changes
        """
        try:
            subject = "Your permissions have been updated"
            context = {
                'user': user,
                'summary': summary,
                'changed_by': changed_by,
                'timestamp': timezone.now()
            }
            
            # TODO: Create email template
            message = f"""
            Hello {user.first_name or user.email},
            
            Your permissions have been updated by {changed_by.email}.
            
            Changes:
            {summary}
            
            If you have questions about these changes, please contact your administrator.
            
            Best regards,
            The Dott Team
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True
            )
        except Exception as e:
            logger.error(f"Failed to send permission notification: {str(e)}")
    
    def clear_user_permission_cache(self, user: User):
        """
        Clear all cached permissions for a user
        """
        cache_keys = [
            f"user_permissions_{user.id}_True",
            f"user_permissions_{user.id}_False",
        ]
        for key in cache_keys:
            cache.delete(key)
    
    def check_permission(
        self,
        user: User,
        page: str,
        action: str = 'read'
    ) -> bool:
        """
        Check if user has specific permission
        """
        permissions = self.get_effective_permissions(user)
        page_perms = permissions.get(page, {})
        
        if action == 'read':
            return page_perms.get('canAccess', False)
        elif action == 'write':
            return page_perms.get('canWrite', False)
        elif action == 'edit':
            return page_perms.get('canEdit', False)
        elif action == 'delete':
            return page_perms.get('canDelete', False)
        
        return False
    
    def copy_permissions(
        self,
        from_user: User,
        to_user: User,
        changed_by: User
    ) -> bool:
        """
        Copy all permissions from one user to another
        """
        try:
            # Get source permissions
            source_perms = UserPageAccess.objects.filter(
                user=from_user,
                tenant=from_user.tenant
            )
            
            # Clear target permissions
            UserPageAccess.objects.filter(
                user=to_user,
                tenant=to_user.tenant
            ).delete()
            
            # Copy permissions
            for perm in source_perms:
                UserPageAccess.objects.create(
                    user=to_user,
                    page=perm.page,
                    tenant=to_user.tenant,
                    can_read=perm.can_read,
                    can_write=perm.can_write,
                    can_edit=perm.can_edit,
                    can_delete=perm.can_delete,
                    granted_by=changed_by
                )
            
            # Audit
            self.audit_permission_change(
                user=to_user,
                action='BULK_UPDATE',
                old_permissions={},
                new_permissions=self.get_effective_permissions(to_user),
                changed_by=changed_by,
                reason=f"Copied permissions from {from_user.email}"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error copying permissions: {str(e)}")
            return False
    
    @transaction.atomic
    def create_system_templates(self, tenant: Tenant):
        """
        Create default system templates for a tenant
        """
        created = []
        
        for code, template_data in self.SYSTEM_TEMPLATES.items():
            template, created_new = PermissionTemplate.objects.get_or_create(
                code=code,
                tenant=tenant,
                defaults={
                    'name': template_data['name'],
                    'description': template_data['description'],
                    'permissions': template_data['permissions'],
                    'template_type': 'SYSTEM',
                    'is_active': True
                }
            )
            if created_new:
                created.append(template)
                logger.info(f"Created system template: {code} for tenant {tenant.id}")
        
        return created
    
    def suggest_permissions_for_role(self, job_title: str) -> Dict:
        """
        Suggest permissions based on job title using AI or rules
        """
        # Simple rule-based suggestion
        title_lower = job_title.lower()
        
        if 'sales' in title_lower or 'account' in title_lower:
            return self.SYSTEM_TEMPLATES['sales_manager']['permissions']
        elif 'hr' in title_lower or 'human' in title_lower:
            return self.SYSTEM_TEMPLATES['hr_admin']['permissions']
        elif 'inventory' in title_lower or 'warehouse' in title_lower:
            return self.SYSTEM_TEMPLATES['inventory_manager']['permissions']
        elif 'finance' in title_lower or 'accountant' in title_lower:
            return self.SYSTEM_TEMPLATES['accountant']['permissions']
        elif 'customer' in title_lower or 'support' in title_lower:
            return self.SYSTEM_TEMPLATES['customer_service']['permissions']
        else:
            return self.SYSTEM_TEMPLATES['viewer']['permissions']
    
    def detect_suspicious_permissions(self, user: User) -> List[str]:
        """
        Detect potentially suspicious permission patterns
        """
        warnings = []
        permissions = self.get_effective_permissions(user)
        
        # Check for unusual combinations
        has_hr = any('hr-' in p for p in permissions.keys())
        has_payroll = any('payroll-' in p for p in permissions.keys())
        has_banking = any('banking-' in p for p in permissions.keys())
        
        # Non-HR user with payroll access
        if has_payroll and not has_hr:
            warnings.append("User has payroll access without HR permissions")
        
        # Too many write permissions for regular user
        if user.role == 'USER':
            write_count = sum(1 for p in permissions.values() if p.get('canWrite'))
            if write_count > 10:
                warnings.append(f"Regular user has write access to {write_count} areas")
        
        # Banking access without finance
        if has_banking:
            has_finance = any('taxes-' in p or 'purchases-' in p for p in permissions.keys())
            if not has_finance:
                warnings.append("User has banking access without finance permissions")
        
        return warnings