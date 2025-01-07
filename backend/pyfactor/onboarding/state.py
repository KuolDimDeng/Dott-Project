from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from pyfactor.logging_config import get_logger
from .models import OnboardingProgress
from asgiref.sync import sync_to_async
from typing import Optional, Dict, Any


logger = get_logger()

class DatabaseSetupState:
    """Manages state tracking for database setup operations"""
    
    def __init__(self, user_id: str):
        self.cache_key = f"setup_state_{user_id}"
        self.user_id = user_id
        
    def save_state(self, state: dict):
        """Saves the current setup state with expiration"""
        state['last_updated'] = timezone.now().isoformat()
        cache.set(self.cache_key, state, timeout=3600)
        logger.debug(f"Saved setup state for user {self.user_id}: {state}")
        
    def get_state(self) -> Optional[dict]:
        """Retrieves the current setup state if it exists"""
        state = cache.get(self.cache_key)
        logger.debug(f"Retrieved setup state for user {self.user_id}: {state}")
        return state
        
    def clear_state(self):
        """Removes the setup state"""
        cache.delete(self.cache_key)
        logger.debug(f"Cleared setup state for user {self.user_id}")

class OnboardingStateManager:
    """
    Manages onboarding state transitions with comprehensive validation and logging.
    Handles async database operations and state management safely.
    """
    
    # Define valid states for the onboarding process
    STATES = {
        'INITIAL': 'step1',
        'PLAN_SELECTION': 'step2',
        'PAYMENT': 'step3',
        'SETUP': 'step4',
        'COMPLETE': 'complete'
    }
    
    # Define allowed transitions between states
    VALID_TRANSITIONS = {
        'step1': ['step2'],
        'step2': ['step3', 'step4'],  # Allow both step3 and step4 from step2
        'step3': ['step4'],
        'step4': ['complete'],
        'complete': []
    }

    def __init__(self, user):
        """
        Initialize the state manager with a user.
        Note: Database operations are moved to async methods to prevent blocking.
        """
        self.user = user
        self.current_state = None
        self.last_transition = None
        self.setup_state = DatabaseSetupState(str(user.id))

    @sync_to_async
    def initialize(self) -> None:
        """
        Async initialization of state manager.
        Fetches initial state from database and validates it.
        """
        try:
            progress = OnboardingProgress.objects.get(user=self.user)
            self.current_state = progress.onboarding_status
            
            if self.current_state not in self.VALID_TRANSITIONS:
                raise ValidationError(f"Invalid initial state: {self.current_state}")
                
            self.last_transition = timezone.now()
            logger.debug(f"State manager initialized with state: {self.current_state}")
            
        except OnboardingProgress.DoesNotExist:
            logger.error(f"No onboarding progress found for user: {self.user.id}")
            raise ValidationError("No onboarding progress found")
        except Exception as e:
            logger.error(f"Error initializing state manager: {str(e)}")
            raise

    @sync_to_async
    def get_current_state(self) -> Optional[str]:
        """
        Async method to get current state from database.
        Returns None if no state is found or on error.
        """
        try:
            progress = OnboardingProgress.objects.get(user=self.user)
            return progress.onboarding_status
        except OnboardingProgress.DoesNotExist:
            logger.error(f"No onboarding progress found for user: {self.user.id}")
            return None
        except Exception as e:
            logger.error(f"Error getting current state: {str(e)}")
            return None

    async def validate_transition(self, next_state: str, plan_type: Optional[str] = None) -> bool:
        """
        Async validation of state transitions with comprehensive checks.
        Ensures transitions follow defined rules and plan-specific requirements.
        """
        try:
            # Ensure we have current state
            if self.current_state is None:
                self.current_state = await self.get_current_state()
                if self.current_state is None:
                    raise ValidationError("Cannot validate transition: no current state")

            # Validate current and next states
            if self.current_state not in self.VALID_TRANSITIONS:
                raise ValidationError(f"Invalid current state: {self.current_state}")
            
            if next_state not in self.STATES.values():
                raise ValidationError(f"Invalid next state: {next_state}")
            
            # Handle special case for Basic plan
            if self.current_state == 'step2' and next_state == 'step4':
                if plan_type != 'Basic':
                    raise ValidationError(
                        "Direct transition to step4 is only allowed for Basic plan"
                    )

            # Validate transition is allowed
            valid_transitions = self.VALID_TRANSITIONS[self.current_state]
            if next_state not in valid_transitions:
                raise ValidationError(
                    f"Invalid transition from {self.current_state} to {next_state}. "
                    f"Valid transitions are: {valid_transitions}"
                )

            logger.debug(
                f"Validated transition from {self.current_state} to {next_state}",
                extra={
                    'current_state': self.current_state,
                    'next_state': next_state,
                    'plan_type': plan_type,
                    'valid_transitions': valid_transitions
                }
            )
            return True

        except ValidationError as e:
            logger.warning(
                f"Transition validation failed: {str(e)}",
                extra={
                    'current_state': self.current_state,
                    'attempted_state': next_state,
                    'plan_type': plan_type,
                    'error': str(e)
                }
            )
            raise

    @sync_to_async
    def _execute_transition(self, next_state: str) -> bool:
        """
        Execute the state transition in the database within a transaction.
        """
        try:
            with transaction.atomic():
                progress = OnboardingProgress.objects.select_for_update().get(user=self.user)
                progress.onboarding_status = next_state
                progress.last_updated = timezone.now()
                progress.save()
            return True
        except Exception as e:
            logger.error(f"Database transition failed: {str(e)}")
            return False

    async def transition(self, next_state: str, plan_type: Optional[str] = None) -> bool:
        """
        Async method to execute state transition with validation and logging.
        """
        try:
            # Ensure we're initialized
            if self.current_state is None:
                await self.initialize()
                
            # Validate the transition first
            await self.validate_transition(next_state, plan_type)
            previous_state = self.current_state
            
            # Execute the transition
            success = await self._execute_transition(next_state)
            if not success:
                return False
            
            # Update internal state
            self.current_state = next_state
            self.last_transition = timezone.now()

            # Clear setup state if transitioning to complete
            if next_state == 'complete':
                self.setup_state.clear_state()

            logger.info(
                f"State transition successful: {previous_state} -> {next_state}",
                extra={
                    'from_state': previous_state,
                    'to_state': next_state,
                    'plan_type': plan_type,
                    'user_id': self.user.id,
                    'timestamp': self.last_transition.isoformat()
                }
            )
            return True

        except ValidationError as e:
            logger.error(f"State transition failed: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during transition: {str(e)}")
            return False

    async def can_transition_to(self, target_state: str) -> bool:
        """
        Async method to check if a target state is reachable from current state.
        """
        try:
            # Ensure we have current state
            if self.current_state is None:
                self.current_state = await self.get_current_state()
                if self.current_state is None:
                    return False

            if target_state == self.current_state:
                return True

            if target_state in self.VALID_TRANSITIONS[self.current_state]:
                return True

            # Check for reachability through intermediate states
            current = self.current_state
            visited = {current}
            
            while True:
                next_possible = self.VALID_TRANSITIONS[current]
                if not next_possible:
                    break
                    
                if target_state in next_possible:
                    return True
                    
                for next_state in next_possible:
                    if next_state not in visited:
                        visited.add(next_state)
                        current = next_state
                        break
                else:
                    break

            return False

        except Exception as e:
            logger.error(
                f"Error checking transition possibility: {str(e)}",
                extra={'user_id': self.user.id}
            )
            return False

    async def get_state_info(self) -> Optional[Dict[str, Any]]:
        """
        Async method to get current state information.
        """
        try:
            # Ensure we have current state
            if self.current_state is None:
                self.current_state = await self.get_current_state()
                if self.current_state is None:
                    return None

            return {
                'current_state': self.current_state,
                'valid_transitions': self.VALID_TRANSITIONS.get(self.current_state, []),
                'last_transition': self.last_transition,
                'is_complete': self.current_state == 'complete',
                'user_id': self.user.id
            }
        except Exception as e:
            logger.error(f"Error getting state info: {str(e)}")
            return None

    async def get_setup_state(self) -> Optional[Dict[str, Any]]:
        """
        Async method to get current database setup state.
        """
        try:
            return self.setup_state.get_state()
        except Exception as e:
            logger.error(f"Error getting setup state: {str(e)}")
            return None

    async def update_setup_state(self, state: Dict[str, Any]) -> bool:
        """
        Async method to update database setup state.
        """
        try:
            self.setup_state.save_state(state)
            return True
        except Exception as e:
            logger.error(f"Error updating setup state: {str(e)}")
            return False

    async def clear_setup_state(self) -> bool:
        """
        Async method to clear database setup state.
        """
        try:
            self.setup_state.clear_state()
            return True
        except Exception as e:
            logger.error(f"Error clearing setup state: {str(e)}")
            return False
