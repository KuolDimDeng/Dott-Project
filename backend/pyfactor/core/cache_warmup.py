"""
Cache warmup utilities for preloading frequently accessed data
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import UserProfile, Business, BusinessDetails
from .cache_service import cache_service

logger = logging.getLogger(__name__)


class CacheWarmupService:
    """
    Service to warmup cache with frequently accessed data
    """
    
    @classmethod
    def warmup_business_cache(cls, business_id: str):
        """Warmup cache for a specific business"""
        try:
            business = Business.objects.get(id=business_id)
            business_details = BusinessDetails.objects.get(business=business)
            
            # Cache business details
            from users.accounting_standards import (
                get_default_accounting_standard,
                get_accounting_standard_display,
                is_dual_standard_country,
                ACCOUNTING_STANDARD_INFO
            )
            from accounting.services import AccountingStandardsService
            
            country_code = str(business_details.country) if business_details.country else 'US'
            current_standard = business_details.accounting_standard or get_default_accounting_standard(country_code)
            statement_format = AccountingStandardsService.get_financial_statement_format(business_id)
            
            business_data = {
                'success': True,
                'accounting_standard': current_standard,
                'accounting_standard_display': get_accounting_standard_display(current_standard, country_code),
                'country': country_code,
                'country_name': business_details.country.name if business_details.country else 'United States',
                'allows_dual_standard': is_dual_standard_country(country_code),
                'default_standard': get_default_accounting_standard(country_code),
                'inventory_valuation_method': business_details.inventory_valuation_method or 'WEIGHTED_AVERAGE',
                'financial_statement_names': {
                    'balance_sheet': statement_format['balance_sheet_name'],
                    'income_statement': statement_format['income_statement_name'],
                    'equity_statement': statement_format['equity_statement_name']
                },
                'standard_info': ACCOUNTING_STANDARD_INFO.get(current_standard),
                'business': {
                    'name': business.name,
                    'id': str(business.id)
                }
            }
            
            cache_service.set_business_details(business_id, business_data)
            
            # Cache currency preferences
            from currency.currency_data import get_currency_info
            from users.accounting_standards import get_accounting_standard_display, is_dual_standard_country
            
            currency_info = get_currency_info(business_details.preferred_currency_code)
            currency_symbol = currency_info.get('symbol', '$') if currency_info else '$'
            
            currency_data = {
                'success': True,
                'currency_code': business_details.preferred_currency_code,
                'currency_name': business_details.preferred_currency_name,
                'currency_symbol': currency_symbol,
                'show_usd_on_invoices': business_details.show_usd_on_invoices,
                'show_usd_on_quotes': business_details.show_usd_on_quotes,
                'show_usd_on_reports': business_details.show_usd_on_reports,
                'accounting_standard': business_details.accounting_standard,
                'accounting_standard_display': get_accounting_standard_display(
                    business_details.accounting_standard, 
                    business_details.country
                ),
                'allows_dual_standard': is_dual_standard_country(business_details.country)
            }
            
            cache_service.set_currency_preferences(business_id, currency_data)
            
            logger.info(f"Warmed up cache for business: {business_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error warming up business cache: {str(e)}")
            return False
    
    @classmethod
    def warmup_user_cache(cls, user_id: int):
        """Warmup cache for a specific user"""
        try:
            from custom_auth.models import User
            from onboarding.models import OnboardingProgress
            
            user = User.objects.get(id=user_id)
            
            # Skip if no profile
            try:
                profile = UserProfile.objects.get(user=user)
            except UserProfile.DoesNotExist:
                return False
            
            # Get subscription info
            subscription_plan = 'free'
            selected_plan = 'free'
            try:
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress:
                    subscription_plan = progress.subscription_plan or progress.selected_plan or 'free'
                    selected_plan = progress.selected_plan or progress.subscription_plan or 'free'
            except:
                pass
            
            # Build profile data
            user_role = getattr(user, 'role', 'USER')
            page_permissions = []
            
            # Get permissions based on role
            if user_role == 'OWNER':
                from custom_auth.models import PagePermission
                all_pages = PagePermission.objects.filter(is_active=True)
                for page in all_pages:
                    page_permissions.append({
                        'path': page.path,
                        'name': page.name,
                        'category': page.category,
                        'can_read': True,
                        'can_write': True,
                        'can_edit': True,
                        'can_delete': True
                    })
            
            # Get employee data if exists
            employee_data = None
            try:
                from hr.models import Employee
                employee = Employee.objects.filter(user=user).first()
                if employee:
                    employee_data = {
                        'id': str(employee.id),
                        'employee_number': employee.employee_number,
                        'first_name': employee.first_name,
                        'last_name': employee.last_name,
                        'job_title': employee.job_title,
                        'department': employee.department,
                        'hire_date': employee.hire_date.isoformat() if employee.hire_date else None,
                        'employee_type': employee.employee_type,
                        'can_approve_timesheets': employee.can_approve_timesheets,
                        'exempt_status': employee.exempt_status,
                        'hourly_rate': float(employee.hourly_rate) if employee.hourly_rate else 0,
                        'salary': float(employee.salary) if employee.salary else 0,
                    }
            except:
                pass
            
            # Build cached data
            cache_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user_role,
                'page_permissions': page_permissions,
                'subscription_plan': subscription_plan,
                'selected_plan': selected_plan,
                'subscription_type': subscription_plan,
                'is_business_owner': profile.is_business_owner,
                'tenant_id': str(profile.tenant_id) if profile.tenant_id else None,
                'business_id': str(profile.business_id) if profile.business_id else None,
                'country': str(profile.country) if profile.country else 'US',
                'phone_number': profile.phone_number,
                'occupation': profile.occupation,
                'show_whatsapp_commerce': profile.get_whatsapp_commerce_preference(),
                'whatsapp_commerce_explicit': profile.show_whatsapp_commerce,
                'display_legal_structure': profile.display_legal_structure,
                'employee': employee_data,
            }
            
            # Add business information
            if profile.business:
                business = profile.business
                cache_data.update({
                    'business_name': business.name,
                    'business_type': business.business_type,
                    'legal_structure': getattr(business, 'legal_structure', ''),
                })
            
            cache_service.set_user_profile(user_id, cache_data)
            
            logger.info(f"Warmed up cache for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error warming up user cache: {str(e)}")
            return False
    
    @classmethod
    def warmup_active_users(cls, limit: int = 100):
        """Warmup cache for recently active users"""
        try:
            # Get recently active users
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            recent_users = User.objects.filter(
                last_login__isnull=False
            ).order_by('-last_login')[:limit]
            
            success_count = 0
            for user in recent_users:
                if cls.warmup_user_cache(user.id):
                    success_count += 1
                
                # Also warmup their business cache
                try:
                    profile = UserProfile.objects.get(user=user)
                    if profile.business_id:
                        cls.warmup_business_cache(str(profile.business_id))
                except:
                    pass
            
            logger.info(f"Warmed up cache for {success_count} users")
            return success_count
            
        except Exception as e:
            logger.error(f"Error warming up active users cache: {str(e)}")
            return 0


# Management command for cache warmup
class Command(BaseCommand):
    help = 'Warmup cache with frequently accessed data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=100,
            help='Number of active users to warmup (default: 100)'
        )
        parser.add_argument(
            '--business',
            type=str,
            help='Specific business ID to warmup'
        )
        parser.add_argument(
            '--user',
            type=int,
            help='Specific user ID to warmup'
        )
    
    def handle(self, *args, **options):
        self.stdout.write('Starting cache warmup...')
        
        if options['business']:
            if CacheWarmupService.warmup_business_cache(options['business']):
                self.stdout.write(self.style.SUCCESS(f"✓ Warmed up business {options['business']}"))
            else:
                self.stdout.write(self.style.ERROR(f"✗ Failed to warmup business {options['business']}"))
        
        if options['user']:
            if CacheWarmupService.warmup_user_cache(options['user']):
                self.stdout.write(self.style.SUCCESS(f"✓ Warmed up user {options['user']}"))
            else:
                self.stdout.write(self.style.ERROR(f"✗ Failed to warmup user {options['user']}"))
        
        if not options['business'] and not options['user']:
            count = CacheWarmupService.warmup_active_users(options['users'])
            self.stdout.write(self.style.SUCCESS(f"✓ Warmed up cache for {count} active users"))
        
        self.stdout.write(self.style.SUCCESS('Cache warmup completed!'))