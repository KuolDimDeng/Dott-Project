from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from custom_auth.models import User

class Command(BaseCommand):
    help = 'Update user roles from EMPLOYEE to OWNER'

    def handle(self, *args, **options):
        users = User.objects.filter(role='employee')
        
        self.stdout.write(f"Found {users.count()} users with role 'employee'")
        updated_count = 0
        
        for user in users:
            try:
                self.stdout.write(f"Updating user: {user.email} from {user.role} to OWNER")
                with db_transaction.atomic():
                    user.role = 'owner'
                    user.occupation = 'owner'
                    user.save(update_fields=['role', 'occupation'])
                    updated_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error updating user {user.email}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f"Updated {updated_count} users to OWNER role"))