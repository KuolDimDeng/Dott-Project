from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from custom_auth.models import User
from hr.models import Employee
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Creates employee records for all business owners who dont have one'

    def handle(self, *args, **options):
        self.stdout.write('Creating employee records for business owners...')
        
        # Find all owners without employee records
        owners_without_employees = User.objects.filter(
            role='OWNER',
            business_id__isnull=False
        ).exclude(
            id__in=Employee.objects.values_list('user_id', flat=True)
        )
        
        created_count = 0
        error_count = 0
        
        for owner in owners_without_employees:
            try:
                with db_transaction.atomic():
                    employee = Employee.objects.create(
                        user=owner,
                        business_id=owner.business_id,
                        first_name=owner.first_name or 'Business',
                        last_name=owner.last_name or 'Owner',
                        email=owner.email,
                        phone_number=owner.phone_number or '',
                        job_title='Owner',
                        department='Management',
                        employee_type='FULL_TIME',
                        status='ACTIVE',
                        hire_date=owner.date_joined.date() if hasattr(owner.date_joined, 'date') else owner.date_joined,
                        hourly_rate=0,  # Owners can adjust this later
                        salary=0,  # Owners can adjust this later
                        is_active=True,
                        can_approve_timesheets=True,
                        exempt_status=True,
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Created employee record for owner: {owner.email}')
                    )
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'Error creating employee for {owner.email}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: Created {created_count} employee records, {error_count} errors'
            )
        )
        
        # Show current stats
        total_owners = User.objects.filter(role='OWNER').count()
        owners_with_employees = Employee.objects.filter(user__role='OWNER').count()
        
        self.stdout.write(
            f'\nTotal owners: {total_owners}'
            f'\nOwners with employee records: {owners_with_employees}'
            f'\nOwners without employee records: {total_owners - owners_with_employees}'
        )