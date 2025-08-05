from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.utils import timezone
from decimal import Decimal

from hr.models import Timesheet, TimesheetEntry, Employee
from payroll.models import PayrollTransaction


class Command(BaseCommand):
    help = 'Updates PayrollTransaction records to reference HR Timesheet models'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting timesheet data migration process'))
        self.stdout.write(self.style.WARNING('Note: The payroll Timesheet and TimesheetEntry models have been removed.'))
        self.stdout.write(self.style.WARNING('This command will only update PayrollTransaction references.'))
        self.update_payroll_transactions()
        self.stdout.write(self.style.SUCCESS('Completed PayrollTransaction update process'))

    def update_payroll_transactions(self):
        """
        Update PayrollTransaction records to reference the HR Timesheet model.
        """
        self.stdout.write("\nUpdating payroll transactions...")
        
        updated_count = 0
        error_count = 0
        
        # Search for PayrollTransaction records that might be associated with timesheets
        for transaction in PayrollTransaction.objects.all():
            try:
                # Skip transactions that already have a timesheet
                if db_transaction.timesheet is not None:
                    self.stdout.write(f"Transaction {db_transaction.pk} already has a timesheet reference, skipping")
                    continue
                
                # Try to find a matching timesheet based on employee and dates
                matching_timesheets = Timesheet.objects.filter(
                    employee=db_transaction.employee,
                    period_start__lte=db_transaction.payroll_run.end_date,
                    period_end__gte=db_transaction.payroll_run.start_date,
                    status='APPROVED'
                )
                
                if matching_timesheets.exists():
                    # If multiple matches, take the one with the highest total_regular_hours
                    if matching_timesheets.count() > 1:
                        matching_timesheet = matching_timesheets.order_by('-total_regular_hours').first()
                    else:
                        matching_timesheet = matching_timesheets.first()
                    
                    db_transaction.timesheet = matching_timesheet
                    db_transaction.save()
                    updated_count += 1
                    
                    timesheet_number = matching_timesheet.timesheet_number if matching_timesheet else 'unknown'
                    self.stdout.write(f"Updated transaction for {db_transaction.employee} with timesheet {timesheet_number}")
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error updating transaction {db_transaction.pk}: {str(e)}"))
                error_count += 1
        
        self.stdout.write("\nPayroll transaction update complete!")
        self.stdout.write(f"Transactions updated: {updated_count}")
        self.stdout.write(f"Errors encountered: {error_count}") 