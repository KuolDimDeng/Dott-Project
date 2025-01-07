# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/locks.py

import threading
import time
from contextlib import contextmanager
from typing import Optional
from django.core.cache import cache
from django.utils import timezone
from dateutil.parser import parse as parse_datetime
from pyfactor.logging_config import get_logger

logger = get_logger()

class LockAcquisitionError(Exception):
    """Raised when a lock cannot be acquired"""
    pass

class LockTimeoutError(Exception):
    """Raised when a lock operation times out"""
    pass

# Add the missing basic lock functions
def acquire_lock(key: str, timeout: Optional[int] = 30) -> bool:
    """
    Basic lock acquisition function
    """
    try:
        return cache.add(f"lock_{key}", True, timeout)
    except Exception as e:
        logger.error(f"Lock acquisition error: {str(e)}")
        return False

def release_lock(key: str) -> bool:
    """
    Basic lock release function
    """
    try:
        return cache.delete(f"lock_{key}")
    except Exception as e:
        logger.error(f"Lock release error: {str(e)}")
        return False

@contextmanager
def task_lock(key: str, timeout: Optional[int] = 30):
    """
    Context manager for basic task locking
    """
    lock_acquired = False
    try:
        lock_acquired = acquire_lock(key, timeout)
        yield lock_acquired
    finally:
        if lock_acquired:
            release_lock(key)


class DistributedLock:
    """
    Distributed lock implementation using Django's cache backend
    """
    
    def __init__(self, key: str, timeout: int = 30, retry_delay: float = 0.1):
        self.key = f"lock_{key}"
        self.timeout = timeout
        self.retry_delay = retry_delay
        self.acquired = False

    def acquire(self) -> bool:
        """
        Acquire lock with retry mechanism
        """
        start_time = time.time()
        
        while time.time() - start_time < self.timeout:
            try:
                acquired = cache.add(self.key, True, self.timeout)
                if acquired:
                    self.acquired = True
                    logger.debug(f"Lock acquired: {self.key}")
                    return True
                    
                time.sleep(self.retry_delay)
                
            except Exception as e:
                logger.error(f"Lock acquisition error: {str(e)}")
                raise LockAcquisitionError(str(e))
                
        logger.warning(f"Lock acquisition timeout: {self.key}")
        raise LockTimeoutError(f"Timeout acquiring lock: {self.key}")

    def release(self):
        """
        Release lock if acquired
        """
        if self.acquired:
            try:
                cache.delete(self.key)
                self.acquired = False
                logger.debug(f"Lock released: {self.key}")
                
            except Exception as e:
                logger.error(f"Lock release error: {str(e)}")
                raise

class ThreadLock:
    """
    Thread-level lock implementation
    """
    
    _locks = {}
    _lock_lock = threading.Lock()

    def __init__(self, key: str):
        self.key = key
        self.lock = self._get_or_create_lock()

    def _get_or_create_lock(self) -> threading.Lock:
        """Get existing lock or create new one"""
        with self._lock_lock:
            if self.key not in self._locks:
                self._locks[self.key] = threading.Lock()
            return self._locks[self.key]

    def acquire(self, timeout: Optional[float] = None) -> bool:
        """Acquire lock with timeout"""
        return self.lock.acquire(timeout=timeout)

    def release(self):
        """Release lock"""
        try:
            self.lock.release()
        except RuntimeError:
            pass  # Lock already released

@contextmanager
def distributed_lock(key: str, timeout: int = 30):
    """
    Context manager for distributed locking
    """
    lock = DistributedLock(key, timeout)
    try:
        lock.acquire()
        yield True
    finally:
        lock.release()

@contextmanager
def thread_lock(key: str, timeout: Optional[float] = None):
    """
    Context manager for thread-level locking
    """
    lock = ThreadLock(key)
    acquired = False
    
    try:
        acquired = lock.acquire(timeout=timeout)
        yield acquired
    finally:
        if acquired:
            lock.release()

class SetupLock:
    """
    Manages database setup locking to prevent concurrent setup attempts
    """
    def __init__(self, user_id: str):
        self.lock_key = f"database_setup_lock_{user_id}"
        self.user_id = user_id
        self.acquired = False
        
    def acquire(self) -> bool:
        """
        Attempts to acquire setup lock with proper timeout handling.
        Returns True if lock was acquired, False otherwise.
        """
        try:
            # Try to acquire lock with 30 second timeout
            acquired = cache.add(
                self.lock_key,
                timezone.now().isoformat(),
                timeout=30
            )
            
            if acquired:
                self.acquired = True
                logger.info(f"Setup lock acquired for user {self.user_id}")
                return True
                
            # Check if existing lock is stale
            lock_time = cache.get(self.lock_key)
            if lock_time:
                lock_age = timezone.now() - parse_datetime(lock_time)
                if lock_age.total_seconds() > 30:
                    # Clear stale lock and try again
                    cache.delete(self.lock_key)
                    return self.acquire()
                    
            return False
            
        except Exception as e:
            logger.error(f"Lock acquisition error: {str(e)}")
            return False

    def release(self):
        """Releases the setup lock"""
        try:
            if self.acquired:
                cache.delete(self.lock_key)
                self.acquired = False
                logger.info(f"Setup lock released for user {self.user_id}")
        except Exception as e:
            logger.error(f"Lock release error: {str(e)}")

    def __enter__(self):
        """Context manager entry"""
        return self.acquire()

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.release()

def get_setup_lock(user_id: str) -> SetupLock:
    """Helper function to create setup lock"""
    return SetupLock(user_id)

# Usage example:
def example_usage():
    # Using SetupLock as context manager
    with get_setup_lock("user123") as acquired:
        if acquired:
            # Do database setup work
            pass
    
    # Using distributed lock
    with distributed_lock("my_task", timeout=30) as acquired:
        if acquired:
            # Do work
            pass
    
    # Using thread lock
    with thread_lock("my_thread_task", timeout=10) as acquired:
        if acquired:
            # Do work
            pass