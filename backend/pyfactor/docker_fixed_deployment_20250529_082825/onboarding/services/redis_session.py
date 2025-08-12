"""
Onboarding Redis Session Service

This module provides Redis-backed session management for onboarding data,
allowing for temporary storage of in-progress onboarding data with automatic
synchronization to the RLS-secured database.
"""
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional, Union
import redis
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Onboarding session key prefix in Redis
ONBOARDING_SESSION_KEY = "onboarding:session:{}"
# Onboarding data key prefix in Redis
ONBOARDING_DATA_KEY = "onboarding:data:{}"
# Onboarding progress key prefix in Redis
ONBOARDING_PROGRESS_KEY = "onboarding:progress:{}"

# Session expiration (24 hours)
SESSION_EXPIRATION = 24 * 60 * 60

class OnboardingSessionService:
    """Service for managing onboarding sessions in Redis"""
    
    def __init__(self):
        """Initialize Redis client connection"""
        try:
            self.redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=getattr(settings, 'REDIS_ONBOARDING_DB', 3),  # Use a separate Redis DB
                decode_responses=True
            )
            self.redis_available = True
            logger.debug("Redis session service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {str(e)}")
            self.redis_available = False
    
    def create_session(self, user_id: str) -> str:
        """
        Create a new onboarding session for a user
        
        Args:
            user_id: The ID of the user
            
        Returns:
            str: The session ID
        """
        if not self.redis_available:
            logger.warning("Redis not available for session creation")
            return str(uuid.uuid4())
            
        try:
            # Generate a unique session ID
            session_id = str(uuid.uuid4())
            
            # Create session metadata
            session_data = {
                "user_id": user_id,
                "created_at": time.time(),
                "last_active": time.time(),
                "expires_at": time.time() + SESSION_EXPIRATION
            }
            
            # Store in Redis with expiration
            session_key = ONBOARDING_SESSION_KEY.format(session_id)
            self.redis_client.hset(session_key, mapping=session_data)
            self.redis_client.expire(session_key, SESSION_EXPIRATION)
            
            # Associate session with user
            user_sessions_key = f"onboarding:user:{user_id}:sessions"
            self.redis_client.sadd(user_sessions_key, session_id)
            self.redis_client.expire(user_sessions_key, SESSION_EXPIRATION)
            
            logger.info(f"Created onboarding session {session_id} for user {user_id}")
            return session_id
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            # Fallback to UUID if Redis fails
            return str(uuid.uuid4())
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data for a session ID
        
        Args:
            session_id: The session ID
            
        Returns:
            dict: The session data or None if not found
        """
        if not self.redis_available or not session_id:
            return None
            
        try:
            # Get session metadata
            session_key = ONBOARDING_SESSION_KEY.format(session_id)
            session_data = self.redis_client.hgetall(session_key)
            
            if not session_data:
                return None
                
            # Update last active timestamp
            self.redis_client.hset(session_key, "last_active", time.time())
            
            # Extend expiration time
            self.redis_client.expire(session_key, SESSION_EXPIRATION)
            
            return session_data
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {str(e)}")
            return None
    
    def store_onboarding_data(self, session_id: str, step: str, data: Dict[str, Any]) -> bool:
        """
        Store step-specific onboarding data in Redis
        
        Args:
            session_id: The session ID
            step: The onboarding step
            data: The data to store
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.redis_available or not session_id:
            logger.warning(f"Redis not available for storing data: {step}")
            return False
            
        try:
            # Verify session exists
            session_key = ONBOARDING_SESSION_KEY.format(session_id)
            if not self.redis_client.exists(session_key):
                logger.warning(f"Session {session_id} not found for data storage")
                return False
            
            # Get user ID from session
            user_id = self.redis_client.hget(session_key, "user_id")
            if not user_id:
                logger.warning(f"No user ID found in session {session_id}")
                return False
                
            # Prepare data with metadata
            storage_data = {
                "step": step,
                "timestamp": time.time(),
                "data": json.dumps(data)
            }
            
            # Store data with expiration
            data_key = ONBOARDING_DATA_KEY.format(session_id)
            self.redis_client.hset(data_key, step, json.dumps(storage_data))
            self.redis_client.expire(data_key, SESSION_EXPIRATION)
            
            # Update progress tracking
            self._update_progress(session_id, user_id, step, data)
            
            # Update session last active time
            self.redis_client.hset(session_key, "last_active", time.time())
            self.redis_client.expire(session_key, SESSION_EXPIRATION)
            
            logger.debug(f"Stored data for step {step} in session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error storing data for session {session_id}, step {step}: {str(e)}")
            return False
    
    def get_onboarding_data(self, session_id: str, step: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get onboarding data from Redis
        
        Args:
            session_id: The session ID
            step: Optional specific step to retrieve, or all steps if None
            
        Returns:
            dict: The onboarding data or None if not found
        """
        if not self.redis_available or not session_id:
            return None
            
        try:
            # Verify session exists
            session_key = ONBOARDING_SESSION_KEY.format(session_id)
            if not self.redis_client.exists(session_key):
                logger.warning(f"Session {session_id} not found for data retrieval")
                return None
                
            # Get data
            data_key = ONBOARDING_DATA_KEY.format(session_id)
            
            if step:
                # Get specific step data
                step_data = self.redis_client.hget(data_key, step)
                if not step_data:
                    return None
                    
                parsed_data = json.loads(step_data)
                return json.loads(parsed_data.get("data", "{}"))
            else:
                # Get all steps data
                all_steps = self.redis_client.hgetall(data_key)
                if not all_steps:
                    return None
                    
                result = {}
                for step_key, step_data in all_steps.items():
                    parsed_data = json.loads(step_data)
                    result[step_key] = json.loads(parsed_data.get("data", "{}"))
                    
                return result
        except Exception as e:
            logger.error(f"Error getting data for session {session_id}: {str(e)}")
            return None
    
    def _update_progress(self, session_id: str, user_id: str, step: str, data: Dict[str, Any]) -> None:
        """
        Update progress tracking for a session
        
        Args:
            session_id: The session ID
            user_id: The user ID
            step: The onboarding step
            data: The step data
        """
        try:
            # Map steps to progress percentage
            step_progress = {
                "business-info": 25,
                "subscription": 50,
                "payment": 75,
                "setup": 90,
                "complete": 100
            }
            
            progress = step_progress.get(step, 0)
            
            # Store progress data
            progress_key = ONBOARDING_PROGRESS_KEY.format(session_id)
            progress_data = {
                "current_step": step,
                "progress": progress,
                "last_updated": time.time()
            }
            
            self.redis_client.hset(progress_key, mapping=progress_data)
            self.redis_client.expire(progress_key, SESSION_EXPIRATION)
            
            # Also store latest step for the user
            user_progress_key = f"onboarding:user:{user_id}:progress"
            self.redis_client.hset(user_progress_key, mapping=progress_data)
            self.redis_client.expire(user_progress_key, SESSION_EXPIRATION)
        except Exception as e:
            logger.error(f"Error updating progress for session {session_id}: {str(e)}")
    
    def get_progress(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get progress tracking data for a session
        
        Args:
            session_id: The session ID
            
        Returns:
            dict: The progress data or None if not found
        """
        if not self.redis_available or not session_id:
            return None
            
        try:
            progress_key = ONBOARDING_PROGRESS_KEY.format(session_id)
            progress_data = self.redis_client.hgetall(progress_key)
            
            if not progress_data:
                return None
                
            return progress_data
        except Exception as e:
            logger.error(f"Error getting progress for session {session_id}: {str(e)}")
            return None
    
    def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate a session and remove all associated data
        
        Args:
            session_id: The session ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.redis_available or not session_id:
            return False
            
        try:
            # Get user ID from session
            session_key = ONBOARDING_SESSION_KEY.format(session_id)
            user_id = self.redis_client.hget(session_key, "user_id")
            
            # Delete session and data
            self.redis_client.delete(session_key)
            self.redis_client.delete(ONBOARDING_DATA_KEY.format(session_id))
            self.redis_client.delete(ONBOARDING_PROGRESS_KEY.format(session_id))
            
            # Remove from user sessions
            if user_id:
                self.redis_client.srem(f"onboarding:user:{user_id}:sessions", session_id)
            
            logger.info(f"Invalidated session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error invalidating session {session_id}: {str(e)}")
            return False
    
    def sync_to_db(self, session_id: str, onboarding_progress_model) -> bool:
        """
        Sync Redis session data to the database
        
        Args:
            session_id: The session ID
            onboarding_progress_model: The OnboardingProgress model class
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.redis_available or not session_id:
            return False
            
        try:
            # Get session metadata
            session_key = ONBOARDING_SESSION_KEY.format(session_id)
            session_data = self.redis_client.hgetall(session_key)
            
            if not session_data:
                logger.warning(f"Session {session_id} not found for database sync")
                return False
                
            user_id = session_data.get("user_id")
            if not user_id:
                logger.warning(f"No user ID found in session {session_id}")
                return False
                
            # Get all onboarding data
            data_key = ONBOARDING_DATA_KEY.format(session_id)
            all_steps = self.redis_client.hgetall(data_key)
            
            if not all_steps:
                logger.warning(f"No step data found for session {session_id}")
                return False
                
            # Get progress data
            progress_key = ONBOARDING_PROGRESS_KEY.format(session_id)
            progress_data = self.redis_client.hgetall(progress_key)
            
            current_step = progress_data.get("current_step", "business-info")
            
            # Convert step data from JSON
            step_data = {}
            for step_key, step_json in all_steps.items():
                parsed_step = json.loads(step_json)
                step_data[step_key] = json.loads(parsed_step.get("data", "{}"))
                
            # Find or create OnboardingProgress
            from django.db import transaction as db_transaction
            
            with db_transaction.atomic():
                progress, created = onboarding_progress_model.objects.get_or_create(
                    user_id=user_id,
                    defaults={
                        "current_step": current_step,
                        "onboarding_status": current_step,
                        "metadata": step_data
                    }
                )
                
                if not created:
                    # Update existing progress
                    progress.current_step = current_step
                    progress.onboarding_status = current_step
                    progress.metadata = step_data
                    progress.updated_at = timezone.now()
                    progress.save()
                    
            logger.info(f"Synced session {session_id} to database for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error syncing session {session_id} to database: {str(e)}")
            return False

# Create a singleton instance
onboarding_session_service = OnboardingSessionService() 