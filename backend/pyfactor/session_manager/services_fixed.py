"""
Fixed Session Service
Handles transaction issues properly
"""

import logging
from django.db import transaction
from .services import SessionService as BaseSessionService
from .models import UserSession, SessionEvent
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class SessionServiceFixed(BaseSessionService):
    """
    Fixed version of SessionService that handles transactions properly
    """
    
    def create_session(self, user, tenant=None, ip_address=None, user_agent=None, **kwargs):
        """
        Create session with proper transaction handling
        """
        try:
            # Determine onboarding status
            needs_onboarding = False
            onboarding_completed = True
            onboarding_step = 'completed'
            
            if hasattr(user, 'onboarding_completed'):
                onboarding_completed = user.onboarding_completed
                needs_onboarding = not onboarding_completed
                
                if not onboarding_completed and hasattr(user, 'onboarding_status'):
                    onboarding_step = user.onboarding_status or 'business_info'
            
            # Determine subscription plan
            subscription_plan = 'free'
            if tenant:
                from users.models import Subscription
                subscription = Subscription.objects.filter(
                    tenant_id=tenant.id,
                    is_active=True
                ).first()
                if subscription:
                    subscription_plan = subscription.selected_plan
            
            # Create session without nested transaction
            session = UserSession(
                user=user,
                tenant=tenant,
                ip_address=ip_address,
                user_agent=user_agent,
                session_type=kwargs.get('session_type', 'web'),
                expires_at=timezone.now() + timedelta(seconds=self.session_ttl),
                needs_onboarding=needs_onboarding,
                onboarding_completed=onboarding_completed,
                onboarding_step=onboarding_step,
                subscription_plan=subscription_plan
            )
            
            # Save session
            session.save()
            
            # Try to create session event, but don't fail if it doesn't work
            try:
                SessionEvent.objects.create(
                    session=session,
                    event_type='created',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    event_data={
                        'user_email': user.email,
                        'tenant_id': str(tenant.id) if tenant else None
                    }
                )
            except Exception as e:
                # Log the error but don't fail the session creation
                logger.warning(f"Failed to create session event: {e}")
            
            # Cache session (if caching is enabled)
            try:
                self._cache_session(session)
            except Exception as e:
                logger.warning(f"Failed to cache session: {e}")
            
            return session
            
        except Exception as e:
            logger.error(f"Session creation error: {e}", exc_info=True)
            raise


# Create singleton instance
session_service_fixed = SessionServiceFixed()