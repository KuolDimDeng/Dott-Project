from django.db import transaction
from ..models import OnboardingStatus
from ..tasks import setup_user_database

class OnboardingService:
    @staticmethod
    def start_setup(business):
        """
        Start the setup process for a new business
        """
        with transaction.atomic():
            # Create or get onboarding status
            status_obj, created = OnboardingStatus.objects.get_or_create(
                business=business,
                defaults={
                    'is_complete': False,
                    'progress': 0,
                    'current_step': 'initializing'
                }
            )

            if not created and status_obj.is_complete:
                raise ValueError('Setup already completed')

            # Start the setup process in the background
            setup_user_database.delay(business.id)

            return status_obj

    @staticmethod
    def get_setup_status(business):
        """
        Get the current setup status for a business
        """
        try:
            status = OnboardingStatus.objects.get(business=business)
            return {
                'is_complete': status.is_complete,
                'progress': status.progress,
                'current_step': status.current_step
            }
        except OnboardingStatus.DoesNotExist:
            return {
                'is_complete': False,
                'progress': 0,
                'current_step': 'not_started'
            }
