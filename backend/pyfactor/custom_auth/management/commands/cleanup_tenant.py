from django.core.management.base import BaseCommand
from django.db import connection
from custom_auth.models import User, Tenant
from onboarding.utils import cleanup_schema

class Command(BaseCommand):
    help = 'Cleans up tenant data and schema for a user'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            # Get user and tenant
            user = User.objects.get(email=email)
            tenant = Tenant.objects.filter(owner=user).first()
            
            if not tenant:
                self.stdout.write(self.style.WARNING(f'No tenant found for user {email}'))
                return
                
            self.stdout.write(f'Found tenant { tenant.id} for user {email}')
            
            # Clean up schema
            try:
                cleanup_schema( tenant.id)
                self.stdout.write(self.style.SUCCESS(f'Cleaned up schema { tenant.id}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error cleaning up schema: {str(e)}'))
            
            # Delete tenant
            tenant.delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted tenant { tenant.id}'))
            
            # Reset user onboarding status
            user.is_onboarded = False
            user.tenant = None
            user.save()
            
            self.stdout.write(self.style.SUCCESS(f'Successfully reset user {email}'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User {email} not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))