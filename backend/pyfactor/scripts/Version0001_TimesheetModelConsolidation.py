#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Version0001_TimesheetModelConsolidation.py

This script consolidates the duplicate Timesheet models in the HR and Payroll modules.
The goal is to use only the HR Timesheet model as the single source of truth, and 
update the Payroll module to reference this model instead of maintaining its own.

Author: System Administrator
Date: 2025-04-25
Version: 1.0
"""

import os
import sys
import datetime
import shutil
from pathlib import Path
from decimal import Decimal

# Add the project root directory to the Python path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import models, migrations, transaction
from django.utils import timezone
from hr.models import Timesheet as HRTimesheet, TimesheetEntry as HRTimesheetEntry, Employee
from payroll.models import Timesheet as PayrollTimesheet, TimesheetEntry as PayrollTimesheetEntry
from payroll.models import PayrollRun, PayrollTransaction

# Backup both models first
def create_backup(module_name, timestamp=None):
    """Create backup of a module's models.py file"""
    if timestamp is None:
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    
    source_file = os.path.join(project_root, 'pyfactor', module_name, 'models.py')
    backup_file = os.path.join(project_root, 'pyfactor', module_name, f'models.py.backup-{timestamp}')
    
    try:
        shutil.copy2(source_file, backup_file)
        print(f"✓ Created backup of {module_name}/models.py at {backup_file}")
        return True
    except Exception as e:
        print(f"✗ Failed to create backup of {module_name}/models.py: {str(e)}")
        return False

def has_timesheet_number_field():
    """Check if HR Timesheet model already has timesheet_number field"""
    return hasattr(HRTimesheet, 'timesheet_number')

def add_timesheet_number_field():
    """
    Update the HR Timesheet model to include a timesheet_number field.
    This is a migration-like function that adds the field directly to the model.
    """
    if has_timesheet_number_field():
        print("✓ HR Timesheet model already has timesheet_number field, skipping")
        return

    # Update the model schema
    # Note: In a real Django app, you would create a migration for this
    # This is a simplified approach for the purpose of this script
    print("Adding timesheet_number field to HR Timesheet model...")
    
    # For a real implementation, you would create a migration file
    # This is just to illustrate what would be in that migration
    migration_steps = [
        """
        Add to hr/models.py Timesheet model:
        
        timesheet_number = models.CharField(max_length=20, unique=True, editable=False, null=True)
        
        Add to Timesheet.save method:
        
        if not self.timesheet_number:
            self.timesheet_number = self.generate_timesheet_number()
        
        Add method to Timesheet:
        
        @staticmethod
        def generate_timesheet_number():
            last_timesheet = Timesheet.objects.order_by('-created_at').first()
            if last_timesheet and last_timesheet.timesheet_number:
                last_number = int(last_timesheet.timesheet_number[3:])
                new_number = last_number + 1
            else:
                new_number = 1
            return f"TMS{new_number:06d}"
        """
    ]
    
    print("Migration steps to perform manually:")
    for step in migration_steps:
        print(step)
    
    print("Please run this migration before proceeding!")

def migrate_timesheet_data():
    """
    Migrate data from Payroll Timesheet model to HR Timesheet model.
    This function is for demonstration only and should be implemented
    as a proper Django migration.
    """
    print("Migration plan for moving data from payroll.Timesheet to hr.Timesheet:")
    
    migration_steps = [
        """
        1. For each PayrollTimesheet:
           a. Get or create an equivalent HRTimesheet with same employee and dates
           b. Copy the timesheet_number to the HR timesheet
           c. Set status to 'APPROVED' if PayrollTimesheet status was 'approved'
           d. Set total_regular_hours to the total_hours from PayrollTimesheet
           e. Save the HR timesheet
           
        2. For each PayrollTimesheetEntry:
           a. Create equivalent HRTimesheetEntry with same date
           b. Copy hours_worked to regular_hours
           c. Copy project and description fields
           d. Link to the corresponding HR timesheet
           e. Save the entry
           
        3. Update all PayrollRun and PayrollTransaction references:
           a. Add a timesheet_link ForeignKey field to PayrollTransaction
           b. For each PayrollTransaction, set timesheet_link to the corresponding HR Timesheet
           
        4. After ensuring data integrity, remove PayrollTimesheet and PayrollTimesheetEntry models
        """
    ]
    
    for step in migration_steps:
        print(step)
    
    print("This migration should be done with a proper Django migration to ensure data integrity.")

