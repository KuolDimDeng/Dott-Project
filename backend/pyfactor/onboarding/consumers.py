#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/consumers.py

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import OnboardingProgress
from business.models import Business
from users.models import UserProfile
from django.contrib.auth import get_user_model
from users.utils import create_user_database, setup_user_database

logger = logging.getLogger(__name__)
User = get_user_model()

class OnboardingConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        logger.info("Connecting via websocket...")
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'onboarding_{self.user_id}'

        # Authenticate the user
        self.user = self.scope.get('user', None)
        if not self.user or self.user.is_anonymous:
            logger.error(f"Failed to authenticate user for WebSocket connection. User ID: {self.user_id}")
            await self.close()
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"WebSocket connected for user {self.user_id}")

    async def receive(self, text_data):
        logger.info(f"Received message: {text_data}")

        text_data_json = json.loads(text_data)
        if text_data_json.get('type') == 'start_onboarding':
            await self.start_onboarding()

    async def start_onboarding(self):
        logger.info("Starting onboarding")
        try:
            logger.info(f"Starting onboarding process for user: {self.user.email}")
            onboarding, created = await database_sync_to_async(OnboardingProgress.objects.get_or_create)(
                user=self.user,
                defaults={
                    'email': self.user.email,
                    'onboarding_status': 'step1',
                    'current_step': 1
                }
            )
            logger.info(f"OnboardingProgress {'created' if created else 'retrieved'} for user: {self.user.email}")

            await self.advance_step(10, "Starting Data Verification")
            business = await self.create_or_update_business(onboarding)
            await self.advance_step(25, "Data Verification Complete")

            await self.advance_step(50, "Setting Up Integrations")
            await self.update_user_profile(onboarding)
            await self.advance_step(75, "Creating User Database")
            
            # Create and setup user database
            database_name = await create_user_database(self.user, business)
            logger.info(f"User database created: {database_name}")
            await self.advance_step(85, "Setting Up Database")
            
            # Use the async setup_user_database directly
            await setup_user_database(database_name, self.user, business)
            logger.info(f"User database setup completed")
            
            # Update UserProfile with database information
            await self.update_user_profile_with_database(database_name)
            
            await self.advance_step(95, "Finalizing Setup")
            await self.finalize_onboarding(onboarding)
            await self.advance_step(100, "Onboarding Complete", complete=True)
            logger.info(f"Onboarding process completed for user: {self.user.email}")
            
        except Exception as e:
            logger.error(f"Error during onboarding for user {self.user.email}: {str(e)}", exc_info=True)
            await self.send_error(str(e))

    @database_sync_to_async
    def create_or_update_business(self, onboarding):
        logger.info(f"Creating or updating business for user: {self.user.email}")
        business, created = Business.objects.update_or_create(
            owner=self.user,
            defaults={
                'name': onboarding.business_name,
                'business_type': onboarding.business_type,
                'country': onboarding.country,
            }
        )
        logger.info(f"Business {'created' if created else 'updated'} for user: {self.user.email}")
        return business

    @database_sync_to_async
    def update_user_profile(self, onboarding):
        logger.info(f"Updating user profile for user: {self.user.email}")
        business = Business.objects.get(owner=self.user)
        UserProfile.objects.update_or_create(
            user=self.user,
            defaults={
                'business': business,
                'country': onboarding.country,
                'is_business_owner': True,
            }
        )
        logger.info(f"User profile updated for user: {self.user.email}")

    @database_sync_to_async
    def finalize_onboarding(self, onboarding):
        logger.info(f"Finalizing onboarding for user: {self.user.email}")
        self.user.is_onboarded = True
        self.user.save()
        onboarding.delete()
        logger.info(f"Onboarding finalized and OnboardingProgress deleted for user: {self.user.email}")

    async def advance_step(self, progress, step, complete=False):
        await self.send_onboarding_progress(progress, step)
        if complete:
            await self.send_onboarding_complete()

    async def send_onboarding_progress(self, progress, step):
        logger.info("Sending onboarding progress")
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'onboarding_progress',
                'progress': progress,
                'step': step,
            }
        )

    async def onboarding_progress(self, event):
        await self.send(text_data=json.dumps({
            'type': 'onboarding_progress',
            'progress': event['progress'],
            'step': event['step'],
        }))

    async def send_onboarding_complete(self):
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'onboarding_complete',
            }
        )

    async def onboarding_complete(self, event):
        logger.info("Onboarding is complete")
        await self.send(text_data=json.dumps({
            'type': 'onboarding_complete',
        }))

    async def send_error(self, message):
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

    @database_sync_to_async
    def update_user_profile_with_database(self, database_name):
        logger.info(f"Updating user profile with database information for user: {self.user.email}")
        user_profile = UserProfile.objects.get(user=self.user)
        user_profile.database_name = database_name
        user_profile.database_status = 'active'
        user_profile.save()
        logger.info(f"User profile updated with database information for user: {self.user.email}")
