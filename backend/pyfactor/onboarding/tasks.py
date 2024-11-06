# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/tasks.py
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.utils import create_user_database, setup_user_database

@shared_task(bind=True)
def setup_user_database_task(self, user_id, business_id):
    channel_layer = get_channel_layer()
    group_name = f'onboarding_{user_id}'

    try:
        # Send progress updates
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'onboarding_progress',
                'progress': 25,
                'step': 'Verifying Data'
            }
        )

        # Create database
        database_name = create_user_database(user_id, business_id)
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'onboarding_progress',
                'progress': 50,
                'step': 'Creating User Database'
            }
        )

        # Setup database
        setup_user_database(database_name, user_id, business_id)
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'onboarding_progress',
                'progress': 75,
                'step': 'Setting Up Database Tables'
            }
        )

        # Final step
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'onboarding_progress',
                'progress': 90,
                'step': 'Finalizing Setup'
            }
        )

        # Send completion message
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'onboarding_complete'
            }
        )

        return True

    except Exception as e:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'error',
                'message': str(e)
            }
        )
        raise