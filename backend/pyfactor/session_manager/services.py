"""
Session Service
Handles session CRUD operations with Redis caching
"""

import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import redis
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import UserSession, SessionEvent
from custom_auth.models import Tenant

User = get_user_model()


class SessionService:
    """
    Centralized session management service
    Handles creation, retrieval, updates, and deletion of sessions
    """
    
    def __init__(self):
        # Initialize Redis connection
        self.redis_client = self._get_redis_client()
        self.session_ttl = getattr(settings, 'SESSION_TTL', 86400)  # 24 hours default
        self.cache_prefix = 'session:'
        
    def _get_redis_client(self):
        """Get Redis client instance"""
        try:
            # Check if Redis is configured
            redis_url = getattr(settings, 'REDIS_URL', None)
            redis_host = getattr(settings, 'REDIS_HOST', None)
            
            if not redis_url and not redis_host:
                print(f"[SessionService] Redis not configured, using PostgreSQL-only session storage")
                return None
            
            # If we have REDIS_URL, use it directly
            if redis_url:
                print(f"[SessionService] Connecting to Redis using URL: {redis_url}")
                try:
                    # Parse the URL to handle any formatting issues
                    from urllib.parse import urlparse
                    parsed = urlparse(redis_url)
                    
                    # Build connection parameters from parsed URL
                    connection_kwargs = {
                        'host': parsed.hostname,
                        'port': parsed.port or 6379,
                        'db': getattr(settings, 'REDIS_SESSION_DB', 1),
                        'decode_responses': True,
                        'health_check_interval': 30,
                        'socket_keepalive': True,
                        'socket_connect_timeout': 5,
                        'socket_timeout': 5,
                        'retry_on_timeout': True
                    }
                    
                    # Add password if present
                    if parsed.password:
                        connection_kwargs['password'] = parsed.password
                    
                    # Handle SSL if the scheme is 'rediss'
                    if parsed.scheme == 'rediss':
                        connection_kwargs['ssl'] = True
                        connection_kwargs['ssl_cert_reqs'] = None
                    
                    print(f"[SessionService] Redis connection params: host={parsed.hostname}, port={parsed.port or 6379}, ssl={parsed.scheme == 'rediss'}")
                    return redis.StrictRedis(**connection_kwargs)
                except Exception as e:
                    print(f"[SessionService] Failed to parse Redis URL: {e}")
                    # Try direct connection as fallback
                    return redis.StrictRedis.from_url(
                        redis_url,
                        db=getattr(settings, 'REDIS_SESSION_DB', 1),
                        decode_responses=True,
                        health_check_interval=30,
                        socket_keepalive=True,
                        socket_connect_timeout=5,
                        socket_timeout=5,
                        retry_on_timeout=True
                    )
            
            # Otherwise use individual settings
            connection_kwargs = {
                'host': redis_host,
                'port': getattr(settings, 'REDIS_PORT', 6379),
                'db': getattr(settings, 'REDIS_SESSION_DB', 1),
                'decode_responses': True,
                'health_check_interval': 30,
                'socket_keepalive': True,
                'socket_connect_timeout': 5,
                'socket_timeout': 5,
                'retry_on_timeout': True
            }
            
            # Add password if configured
            redis_password = getattr(settings, 'REDIS_PASSWORD', None)
            if redis_password:
                connection_kwargs['password'] = redis_password
            
            # Add SSL if configured
            if getattr(settings, 'REDIS_SSL', False):
                connection_kwargs['ssl'] = True
                connection_kwargs['ssl_cert_reqs'] = None
            
            # Create Redis connection with fixed parameters
            try:
                client = redis.StrictRedis(**connection_kwargs)
                # Test the connection
                client.ping()
                print(f"[SessionService] Redis connection successful")
                return client
            except Exception as e:
                print(f"[SessionService] Redis connection failed: {e}")
                return None
            
        except Exception as e:
            print(f"[SessionService] Failed to connect to Redis: {e}")
            print(f"[SessionService] This is expected if Redis is not configured. Using PostgreSQL for session storage.")
            # Disable Redis completely if connection fails
            return None
    def _hash_token(self, token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def create_session(
        self,
        user: User,
        access_token: str,
        request_meta: Optional[Dict] = None,
        **kwargs
    ) -> UserSession:
        """
        Create a new session for a user
        
        Args:
            user: User instance
            access_token: Auth0 access token
            request_meta: Request metadata (IP, user agent)
            **kwargs: Additional session data
            
        Returns:
            UserSession instance
        """
        try:
            print(f"[SessionService] create_session called for user: {user.email}")
            print(f"[SessionService] User ID: {user.id}")
            print(f"[SessionService] Access token present: {bool(access_token)}")
            print(f"[SessionService] Request meta: {request_meta}")
            print(f"[SessionService] Additional kwargs: {kwargs}")
            
            # Get or determine tenant
            tenant = kwargs.pop('tenant', None)
            if not tenant and hasattr(user, 'tenant'):
                tenant = user.tenant
            
            print(f"[SessionService] Tenant resolved: {tenant}")
            if tenant:
                print(f"[SessionService] Tenant ID: {tenant.id}, Name: {tenant.name}")
            
            # Extract request metadata
            ip_address = None
            user_agent = None
            if request_meta:
                ip_address = request_meta.get('ip_address')
                user_agent = request_meta.get('user_agent')
            
            # SIMPLIFIED: Get onboarding status from user model (single source of truth)
            needs_onboarding = not user.onboarding_completed
            onboarding_completed = user.onboarding_completed
            onboarding_step = 'complete' if onboarding_completed else 'business_info'
            
            print(f"[SessionService] Onboarding status from user model:")
            print(f"  - user.onboarding_completed: {user.onboarding_completed}")
            print(f"  - needs_onboarding: {needs_onboarding}")
            
            # Get current step from OnboardingProgress for UI display only
            from onboarding.models import OnboardingProgress
            try:
                onboarding_progress = OnboardingProgress.objects.filter(user=user).first()
                if onboarding_progress and not onboarding_completed:
                    onboarding_step = onboarding_progress.current_step or 'business_info'
                    print(f"[SessionService] Current step from OnboardingProgress: {onboarding_step}")
            except Exception as e:
                print(f"[SessionService] Error getting OnboardingProgress (non-critical): {e}")
            
            # Remove any onboarding-related kwargs to avoid duplicates
            kwargs.pop('needs_onboarding', None)
            kwargs.pop('onboarding_completed', None)
            kwargs.pop('onboarding_step', None)
            
            # Get subscription plan from user model
            subscription_plan = user.subscription_plan or 'free'
            kwargs.pop('subscription_plan', None)  # Remove from kwargs to avoid override
            
            print(f"[SessionService] User subscription plan: {subscription_plan}")
            
            # Get user role and add to session data
            user_role = user.role if hasattr(user, 'role') else 'USER'
            print(f"[SessionService] User role: {user_role}")
            logger.info(f"🚨 [ROLE_TRACKING] Session creation - user {user.email} role: {user_role}")
            
            # Ensure session_data is included in kwargs
            if 'session_data' not in kwargs:
                kwargs['session_data'] = {}
            kwargs['session_data']['user_role'] = user_role
            
            # Create session
            with transaction.atomic():
                session = UserSession.objects.create(
                    user=user,
                    tenant=tenant,
                    access_token_hash=self._hash_token(access_token),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    expires_at=timezone.now() + timedelta(seconds=self.session_ttl),
                    needs_onboarding=needs_onboarding,
                    onboarding_completed=onboarding_completed,
                    onboarding_step=onboarding_step,
                    subscription_plan=subscription_plan,
                    **kwargs
                )
                
                print(f"[SessionService] Session created with ID: {session.session_id}")
                
                # Log session creation
                print(f"[SessionService] Creating session event...")
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
                print(f"[SessionService] Session event created")
                
                # Cache session
                self._cache_session(session)
                
                return session
                
        except Exception as e:
            print(f"[SessionService] Session creation error: {e}")
            print(f"[SessionService] Error type: {type(e).__name__}")
            import traceback
            print(f"[SessionService] Traceback: {traceback.format_exc()}")
            raise
    
    def get_session(self, session_id: str) -> Optional[UserSession]:
        """
        Get session by ID
        
        Args:
            session_id: Session UUID
            
        Returns:
            UserSession instance or None
        """
        # Always get from database to ensure we return a UserSession instance
        # Redis cache should only be used for performance, not as the source of truth
        try:
            session = UserSession.objects.select_related('user', 'tenant').get(
                session_id=session_id,
                is_active=True,
                expires_at__gt=timezone.now()
            )
            
            # Update activity
            session.update_activity()
            
            # Cache for next time (if Redis is available)
            self._cache_session(session)
            
            return session
            
        except UserSession.DoesNotExist:
            return None
    
    def update_session(self, session_id: str, **updates) -> Optional[UserSession]:
        """
        Update session data atomically
        
        Args:
            session_id: Session UUID
            **updates: Fields to update
            
        Returns:
            Updated UserSession or None
        """
        try:
            with transaction.atomic():
                session = UserSession.objects.select_for_update().get(
                    session_id=session_id,
                    is_active=True
                )
                
                # Update direct fields
                update_fields = []
                for key, value in updates.items():
                    if hasattr(session, key) and key not in ['session_id', 'user', 'created_at']:
                        setattr(session, key, value)
                        update_fields.append(key)
                    else:
                        # Store in session_data
                        session.session_data[key] = value
                        if 'session_data' not in update_fields:
                            update_fields.append('session_data')
                
                # Always update timestamps
                session.updated_at = timezone.now()
                session.last_activity = timezone.now()
                update_fields.extend(['updated_at', 'last_activity'])
                
                session.save(update_fields=update_fields)
                
                # Log update
                SessionEvent.objects.create(
                    session=session,
                    event_type='updated',
                    event_data={'updates': list(updates.keys())}
                )
                
                # Update cache
                self._cache_session(session)
                
                return session
                
        except UserSession.DoesNotExist:
            return None
        except Exception as e:
            print(f"Session update error: {e}")
            raise
    
    def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate a session
        
        Args:
            session_id: Session UUID
            
        Returns:
            Success boolean
        """
        try:
            session = UserSession.objects.get(session_id=session_id)
            session.invalidate()
            
            # Log invalidation
            SessionEvent.objects.create(
                session=session,
                event_type='invalidated'
            )
            
            # Remove from cache
            self._delete_cached_session(session_id)
            
            return True
            
        except UserSession.DoesNotExist:
            return False
    
    def invalidate_all_user_sessions(self, user: User) -> int:
        """
        Invalidate all sessions for a user
        
        Args:
            user: User instance
            
        Returns:
            Number of sessions invalidated
        """
        sessions = UserSession.objects.filter(user=user, is_active=True)
        count = sessions.count()
        
        for session in sessions:
            self.invalidate_session(str(session.session_id))
        
        return count
    
    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions
        
        Returns:
            Number of sessions cleaned
        """
        expired = UserSession.objects.filter(
            expires_at__lt=timezone.now()
        )
        count = expired.count()
        
        # Log expiration events
        for session in expired:
            SessionEvent.objects.create(
                session=session,
                event_type='expired'
            )
            self._delete_cached_session(str(session.session_id))
        
        expired.delete()
        
        return count
    
    def extend_session(self, session_id: str, hours: int = 24) -> Optional[UserSession]:
        """
        Extend session expiration
        
        Args:
            session_id: Session UUID
            hours: Hours to extend
            
        Returns:
            Updated session or None
        """
        try:
            session = UserSession.objects.get(
                session_id=session_id,
                is_active=True
            )
            session.extend_session(hours)
            
            # Log extension
            SessionEvent.objects.create(
                session=session,
                event_type='extended',
                event_data={'hours': hours}
            )
            
            # Update cache
            self._cache_session(session)
            
            return session
            
        except UserSession.DoesNotExist:
            return None
    
    def _cache_session(self, session: UserSession):
        """Cache session in Redis"""
        if not self.redis_client:
            print(f"[SessionService] Redis not available, skipping cache")
            return
            
        try:
            key = f"{self.cache_prefix}{session.session_id}"
            
            # Prepare session data for caching
            data = {
                'session_id': str(session.session_id),
                'user_id': session.user_id,
                'user_email': session.user.email,
                'user_role': session.session_data.get('user_role', 'USER'),  # Include user role
                'tenant_id': str(session.tenant_id) if session.tenant else None,
                'needs_onboarding': session.needs_onboarding,
                'onboarding_completed': session.onboarding_completed,
                'onboarding_step': session.onboarding_step,
                'subscription_plan': session.subscription_plan,
                'subscription_status': session.subscription_status,
                'session_data': session.session_data,
                'is_active': session.is_active,
                'expires_at': session.expires_at.isoformat(),
                'last_activity': session.last_activity.isoformat()
            }
            
            # Calculate TTL
            ttl = int((session.expires_at - timezone.now()).total_seconds())
            if ttl > 0:
                self.redis_client.setex(
                    key,
                    ttl,
                    json.dumps(data)
                )
                
        except Exception as e:
            print(f"Session cache error: {e}")
    
    def _get_cached_session(self, session_id: str) -> Optional[Dict]:
        """Get session from Redis cache"""
        if not self.redis_client:
            return None
            
        try:
            key = f"{self.cache_prefix}{session_id}"
            data = self.redis_client.get(key)
            
            if data:
                return json.loads(data)
                
        except Exception as e:
            print(f"Session cache retrieval error: {e}")
            
        return None
    
    def _delete_cached_session(self, session_id: str):
        """Delete session from Redis cache"""
        if not self.redis_client:
            return
            
        try:
            key = f"{self.cache_prefix}{session_id}"
            self.redis_client.delete(key)
        except Exception as e:
            print(f"Session cache deletion error: {e}")
    
    def get_active_sessions_count(self, user: Optional[User] = None) -> int:
        """Get count of active sessions"""
        query = UserSession.objects.filter(
            is_active=True,
            expires_at__gt=timezone.now()
        )
        
        if user:
            query = query.filter(user=user)
            
        return query.count()
    
    def get_session_by_token(self, access_token: str) -> Optional[UserSession]:
        """
        Get session by access token
        
        Args:
            access_token: Auth0 access token
            
        Returns:
            UserSession or None
        """
        token_hash = self._hash_token(access_token)
        
        try:
            return UserSession.objects.select_related('user', 'tenant').get(
                access_token_hash=token_hash,
                is_active=True,
                expires_at__gt=timezone.now()
            )
        except UserSession.DoesNotExist:
            return None


# Global session service instance
session_service = SessionService()