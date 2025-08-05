"""
Employee-User synchronization utilities
Handles automatic creation of employee records when users are created/updated
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction as db_transaction
import logging

from .models import User
from hr.models import Employee
from .models import PagePermission, UserPageAccess

logger = logging.getLogger(__name__)


def should_create_employee_for_user(user):
    """
    Determine if an employee record should be created for a user
    Based on role or other business logic
    """
    # Create employee records for all non-OWNER users
    # OWNERs typically don't need employee records as they're business owners
    return user.role in ['ADMIN', 'USER'] and user.is_active


# DISABLED: Automatic employee creation is now optional via invitation form
# @receiver(post_save, sender=User)
# def create_employee_for_user(sender, instance, created, **kwargs):
#     """
#     Signal handler to create an employee record when a new user is created
#     NOTE: This is disabled. Employee creation is now handled explicitly
#     via the invitation form or manual creation.
#     """
#     pass


def create_employee_for_user_explicit(user, **kwargs):
    """
    Explicitly create an employee record for a user
    This should be called when the invitation form has "create_employee" checked
    """
    # Check if employee already exists
    if hasattr(user, 'employee_profile') and user.employee_profile:
        logger.info(f"Employee record already exists for user {user.email}")
        return user.employee_profile
        
    try:
        with db_transaction.atomic():
            # Create employee record
            employee = Employee.objects.create(
                user=user,
                email=user.email,
                first_name=kwargs.get('first_name', user.given_name or user.name or ''),
                last_name=kwargs.get('last_name', user.family_name or ''),
                business_id=user.business_id,
                active=True,
                role='employee',  # Default employee role
                employment_type=kwargs.get('employment_type', 'FT'),  # Default to full-time
                department=kwargs.get('department', ''),
                job_title=kwargs.get('job_title', ''),
                country=kwargs.get('country', 'US'),  # Default country
                compensation_type=kwargs.get('compensation_type', 'salary'),
                onboarded=False,  # They'll need to complete onboarding
                security_number_type='SSN',  # Default - should be updated based on country
                # Set required boolean fields to defaults
                is_active=True,
                is_staff=False,
                is_superuser=False,
                probation=False,
                health_insurance_enrollment=False,
                pension_enrollment=False,
                direct_deposit=False,
                vacation_time=False,
                vacation_days_per_year=0,
                ssn_stored_in_stripe=False,
                bank_account_stored_in_stripe=False,
                tax_id_stored_in_stripe=False,
                ID_verified=False,
                areManager=False,
                # Set required numeric fields
                salary=0,
                wage_per_hour=0,
                hours_per_day=8,
                overtime_rate=0,
                days_per_week=5,
                # Required for AbstractUser
                username=user.email,  # Use email as username
                password='!',  # Set unusable password - they login via User account
            )
            
            # Set unusable password since they login via User account
            employee.set_unusable_password()
            employee.save()
            
            # Sync permissions if department or job_title provided
            if kwargs.get('department') or kwargs.get('job_title'):
                sync_employee_role_to_user_permissions(employee, user)
            
            logger.info(f"Created employee record {employee.employee_number} for user {user.email}")
            return employee
            
    except Exception as e:
        logger.error(f"Failed to create employee for user {user.email}: {str(e)}")
        raise


