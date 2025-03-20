#!/usr/bin/env python3
# /Users/kuoldeng/projectx/backend/pyfactor/run_server.py

import uvicorn
import subprocess
import signal
import sys
import os
import time
import psutil
import gc
import logging
import threading
from multiprocessing import Process

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('server.log')
    ]
)
logger = logging.getLogger('pyfactor-server')

# Memory monitoring settings
MEMORY_CHECK_INTERVAL = 60  # seconds
MEMORY_THRESHOLD = 90  # percent - increased to reduce frequent restarts
MAX_UVICORN_MEMORY = 2048  # MB
MAX_CELERY_MEMORY = 1536   # MB - increased from 1024MB to 1.5GB

def get_memory_usage():
    """
    Get current memory usage of the system and this process.
    Returns a dictionary with memory usage information.
    """
    process = psutil.Process(os.getpid())
    process_memory = process.memory_info().rss / (1024 * 1024)  # MB
    
    system_memory = psutil.virtual_memory()
    system_percent = system_memory.percent
    
    return {
        'process_memory_mb': process_memory,
        'system_memory_percent': system_percent,
        'system_memory_available_mb': system_memory.available / (1024 * 1024),
        'system_memory_total_mb': system_memory.total / (1024 * 1024)
    }

def monitor_memory(celery_process):
    """
    Monitor memory usage and restart processes if they exceed thresholds.
    This helps prevent memory leaks from causing system-wide issues.
    """
    logger.info("Starting memory monitoring thread")
    
    while True:
        try:
            memory_info = get_memory_usage()
            
            # Log memory usage periodically
            logger.info(f"Memory usage: Process: {memory_info['process_memory_mb']:.2f}MB, "
                       f"System: {memory_info['system_memory_percent']}%")
            
            # Check if memory usage is too high
            if memory_info['system_memory_percent'] > MEMORY_THRESHOLD:
                logger.warning(f"High memory usage detected: {memory_info['system_memory_percent']}%")
                
                # Force garbage collection
                collected = gc.collect()
                logger.info(f"Forced garbage collection: {collected} objects collected")
                
                # If still high after garbage collection, restart Celery
                if psutil.virtual_memory().percent > MEMORY_THRESHOLD and celery_process:
                    logger.warning("Restarting Celery worker due to high memory usage")
                    restart_celery(celery_process)
            
            # Sleep for the check interval
            time.sleep(MEMORY_CHECK_INTERVAL)
            
        except Exception as e:
            logger.error(f"Error in memory monitoring: {e}")
            time.sleep(MEMORY_CHECK_INTERVAL)

def restart_celery(celery_process):
    """
    Restart the Celery worker process to free up memory.
    This is a graceful restart that allows tasks to complete.
    """
    if celery_process and celery_process.poll() is None:
        logger.info("Gracefully stopping Celery worker...")
        celery_process.terminate()
        
        # Wait for process to terminate
        try:
            celery_process.wait(timeout=30)
        except subprocess.TimeoutExpired:
            logger.warning("Celery worker did not terminate gracefully, forcing...")
            celery_process.kill()
        
        # Start a new Celery process
        new_process = start_celery()
        
        # Update the global reference
        global celery_process_ref
        celery_process_ref = new_process
        
        logger.info("Celery worker restarted successfully")
        return new_process
    
    return celery_process

