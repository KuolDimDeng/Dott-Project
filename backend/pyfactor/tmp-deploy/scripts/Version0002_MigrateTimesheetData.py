#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Version0002_MigrateTimesheetData.py

This script migrates data from the Payroll Timesheet model to the HR Timesheet model.
It should be run after the migration has been applied to add the timesheet_number field
to the HR Timesheet model.

Author: System Administrator
Date: 2025-04-25
Version: 1.0
"""

import os
import sys
import datetime
from pathlib import Path
from decimal import Decimal

# Add the project root directory to the Python path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum

# Import both timesheet models
from pyfactor.hr.models import Timesheet as HRTimesheet, TimesheetEntry as HRTimesheetEntry, Employee
from pyfactor.payroll.models import Timesheet as PayrollTimesheet, TimesheetEntry as PayrollTimesheetEntry
from pyfactor.payroll.models import PayrollTransaction


def migrate_timesheet_data():
    """
    Migrate data from Payroll Timesheet model to HR Timesheet model.
    This function performs the actual data migration.
    """
    print("Starting migration of timesheet data...")
    
    # Get count of records to migrate
    payroll_timesheet_count = PayrollTimesheet.objects.count()
    payroll_entry_count = PayrollTimesheetEntry.objects.count()
    
    print(f"Found {payroll_timesheet_count} timesheets and {payroll_entry_count} entries to migrate")
    
    # Track statistics
    stats = {
        'timesheets_migrated': 0,
        'entries_migrated': 0,
        'errors': 0
    }
    
    # Keep mapping of old ID to new ID
    timesheet_mapping = {}
    
    # Migrate in a transaction to ensure data integrity
    with transaction.atomic():
        # Process each payroll timesheet
        for payroll_timesheet in PayrollTimesheet.objects.all():
            try:
                # Map status values
                status_mapping = {
                    'draft': 'DRAFT',
                    'submitted': 'SUBMITTED',
                    'approved': 'APPROVED',
                    'rejected': 'REJECTED'
                }
                
                hr_status = status_mapping.get(payroll_timesheet.status.lower(), 'DRAFT')
                
                # Get or create HR timesheet
                hr_timesheet, created = HRTimesheet.objects.get_or_create(
                    employee=payroll_timesheet.employee,
                    period_start=payroll_timesheet.start_date,
                    period_end=payroll_timesheet.end_date,
                    defaults={
                        'timesheet_number': payroll_timesheet.timesheet_number,
                        'status': hr_status,
                        'total_regular_hours': payroll_timesheet.total_hours,
                        'total_overtime_hours': Decimal('0.00'),
                        'business_id': getattr(payroll_timesheet.employee, 'business_id', None),
                        'submitted_at': payroll_timesheet.created_at,
                    }
                )
                
                # If not created, update the fields
                if not created:
                    hr_timesheet.timesheet_number = payroll_timesheet.timesheet_number
                    hr_timesheet.status = hr_status
                    hr_timesheet.total_regular_hours = payroll_timesheet.total_hours
                    hr_timesheet.submitted_at = payroll_timesheet.created_at
                    hr_timesheet.save()
                
                # Store mapping for later use
                timesheet_mapping[str(payroll_timesheet.id)] = str(hr_timesheet.id)
                
                # Migrate entries
                for entry in payroll_timesheet.entries.all():
                    hr_entry, entry_created = HRTimesheetEntry.objects.get_or_create(
                        timesheet=hr_timesheet,
                        date=entry.date,
                        defaults={
                            'regular_hours': entry.hours_worked,
                            'overtime_hours': Decimal('0.00'),
                            'project': entry.project if entry.project else '',
                            'description': entry.description if entry.description else '',
                        }
                    )
                    
                    # If not created, update the fields
                    if not entry_created:
                        hr_entry.regular_hours = entry.hours_worked
                        hr_entry.project = entry.project if entry.project else ''
                        hr_entry.description = entry.description if entry.description else ''
                        hr_entry.save()
                    
                    stats['entries_migrated'] += 1
                
                stats['timesheets_migrated'] += 1
                print(f"Migrated timesheet {payroll_timesheet.timesheet_number} for {payroll_timesheet.employee}")
                
            except Exception as e:
                print(f"Error migrating timesheet {payroll_timesheet.id}: {str(e)}")
                stats['errors'] += 1
    
    print("\nMigration complete!")
    print(f"Timesheets migrated: {stats['timesheets_migrated']}")
    print(f"Entries migrated: {stats['entries_migrated']}")
    print(f"Errors encountered: {stats['errors']}")
    
    return timesheet_mapping


def update_payroll_transactions(timesheet_mapping):
    """
    Update PayrollTransaction records to reference the HR Timesheet model.
    """
    print("\nUpdating payroll transactions...")
    
    updated_count = 0
    error_count = 0
    
    # Search for PayrollTransaction records that might be associated with timesheets
    for transaction in PayrollTransaction.objects.all():
        try:
            # Try to find a matching timesheet based on employee and dates
            matching_timesheets = HRTimesheet.objects.filter(
                employee=transaction.employee,
                period_start__lte=transaction.payroll_run.end_date,
                period_end__gte=transaction.payroll_run.start_date,
                status='APPROVED'
            )
            
            if matching_timesheets.exists():
                # If multiple matches, take the one with the highest total_regular_hours
                if matching_timesheets.count() > 1:
                    matching_timesheet = matching_timesheets.order_by('-total_regular_hours').first()
                else:
                    matching_timesheet = matching_timesheets.first()
                
                transaction.timesheet = matching_timesheet
                transaction.save()
                updated_count += 1
                
                print(f"Updated transaction for {transaction.employee} with timesheet {matching_timesheet.timesheet_number}")
        
        except Exception as e:
            print(f"Error updating transaction {transaction.id}: {str(e)}")
            error_count += 1
    
    print("\nPayroll transaction update complete!")
    print(f"Transactions updated: {updated_count}")
    print(f"Errors encountered: {error_count}")


def main():
    """Main execution function"""
    print("=" * 80)
    print("TIMESHEET DATA MIGRATION SCRIPT")
    print("Version 1.0")
    print("=" * 80)
    
    # Step 1: Migrate timesheet data
    timesheet_mapping = migrate_timesheet_data()
    
    # Step 2: Update payroll transactions
    update_payroll_transactions(timesheet_mapping)
    
    print("\n" + "=" * 80)
    print("IMPORTANT: After verifying the data migration, you can create a")
    print("migration to remove the Timesheet model from the payroll app.")
    print("=" * 80)


if __name__ == "__main__":
    main() 