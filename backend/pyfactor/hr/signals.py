from django.db.models.signals import pre_save
from django.dispatch import receiver


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