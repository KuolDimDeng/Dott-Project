from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@receiver(post_save)
def create_employee_for_owner(sender, instance, created, **kwargs):
    """Automatically create employee record for business owners"""
    from custom_auth.models import User
    from .models import Employee
    
    if sender != User:
        return
    
    # Only proceed if user was just created or role changed to OWNER
    if not created and not kwargs.get('update_fields'):
        return
    
    # Check if user is an owner and doesn't have an employee record
    if instance.role == 'OWNER' and instance.business_id:
        try:
            # Check if employee record already exists
            employee = Employee.objects.filter(user=instance).first()
            if not employee:
                with transaction.atomic():
                    # Create employee record for owner
                    employee = Employee.objects.create(
                        user=instance,
                        business_id=instance.business_id,
                        first_name=instance.first_name or 'Business',
                        last_name=instance.last_name or 'Owner',
                        email=instance.email,
                        phone_number=instance.phone_number or '',
                        job_title='Owner',
                        department='Management',
                        employee_type='FULL_TIME',
                        status='ACTIVE',
                        hire_date=instance.date_joined.date() if hasattr(instance.date_joined, 'date') else instance.date_joined,
                        # Set hourly_rate to 0 as suggested - owners can adjust later
                        hourly_rate=0,
                        salary=0,
                        is_active=True,
                        can_approve_timesheets=True,  # Owners should be able to approve
                        exempt_status=True,  # Owners are typically exempt
                    )
                    logger.info(f"Created employee record for owner: {instance.email}")
        except Exception as e:
            logger.error(f"Error creating employee record for owner {instance.email}: {str(e)}")


@receiver(pre_save)
def set_timesheet_business_id(sender, instance, **kwargs):
    """Automatically populate business_id from related employee for RLS tenant isolation"""
    from .models import Timesheet
    
    if sender != Timesheet:
        return
        
    if not instance.business_id and instance.employee_id:
        # Use the employee's business_id for tenant isolation
        from .models import Employee
        try:
            employee = Employee.objects.get(id=instance.employee_id)
            instance.business_id = employee.business_id
        except Employee.DoesNotExist:
            pass


@receiver(pre_save)
def set_time_off_request_business_id(sender, instance, **kwargs):
    """Automatically populate business_id from related employee for RLS tenant isolation"""
    from .models import TimeOffRequest
    
    if sender != TimeOffRequest:
        return
        
    if not instance.business_id and instance.employee_id:
        # Use the employee's business_id for tenant isolation
        from .models import Employee
        try:
            employee = Employee.objects.get(id=instance.employee_id)
            instance.business_id = employee.business_id
        except Employee.DoesNotExist:
            pass


@receiver(pre_save)
def set_time_off_balance_business_id(sender, instance, **kwargs):
    """Automatically populate business_id from related employee for RLS tenant isolation"""
    from .models import TimeOffBalance
    
    if sender != TimeOffBalance:
        return
        
    if not instance.business_id and instance.employee_id:
        # Use the employee's business_id for tenant isolation
        from .models import Employee
        try:
            employee = Employee.objects.get(id=instance.employee_id)
            instance.business_id = employee.business_id
        except Employee.DoesNotExist:
            pass 