def start_celery():
    """
    Starts Celery worker with optimized settings for database operations.
    The settings are tuned for reliability, resource management, and memory efficiency.
    """
    # Get the absolute path to the project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set up environment variables with memory optimizations
    env = os.environ.copy()
    env['PYTHONPATH'] = project_dir
    env['PYTHONUNBUFFERED'] = '1'  # Disable output buffering
    env['PYTHONOPTIMIZE'] = '1'    # Enable basic optimizations
    env['CELERY_WORKER_HIJACK_ROOT_LOGGER'] = 'False'  # Prevent logger hijacking
    # env['CELERY_WORKER_MAX_MEMORY_PER_CHILD'] = str(MAX_CELERY_MEMORY * 1000)  # KB - removed this setting
    
    # Enable fault handler for better debugging
    env['PYTHONFAULTHANDLER'] = '1'
    
    # Add database connection cleanup
    env['DJANGO_DB_CLOSE_OLD_CONNECTIONS'] = 'True'
    
    celery_command = [
        'celery',
        '-A', 'pyfactor',
        'worker',
        '--loglevel=INFO',
        '--concurrency=1',              # Single worker to avoid concurrent DB connections
        '--max-tasks-per-child=1',      # Restart after each task to prevent memory leaks
        '--pool=solo',                  # Use solo pool instead of prefork to avoid connection issues
        '--task-events',                # Enable task event monitoring
        '--without-gossip',             # Disable gossip for less network overhead
        '--without-mingle',             # Disable mingle for faster startup
        '-Q', 'default,setup,onboarding'  # Specify queues for different task types
    ]
    
    logger.info("Starting Celery worker with safer database connection settings")
    
    # Start Celery in the project directory
    return subprocess.Popen(
        celery_command,
        env=env,
        cwd=project_dir
    )

def run_uvicorn():
    """
    Starts Uvicorn ASGI server with memory-optimized settings.
    Configures logging, reload behavior, and memory limits for better stability.
    """
    # Set environment variables for Uvicorn
    os.environ['PYTHONOPTIMIZE'] = '1'     # Enable basic optimizations
    
    # Force garbage collection before starting server
    gc.collect()
    
    # Configure Uvicorn with memory optimizations
    config = uvicorn.Config(
        "pyfactor.asgi:application",
        host="0.0.0.0",
        port=8000,
        reload=True,        # Enable auto-reload for development
        log_level="info",   # Reduced logging to save memory
        workers=1,          # Single worker for development
        limit_concurrency=20,  # Reduced from 50 to lower connection load
        timeout_keep_alive=15,  # Reduced from 30 to close connections faster
        loop="auto",        # Use the best available event loop
        http="h11",         # Use h11 for HTTP protocol (more memory efficient)
        proxy_headers=True, # Process proxy headers
        server_header=False, # Don't send server header to save bandwidth
    )
    
    logger.info("Starting Uvicorn with safer database connection settings")
    
    # Start Uvicorn server
    server = uvicorn.Server(config)
    server.run()

def handle_shutdown(signum, frame):
    """
    Handles graceful shutdown of both Uvicorn and Celery processes.
    Ensures clean termination of database connections and background tasks.
    """
    logger.info("Initiating graceful shutdown...")
    
    # Force garbage collection to clean up memory
    gc.collect()
    
    # Terminate Celery process
    global celery_process_ref
    if celery_process_ref and celery_process_ref.poll() is None:
        logger.info("Stopping Celery worker...")
        celery_process_ref.terminate()
        try:
            celery_process_ref.wait(timeout=10)
        except subprocess.TimeoutExpired:
            logger.warning("Celery worker did not terminate gracefully, forcing...")
            celery_process_ref.kill()
    
    logger.info("Shutdown complete")
    sys.exit(0)

if __name__ == "__main__":
    # Enable garbage collection optimization
    gc.enable()
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    # Log initial memory usage
    initial_memory = get_memory_usage()
    logger.info(f"Initial memory usage: Process: {initial_memory['process_memory_mb']:.2f}MB, "
               f"System: {initial_memory['system_memory_percent']}%")
    
    # Start Celery worker
    celery_process_ref = start_celery()
    
    # Memory monitoring is disabled temporarily to see if it's causing issues
    # Comment out this block to re-enable it later
    """
    memory_thread = threading.Thread(
        target=monitor_memory,
        args=(celery_process_ref,),
        daemon=True
    )
    memory_thread.start()
    """
    
    try:
        # Start Uvicorn (this will block until server stops)
        run_uvicorn()
    except Exception as e:
        logger.error(f"Error in Uvicorn server: {e}")
    finally:
        # Ensure Celery is cleaned up
        if celery_process_ref and celery_process_ref.poll() is None:
            logger.info("Cleaning up Celery worker...")
            celery_process_ref.terminate()
            try:
                celery_process_ref.wait(timeout=10)
            except subprocess.TimeoutExpired:
                celery_process_ref.kill()
        
        # Final garbage collection
        gc.collect()