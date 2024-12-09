# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/locks.py

import threading
import asyncio
import time
from contextlib import contextmanager, asynccontextmanager
from typing import Optional
from django.core.cache import cache
from pyfactor.logging_config import get_logger

logger = get_logger()

class LockAcquisitionError(Exception):
    """Raised when a lock cannot be acquired"""
    pass

class LockTimeoutError(Exception):
    """Raised when a lock operation times out"""
    pass

class DistributedLock:
    """
    Distributed lock implementation using Django's cache backend
    """
    
    def __init__(self, key: str, timeout: int = 30, retry_delay: float = 0.1):
        self.key = f"lock_{key}"
        self.timeout = timeout
        self.retry_delay = retry_delay
        self.acquired = False

    async def acquire(self) -> bool:
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
                    
                await asyncio.sleep(self.retry_delay)
                
            except Exception as e:
                logger.error(f"Lock acquisition error: {str(e)}")
                raise LockAcquisitionError(str(e))
                
        logger.warning(f"Lock acquisition timeout: {self.key}")
        raise LockTimeoutError(f"Timeout acquiring lock: {self.key}")

    async def release(self):
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

@asynccontextmanager
async def distributed_lock(key: str, timeout: int = 30):
    """
    Async context manager for distributed locking
    """
    lock = DistributedLock(key, timeout)
    try:
        await lock.acquire()
        yield True
    finally:
        await lock.release()

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

async def acquire_lock(key: str, timeout: Optional[float] = None) -> bool:
    return cache.add(f"lock_{key}", True, timeout or 30)

async def release_lock(key: str):
    cache.delete(f"lock_{key}")

@asynccontextmanager
async def task_lock(key: str, timeout: Optional[float] = None):
    """
    Context manager for task locking
    """
    acquired = False
    try:
        acquired = acquire_lock(key, timeout)
        yield acquired
    finally:
        if acquired:
            release_lock(key)

# Usage example:
async def example_usage():
    # Distributed lock
    async with distributed_lock("my_task", timeout=30) as acquired:
        if acquired:
            # Do work
            pass
    
    # Thread lock
    with thread_lock("my_thread_task", timeout=10) as acquired:
        if acquired:
            # Do work
            pass
    
    # Task lock
    with task_lock("my_specific_task", timeout=5) as acquired:
        if acquired:
            # Do work
            pass