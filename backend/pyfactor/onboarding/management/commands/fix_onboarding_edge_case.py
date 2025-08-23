from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import UserProfile, Business, BusinessDetails
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix onboarding edge case where users have tenant but incomplete onboarding'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email of specific user to fix'
        )
        parser.add_argument(
            '--check-all',
            action='store_true',
            help='Check all users for edge case'
        )
        parser.add_argument(
            '--fix-all',
            action='store_true',
            help='Fix all users with edge case'
        )

    def handle(self, *args, **options):
        if options['email']:
            self.fix_user(options['email'])
        elif options['check_all']:
            self.check_all_users()
        elif options['fix_all']:
            self.fix_all_users()
        else:
            self.stdout.write(self.style.ERROR('Please specify --email, --check-all, or --fix-all'))

    def fix_user(self, email):
        self.stdout.write(f"\n🔍 Checking user: {email}")
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f"✅ User found: {user.email} (ID: {user.id})"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ User not found: {email}"))
            return False
        
        # Check UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
            self.stdout.write("✅ UserProfile found:")
            self.stdout.write(f"   - Business ID: {profile.business_id}")
            self.stdout.write(f"   - Tenant ID: {profile.tenant_id}")
            self.stdout.write(f"   - Onboarding Completed: {profile.onboarding_completed}")
        except UserProfile.DoesNotExist:
            profile = None
            self.stdout.write("❌ No UserProfile found")
        
        # Check Tenant
        tenant = None
        if profile and profile.tenant_id:
            try:
                tenant = Tenant.objects.get(id=profile.tenant_id)
                self.stdout.write(f"✅ Tenant found: {tenant.name}")
            except Tenant.DoesNotExist:
                self.stdout.write(f"⚠️ Tenant ID exists but Tenant not found: {profile.tenant_id}")
        
        # Check Business
        business = None
        if profile and profile.business_id:
            try:
                business = Business.objects.get(id=profile.business_id)
                self.stdout.write(f"✅ Business found: {business.name}")
            except Business.DoesNotExist:
                self.stdout.write(f"⚠️ Business ID exists but Business not found: {profile.business_id}")
        
        # Check OnboardingProgress
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
            self.stdout.write("✅ OnboardingProgress found:")
            self.stdout.write(f"   - Status: {onboarding.onboarding_status}")
            self.stdout.write(f"   - Setup Completed: {onboarding.setup_completed}")
        except OnboardingProgress.DoesNotExist:
            onboarding = None
            self.stdout.write("⚠️ No OnboardingProgress record found")
        
        # Detect edge case
        has_edge_case = False
        if profile and (profile.tenant_id or profile.business_id):
            if not profile.onboarding_completed:
                has_edge_case = True
                self.stdout.write(self.style.WARNING("\n⚠️ EDGE CASE: User has tenant/business but onboarding not completed"))
            elif onboarding and onboarding.onboarding_status != 'complete':
                has_edge_case = True
                self.stdout.write(self.style.WARNING(f"\n⚠️ EDGE CASE: Profile says complete but OnboardingProgress says {onboarding.onboarding_status}"))
        
        if not has_edge_case:
            self.stdout.write(self.style.SUCCESS("\n✅ No edge case detected"))
            return True
        
        # Fix the edge case
        self.stdout.write("\n🔧 Fixing edge case...")
        
        # Ensure tenant exists
        if not tenant:
            if profile and profile.tenant_id:
                tenant = Tenant.objects.create(
                    id=profile.tenant_id,
                    name=f"{user.email.split('@')[0]}'s Organization",
                    owner=user,
                    is_active=True
                )
                self.stdout.write(f"✅ Created missing tenant: {tenant.name}")
            else:
                tenant = Tenant.objects.create(
                    name=f"{user.email.split('@')[0]}'s Organization",
                    owner=user,
                    is_active=True
                )
                if profile:
                    profile.tenant_id = tenant.id
                    profile.save()
                self.stdout.write(f"✅ Created new tenant: {tenant.name}")
        
        # Ensure business exists
        if not business and tenant:
            if profile and profile.business_id:
                business = Business.objects.create(
                    id=profile.business_id,
                    name=f"{user.email.split('@')[0]}'s Business",
                    owner=user,
                    tenant=tenant,
                    is_active=True
                )
                self.stdout.write(f"✅ Created missing business: {business.name}")
            else:
                business = Business.objects.create(
                    name=f"{user.email.split('@')[0]}'s Business",
                    owner=user,
                    tenant=tenant,
                    is_active=True
                )
                if profile:
                    profile.business_id = business.id
                    profile.save()
                self.stdout.write(f"✅ Created new business: {business.name}")
        
        # Update UserProfile
        if profile:
            profile.onboarding_completed = True
            if tenant:
                profile.tenant_id = tenant.id
            if business:
                profile.business_id = business.id
            if not profile.user_subscription:
                profile.user_subscription = 'professional'
            profile.save()
            self.stdout.write("✅ Updated UserProfile - onboarding_completed = True")
        else:
            profile = UserProfile.objects.create(
                user=user,
                onboarding_completed=True,
                tenant_id=tenant.id if tenant else None,
                business_id=business.id if business else None,
                user_subscription='professional'
            )
            self.stdout.write("✅ Created UserProfile with onboarding_completed = True")
        
        # Update OnboardingProgress
        if onboarding:
            onboarding.onboarding_status = 'complete'
            onboarding.setup_completed = True
            onboarding.current_step = 'completed'
            onboarding.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
            if not onboarding.selected_plan:
                onboarding.selected_plan = 'professional'
            onboarding.completed_at = timezone.now()
            onboarding.save()
            self.stdout.write("✅ Updated OnboardingProgress - status = complete")
        else:
            onboarding = OnboardingProgress.objects.create(
                user=user,
                onboarding_status='complete',
                setup_completed=True,
                current_step='completed',
                completed_steps=['business_info', 'subscription', 'payment', 'setup'],
                selected_plan='professional',
                payment_completed=True,
                completed_at=timezone.now()
            )
            self.stdout.write("✅ Created OnboardingProgress with status = complete")
        
        # Ensure BusinessDetails exists
        if business:
            try:
                BusinessDetails.objects.get(business=business)
                self.stdout.write("✅ BusinessDetails already exists")
            except BusinessDetails.DoesNotExist:
                BusinessDetails.objects.create(
                    business=business,
                    preferred_currency_code='USD',
                    preferred_currency_name='US Dollar',
                    preferred_currency_symbol='$'
                )
                self.stdout.write("✅ Created BusinessDetails with default currency")
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ Edge case fixed for {email}"))
        return True

    def check_all_users(self):
        self.stdout.write("\n🔍 Searching for users with onboarding edge case...")
        
        # Find users with tenant/business but incomplete onboarding
        profiles_with_issue = UserProfile.objects.filter(
            tenant_id__isnull=False,
            onboarding_completed=False
        ) | UserProfile.objects.filter(
            business_id__isnull=False,
            onboarding_completed=False
        )
        
        if profiles_with_issue.exists():
            self.stdout.write(self.style.WARNING(f"\n⚠️ Found {profiles_with_issue.count()} users with edge case:"))
            for profile in profiles_with_issue:
                self.stdout.write(f"   - {profile.user.email}")
        else:
            self.stdout.write(self.style.SUCCESS("✅ No users found with edge case"))
        
        return profiles_with_issue

    def fix_all_users(self):
        profiles = self.check_all_users()
        
        if profiles.exists():
            response = input("\nFix all these users? (yes/no): ")
            if response.lower() == 'yes':
                for profile in profiles:
                    self.stdout.write(f"\n{'='*60}")
                    self.fix_user(profile.user.email)
                self.stdout.write(self.style.SUCCESS("\n✅ All users fixed"))