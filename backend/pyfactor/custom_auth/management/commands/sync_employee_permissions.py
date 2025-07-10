"""
Management command to sync employee roles with user permissions
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from hr.models import Employee
from custom_auth.employee_sync import sync_employee_role_to_user_permissions
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync employee roles and departments with user permissions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            help='Sync permissions for a specific employee by ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Sync permissions for all employees with linked users',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        employee_id = options.get('employee_id')
        sync_all = options.get('all')
        dry_run = options.get('dry_run')
        
        if not employee_id and not sync_all:
            raise CommandError('You must specify either --employee-id or --all')
            
        if employee_id and sync_all:
            raise CommandError('Cannot specify both --employee-id and --all')
            
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
            
        try:
            with transaction.atomic():
                if employee_id:
                    # Sync single employee
                    try:
                        employee = Employee.objects.get(id=employee_id)
                        if not employee.user:
                            self.stdout.write(
                                self.style.ERROR(
                                    f'Employee {employee.employee_number} has no linked user account'
                                )
                            )
                            return
                            
                        self.stdout.write(
                            f'Syncing permissions for {employee.first_name} {employee.last_name} '
                            f'({employee.employee_number})'
                        )
                        
                        if not dry_run:
                            sync_employee_role_to_user_permissions(employee)
                            
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Successfully synced permissions for employee {employee.employee_number}'
                            )
                        )
                        
                    except Employee.DoesNotExist:
                        raise CommandError(f'Employee with ID {employee_id} does not exist')
                        
                else:
                    # Sync all employees with linked users
                    employees_with_users = Employee.objects.filter(user__isnull=False).select_related('user')
                    total = employees_with_users.count()
                    
                    if total == 0:
                        self.stdout.write(self.style.WARNING('No employees with linked users found'))
                        return
                        
                    self.stdout.write(f'Found {total} employees with linked user accounts')
                    
                    synced = 0
                    errors = 0
                    
                    for employee in employees_with_users:
                        try:
                            self.stdout.write(
                                f'Syncing: {employee.first_name} {employee.last_name} '
                                f'({employee.employee_number}) - '
                                f'Dept: {employee.department or "None"}, '
                                f'Title: {employee.job_title or "None"}'
                            )
                            
                            if not dry_run:
                                sync_employee_role_to_user_permissions(employee)
                                
                            synced += 1
                            
                        except Exception as e:
                            errors += 1
                            self.stdout.write(
                                self.style.ERROR(
                                    f'Error syncing employee {employee.employee_number}: {str(e)}'
                                )
                            )
                            
                    # Summary
                    self.stdout.write('')
                    self.stdout.write(self.style.SUCCESS(f'Successfully synced: {synced}'))
                    if errors > 0:
                        self.stdout.write(self.style.ERROR(f'Errors: {errors}'))
                        
                if dry_run:
                    # Rollback transaction in dry run mode
                    transaction.set_rollback(True)
                    self.stdout.write(self.style.WARNING('DRY RUN complete - no changes made'))
                    
        except Exception as e:
            raise CommandError(f'Error during sync: {str(e)}')