"""
Management command to fix business_id/tenant_id mismatches
This ensures business_id = tenant_id for all users
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from users.models import UserProfile, Business
from hr.models import Employee
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Fix business_id/tenant_id mismatches - ensure they are the same'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔧 Fixing business_id/tenant_id mismatches...'))
        
        # Find all users with mismatched IDs
        mismatched_users = []
        all_users = User.objects.all()
        
        for user in all_users:
            user_tenant_id = None
            user_business_id = None
            
            # Get tenant_id
            if hasattr(user, 'tenant') and user.tenant:
                user_tenant_id = str(user.tenant.id)
            elif hasattr(user, 'tenant_id') and user.tenant_id:
                user_tenant_id = str(user.tenant_id)
                
            # Get business_id
            if hasattr(user, 'business_id') and user.business_id:
                user_business_id = str(user.business_id)
                
            # Check if they match
            if user_tenant_id and user_business_id and user_tenant_id != user_business_id:
                mismatched_users.append({
                    'user': user,
                    'tenant_id': user_tenant_id,
                    'business_id': user_business_id
                })
                
        if not mismatched_users:
            self.stdout.write(self.style.SUCCESS('✅ No mismatched IDs found!'))
            return
            
        self.stdout.write(self.style.WARNING(f'⚠️ Found {len(mismatched_users)} users with mismatched IDs'))
        
        # Fix each user
        for mismatch in mismatched_users:
            user = mismatch['user']
            tenant_id = mismatch['tenant_id']
            business_id = mismatch['business_id']
            
            self.stdout.write(f'\n📋 User: {user.email}')
            self.stdout.write(f'  Current tenant_id: {tenant_id}')
            self.stdout.write(f'  Current business_id: {business_id}')
            
            # Strategy: Use tenant_id as the authoritative ID
            # Update business_id to match tenant_id
            try:
                # Update user's business_id
                user.business_id = tenant_id
                user.save(update_fields=['business_id'])
                self.stdout.write(f'  ✅ Updated user.business_id to {tenant_id}')
                
                # Update UserProfile business if it exists
                try:
                    profile = UserProfile.objects.get(user=user)
                    if profile.business:
                        old_business = profile.business
                        # Check if a business with the tenant_id already exists
                        new_business, created = Business.objects.get_or_create(
                            id=tenant_id,
                            defaults={
                                'name': old_business.name,
                                'business_number': old_business.business_number,
                                'industry': old_business.industry,
                                'no_of_employees': old_business.no_of_employees,
                                'street': old_business.street,
                                'city': old_business.city,
                                'state': old_business.state,
                                'country': old_business.country,
                                'timezone': old_business.timezone,
                                'currency': old_business.currency,
                            }
                        )
                        if created:
                            self.stdout.write(f'  ✅ Created new business with ID {tenant_id}')
                        else:
                            self.stdout.write(f'  ℹ️ Business with ID {tenant_id} already exists')
                            
                        # Update profile to point to the correct business
                        profile.business = new_business
                        profile.save(update_fields=['business'])
                        self.stdout.write(f'  ✅ Updated UserProfile business reference')
                        
                        # Delete old business if no other profiles reference it
                        if not UserProfile.objects.filter(business=old_business).exists():
                            old_business.delete()
                            self.stdout.write(f'  🗑️ Deleted old business {business_id}')
                            
                except UserProfile.DoesNotExist:
                    self.stdout.write(f'  ℹ️ No UserProfile found')
                    
                # Update all employees for this business
                Employee.objects.filter(business_id=business_id).update(
                    business_id=tenant_id,
                    tenant_id=tenant_id
                )
                employee_count = Employee.objects.filter(business_id=tenant_id).count()
                self.stdout.write(f'  ✅ Updated {employee_count} employees')
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ❌ Error: {str(e)}'))
                
        self.stdout.write(self.style.SUCCESS('\n✅ Completed fixing business_id/tenant_id mismatches'))