def sync_employee_role_to_user_permissions(employee, user=None):
    """
    Sync employee role/department to user permissions
    This can be called when an employee's role or department changes
    """
    if not user:
        user = employee.user
        
    if not user:
        logger.warning(f"No user linked to employee {employee.employee_number}")
        return
        
    try:
        # Department to page permissions mapping
        department_page_map = {
            'Human Resources': {
                'pages': ['hr_employees', 'hr_attendance', 'hr_payroll', 'hr_benefits'],
                'permissions': {'can_read': True, 'can_write': True, 'can_edit': True, 'can_delete': True}
            },
            'Accounting': {
                'pages': ['billing_invoices', 'billing_payments', 'reports_financial', 'payments_transactions'],
                'permissions': {'can_read': True, 'can_write': True, 'can_edit': True, 'can_delete': False}
            },
            'Sales': {
                'pages': ['sales_orders', 'sales_customers', 'sales_quotes', 'crm_contacts', 'crm_leads'],
                'permissions': {'can_read': True, 'can_write': True, 'can_edit': True, 'can_delete': False}
            },
            'Marketing': {
                'pages': ['sales_promotions', 'crm_contacts', 'reports_sales'],
                'permissions': {'can_read': True, 'can_write': True, 'can_edit': True, 'can_delete': False}
            },
            'Operations': {
                'pages': ['inventory_products', 'inventory_stock', 'reports_inventory'],
                'permissions': {'can_read': True, 'can_write': True, 'can_edit': True, 'can_delete': False}
            },
            'IT': {
                'pages': ['settings_business', 'settings_users', 'settings_integrations'],
                'permissions': {'can_read': True, 'can_write': True, 'can_edit': True, 'can_delete': True}
            }
        }
        
        # Job title to additional permissions mapping
        job_title_permission_map = {
            'manager': {
                'additional_pages': ['reports_sales', 'reports_financial', 'hr_attendance'],
                'elevated_permissions': {'can_delete': True}
            },
            'supervisor': {
                'additional_pages': ['hr_attendance', 'reports_sales'],
                'elevated_permissions': {'can_edit': True}
            },
            'director': {
                'additional_pages': ['reports_sales', 'reports_financial', 'reports_inventory'],
                'elevated_permissions': {'can_delete': True}
            },
            'ceo': {
                'all_access': True  # Full access to everything
            },
            'cto': {
                'all_access': True  # Full access to everything
            },
            'cfo': {
                'all_access': True  # Full access to everything
            }
        }
        
        with db_transaction.atomic():
            # Clear existing permissions for the user
            UserPageAccess.objects.filter(user=user, tenant=user.tenant).delete()
            
            # Special case for C-level executives
            if employee.job_title:
                job_lower = employee.job_title.lower()
                for exec_role in ['ceo', 'cto', 'cfo', 'founder', 'owner', 'president']:
                    if exec_role in job_lower:
                        # Grant full access to all pages
                        all_pages = PagePermission.objects.all()
                        for page in all_pages:
                            UserPageAccess.objects.create(
                                user=user,
                                page=page,
                                can_read=True,
                                can_write=True,
                                can_edit=True,
                                can_delete=True,
                                tenant=user.tenant,
                                granted_by=user  # Self-granted for executives
                            )
                        logger.info(f"Granted full access to {user.email} as {employee.job_title}")
                        return
            
            # Regular department-based permissions
            pages_to_grant = set()
            base_permissions = {'can_read': True, 'can_write': False, 'can_edit': False, 'can_delete': False}
            
            # Get department permissions
            if employee.department:
                for dept_name, dept_config in department_page_map.items():
                    if dept_name.lower() in employee.department.lower():
                        pages_to_grant.update(dept_config['pages'])
                        # Update base permissions with department permissions
                        base_permissions.update(dept_config['permissions'])
                        break
            
            # Add job title specific permissions
            if employee.job_title:
                job_lower = employee.job_title.lower()
                for role, role_config in job_title_permission_map.items():
                    if role in job_lower and 'additional_pages' in role_config:
                        pages_to_grant.update(role_config['additional_pages'])
                        if 'elevated_permissions' in role_config:
                            base_permissions.update(role_config['elevated_permissions'])
            
            # Grant permissions for identified pages
            for page_id in pages_to_grant:
                try:
                    page = PagePermission.objects.get(page_id=page_id)
                    UserPageAccess.objects.create(
                        user=user,
                        page=page,
                        **base_permissions,
                        tenant=user.tenant,
                        granted_by=user  # Self-granted based on role
                    )
                except PagePermission.DoesNotExist:
                    logger.warning(f"Page permission {page_id} does not exist")
            
            logger.info(f"Updated permissions for user {user.email} based on employee role. Granted access to {len(pages_to_grant)} pages")
        
    except Exception as e:
        logger.error(f"Failed to sync permissions for employee {employee.employee_number}: {str(e)}")


@receiver(post_save, sender=Employee)
def sync_permissions_on_employee_update(sender, instance, created, **kwargs):
    """
    Signal handler to sync permissions when an employee is created or updated
    """
    # Skip if employee has no linked user
    if not instance.user:
        return
        
    # Only sync on relevant field changes
    if not created:
        # Check if relevant fields changed
        update_fields = kwargs.get('update_fields', set())
        if update_fields and not {'department', 'job_title', 'role'}.intersection(update_fields):
            return
    
    # Sync permissions
    sync_employee_role_to_user_permissions(instance)