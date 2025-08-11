"""
Industry-standard Session Service with proper transaction management
Following best practices for production systems
"""

import logging
from typing import Optional
from datetime import timedelta
from django.db import transaction, DatabaseError
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

from .models import UserSession, SessionEvent
from custom_auth.models import User, Tenant

logger = logging.getLogger(__name__)


class SessionService:
    """
    Production-grade session management service
    Following SOLID principles and industry best practices
    """
    
    def __init__(self):
        self.session_ttl = getattr(settings, 'SESSION_TTL', 86400)  # 24 hours default
        self.cache_ttl = getattr(settings, 'SESSION_CACHE_TTL', 300)  # 5 minutes
        self.enable_caching = getattr(settings, 'ENABLE_SESSION_CACHE', True)
        self.enable_audit = getattr(settings, 'ENABLE_SESSION_AUDIT', True)
    
    @transaction.atomic
    def create_session(
        self,
        user: User,
        tenant: Optional[Tenant] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_type: str = 'web',
        **metadata
    ) -> UserSession:
        """
        Create a new session with proper transaction handling
        
        This method uses Django's transaction.atomic decorator to ensure
        all database operations are atomic. If any operation fails,
        all changes are rolled back.
        
        Args:
            user: The user for whom to create the session
            tenant: Optional tenant/business associated with the user
            ip_address: Client IP address
            user_agent: Client user agent string
            session_type: Type of session (web, mobile, api)
            **metadata: Additional session metadata
            
        Returns:
            Created UserSession instance
            
        Raises:
            DatabaseError: If session creation fails
        """
        try:
            # Validate user
            if not user or not user.is_active:
                raise ValueError("Cannot create session for inactive user")
            
            # Determine session metadata
            session_data = self._prepare_session_data(user, tenant)
            
            # Create the session
            session = UserSession.objects.create(
                user=user,
                tenant=tenant,
                ip_address=ip_address or self._get_default_ip(),
                user_agent=user_agent or '',
                session_type=session_type,
                expires_at=timezone.now() + timedelta(seconds=self.session_ttl),
                **session_data,
                **metadata
            )
            
            # Create audit log asynchronously (non-blocking)
            if self.enable_audit:
                self._create_session_event_async(session, ip_address, user_agent)
            
            # Cache session if enabled
            if self.enable_caching:
                self._cache_session(session)
            
            logger.info(f"Session created successfully: {session.id} for user: {user.email}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create session for user {user.email}: {str(e)}", exc_info=True)
            raise DatabaseError(f"Session creation failed: {str(e)}")
    
    def _prepare_session_data(self, user: User, tenant: Optional[Tenant]) -> dict:
        """
        Prepare session metadata based on user and tenant
        
        Returns:
            Dictionary with session metadata
        """
        data = {
            'needs_onboarding': False,
            'onboarding_completed': True,
            'onboarding_step': 'completed',
            'subscription_plan': 'free'
        }
        
        # Check onboarding status
        if hasattr(user, 'onboarding_completed'):
            data['onboarding_completed'] = user.onboarding_completed
            data['needs_onboarding'] = not user.onboarding_completed
            
            if not user.onboarding_completed:
                data['onboarding_step'] = getattr(user, 'onboarding_status', 'business_info')
        
        # Get subscription plan
        if tenant:
            data['subscription_plan'] = self._get_subscription_plan(tenant)
        
        return data
    
    def _get_subscription_plan(self, tenant: Tenant) -> str:
        """
        Get subscription plan for tenant
        Uses a separate query to avoid coupling
        """
        try:
            from users.models import Subscription
            subscription = Subscription.objects.filter(
                tenant_id=tenant.id,
                is_active=True
            ).values_list('selected_plan', flat=True).first()
            return subscription or 'free'
        except Exception as e:
            logger.warning(f"Could not fetch subscription plan: {e}")
            return 'free'
    
    def _create_session_event_async(
        self,
        session: UserSession,
        ip_address: Optional[str],
        user_agent: Optional[str]
    ):
        """
        Create session event asynchronously to avoid blocking
        Uses a separate transaction to prevent failure cascade
        """
        try:
            # Use transaction.on_commit to run after the main transaction succeeds
            transaction.on_commit(
                lambda: self._create_session_event(session, ip_address, user_agent)
            )
        except Exception as e:
            # Log but don't fail the session creation
            logger.warning(f"Could not schedule session event creation: {e}")
    
    def _create_session_event(
        self,
        session: UserSession,
        ip_address: Optional[str],
        user_agent: Optional[str]
    ):
        """
        Create session event in a separate transaction
        """
        try:
            with transaction.atomic():
                SessionEvent.objects.create(
                    session=session,
                    event_type='created',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    event_data={
                        'user_email': session.user.email,
                        'tenant_id': str(session.tenant.id) if session.tenant else None
                    }
                )
        except Exception as e:
            # Log the error but don't propagate it
            logger.error(f"Failed to create session event: {e}")
    
    def _cache_session(self, session: UserSession):
        """
        Cache session for performance
        """
        if not self.enable_caching:
            return
            
        try:
            cache_key = f"session:{session.id}"
            cache.set(cache_key, session, timeout=self.cache_ttl)
        except Exception as e:
            # Caching failure should not break session creation
            logger.warning(f"Failed to cache session: {e}")
    
    def _get_default_ip(self) -> str:
        """Get default IP for local/test environments"""
        return '127.0.0.1'
    
    def get_session(self, session_id: str) -> Optional[UserSession]:
        """
        Retrieve session with caching
        """
        if self.enable_caching:
            cache_key = f"session:{session_id}"
            cached = cache.get(cache_key)
            if cached:
                return cached
        
        try:
            session = UserSession.objects.select_related('user', 'tenant').get(
                id=session_id,
                is_active=True
            )
            
            if session.is_expired():
                return None
            
            if self.enable_caching:
                cache.set(cache_key, session, timeout=self.cache_ttl)
            
            return session
        except UserSession.DoesNotExist:
            return None
    
    def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate a session
        """
        try:
            with transaction.atomic():
                session = UserSession.objects.get(id=session_id)
                session.is_active = False
                session.save(update_fields=['is_active'])
                
                # Clear cache
                if self.enable_caching:
                    cache.delete(f"session:{session_id}")
                
                # Create audit event
                if self.enable_audit:
                    self._create_session_event_async(session, None, None)
                
                return True
        except UserSession.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Failed to invalidate session: {e}")
            return False


# Singleton instance
session_service = SessionService()