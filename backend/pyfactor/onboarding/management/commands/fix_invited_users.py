from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from onboarding.models import OnboardingProgress
from users.models import UserProfile
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Fix onboarding status for users who were invited to existing businesses'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Specific email to fix (optional)',
        )
    
    def handle(self, *args, **options):
        email = options.get('email')
        
        if email:
            users = User.objects.filter(email=email)
            self.stdout.write(f"Fixing onboarding for specific user: {email}")
        else:
            # Find all users who have a business but incomplete onboarding
            users = User.objects.filter(
                business_id__isnull=False
            ).exclude(
                onboardingprogress__onboarding_status='complete'
            )
            self.stdout.write(f"Found {users.count()} users with businesses but incomplete onboarding")
        
        fixed_count = 0
        
        for user in users:
            try:
                # Check if user has a business
                if not user.business_id:
                    self.stdout.write(self.style.WARNING(f"User {user.email} has no business_id, skipping"))
                    continue
                
                # Get or create OnboardingProgress
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'tenant_id': user.business_id,
                        'onboarding_status': 'complete',
                        'setup_completed': True,
                        'payment_completed': True,
                        'current_step': 'complete',
                        'completed_steps': ['business_info', 'subscription', 'payment', 'complete']
                    }
                )
                
                if not created and progress.onboarding_status != 'complete':
                    # Update existing progress
                    progress.onboarding_status = 'complete'
                    progress.setup_completed = True
                    progress.payment_completed = True
                    progress.current_step = 'complete'
                    progress.tenant_id = user.business_id
                    
                    # Ensure completed_steps includes all steps
                    if not progress.completed_steps:
                        progress.completed_steps = []
                    
                    required_steps = ['business_info', 'subscription', 'payment', 'complete']
                    for step in required_steps:
                        if step not in progress.completed_steps:
                            progress.completed_steps.append(step)
                    
                    progress.save()
                    self.stdout.write(self.style.SUCCESS(f"✅ Updated onboarding status for {user.email} (invited user)"))
                    fixed_count += 1
                elif created:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created complete onboarding record for {user.email} (invited user)"))
                    fixed_count += 1
                else:
                    self.stdout.write(f"ℹ️ User {user.email} already has complete onboarding status")
                
                # Also update the user's onboarding_completed field if it exists
                if hasattr(user, 'onboarding_completed') and not user.onboarding_completed:
                    user.onboarding_completed = True
                    user.save(update_fields=['onboarding_completed'])
                    self.stdout.write(f"  - Updated user.onboarding_completed flag")
                
                # Update UserProfile if exists
                try:
                    profile = UserProfile.objects.get(user=user)
                    if not profile.setup_complete:
                        profile.setup_complete = True
                        profile.save(update_fields=['setup_complete'])
                        self.stdout.write(f"  - Updated UserProfile.setup_complete flag")
                except UserProfile.DoesNotExist:
                    # Create UserProfile with setup_complete
                    UserProfile.objects.create(
                        user=user,
                        business_id=user.business_id,
                        setup_complete=True
                    )
                    self.stdout.write(f"  - Created UserProfile with setup_complete=True")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error fixing onboarding for {user.email}: {str(e)}"))
                continue
        
        self.stdout.write(self.style.SUCCESS(f"\n🎉 Fixed onboarding status for {fixed_count} invited users"))