def analyze_codebase_for_references():
    """
    Analyze the codebase to find all references to the Payroll Timesheet model
    that need to be updated to reference the HR Timesheet model instead.
    """
    print("\nCodebase analysis for Timesheet references:")
    
    references_to_check = [
        "backend/pyfactor/payroll/views.py",
        "backend/pyfactor/payroll/serializers.py",
        "backend/pyfactor/payroll/urls.py",
        "backend/pyfactor/payroll/admin.py",
        "backend/pyfactor/payroll/api.py",
        "frontend/pyfactor_next/src/app/dashboard/components/forms/timesheet",
        "frontend/pyfactor_next/src/app/dashboard/components/forms/TimesheetManagement.js"
    ]
    
    for ref in references_to_check:
        path = os.path.join(project_root, ref)
        if os.path.exists(path):
            print(f"✓ Need to check for references in: {ref}")
        else:
            print(f"? Path doesn't exist, skipping: {ref}")
    
    print("\nFrontend components to update:")
    print("- Update API call paths in TimesheetManagement.js to use HR API endpoints instead of Payroll endpoints")
    print("- Update any model structure assumptions in the frontend components")

def update_payroll_model():
    """
    Update the PayrollRun model to reference the HR Timesheet model.
    This function provides the code changes needed for the PayrollRun model.
    """
    print("\nPayrollRun model update:")
    
    code_changes = """
    # In payroll/models.py:
    
    # Add import at top
    from hr.models import Timesheet
    
    # Modify PayrollTransaction to link to Timesheet
    class PayrollTransaction(models.Model):
        employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
        payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE)
        timesheet = models.ForeignKey(Timesheet, on_delete=models.SET_NULL, null=True, related_name='payroll_transactions')
        gross_pay = models.DecimalField(max_digits=10, decimal_places=2)
        # ... other fields remain the same
    
    # Remove the Timesheet and TimesheetEntry models from payroll/models.py entirely
    """
    
    print(code_changes)

def update_payroll_views():
    """
    Update the Payroll views to use the HR Timesheet model.
    This function provides the code changes needed for the Payroll views.
    """
    print("\nPayroll views update:")
    
    code_changes = """
    # In payroll/views.py:
    
    # Update import
    from hr.models import Timesheet, TimesheetEntry
    
    # Update all filtering of Timesheet to use the right fields
    # Example:
    
    timesheets = Timesheet.objects.filter(
        employee__business_id=request.user.business_id,
        period_start__gte=start_date,
        period_end__lte=end_date,
        status='APPROVED'  # Only use approved timesheets for payroll
    )
    
    # Update calculations to use total_regular_hours and total_overtime_hours from the HR Timesheet
    # And use wage_per_hour and overtime_rate from the Employee model
    
    for timesheet in timesheets:
        regular_pay = timesheet.total_regular_hours * timesheet.employee.wage_per_hour
        overtime_pay = timesheet.total_overtime_hours * timesheet.employee.wage_per_hour * timesheet.employee.overtime_rate
        gross_pay = regular_pay + overtime_pay
        
        # Create payroll transaction with link to timesheet
        PayrollTransaction.objects.create(
            employee=timesheet.employee,
            payroll_run=payroll_run,
            timesheet=timesheet,  # Link to the HR timesheet
            gross_pay=gross_pay,
            # ... other fields remain the same
        )
    """
    
    print(code_changes)

def update_serializers():
    """
    Update the Payroll serializers to reference the HR Timesheet model.
    This function provides the code changes needed for the serializers.
    """
    print("\nSerializer updates:")
    
    code_changes = """
    # In payroll/serializers.py:
    
    # Update import
    from hr.models import Timesheet, TimesheetEntry
    
    # Remove the duplicate TimesheetSerializer and TimesheetEntrySerializer classes
    # If you need custom fields for payroll, create a specialized serializer:
    
    class PayrollTimesheetSerializer(serializers.ModelSerializer):
        entries = serializers.SerializerMethodField()
        employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
        
        class Meta:
            model = Timesheet
            fields = ['id', 'timesheet_number', 'employee', 'employee_name', 
                      'period_start', 'period_end', 'total_regular_hours', 
                      'total_overtime_hours', 'status', 'entries']
        
        def get_entries(self, obj):
            from hr.serializers import TimesheetEntrySerializer
            entries = obj.entries.all()
            return TimesheetEntrySerializer(entries, many=True).data
    """
    
    print(code_changes)

def main():
    """Main execution function"""
    print("=" * 80)
    print("TIMESHEET MODEL CONSOLIDATION SCRIPT")
    print("Version 1.0")
    print("=" * 80)
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Step 1: Create backups
    if not create_backup('hr', timestamp) or not create_backup('payroll', timestamp):
        print("Backup creation failed, aborting.")
        return
    
    # Step 2: Check and suggest adding timesheet_number field to HR Timesheet
    add_timesheet_number_field()
    
    # Step 3: Plan data migration
    migrate_timesheet_data()
    
    # Step 4: Analyze codebase for references that need updating
    analyze_codebase_for_references()
    
    # Step 5: Provide model code updates
    update_payroll_model()
    
    # Step 6: Provide view code updates
    update_payroll_views()
    
    # Step 7: Provide serializer updates
    update_serializers()
    
    print("\n" + "=" * 80)
    print("IMPORTANT: This script only provides a plan for the changes needed.")
    print("You'll need to implement these changes manually with proper Django migrations.")
    print("Always test your changes in a development environment before applying to production.")
    print("=" * 80)

if __name__ == "__main__":
    main() 