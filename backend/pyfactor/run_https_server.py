#!/usr/bin/env python3
# /Users/kuoldeng/projectx/backend/pyfactor/run_https_server.py

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
import ssl
from pathlib import Path
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
logger = logging.getLogger('pyfactor-https-server')

# Memory monitoring settings
MEMORY_CHECK_INTERVAL = 60  # seconds
MEMORY_THRESHOLD = 90  # percent - increased to reduce frequent restarts
MAX_UVICORN_MEMORY = 2048  # MB
MAX_CELERY_MEMORY = 1536   # MB - increased from 1024MB to 1.5GB

# SSL Certificate paths
CERT_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent / 'certificates'
SSL_CERT_FILE = CERT_DIR / 'localhost+1.pem'
SSL_KEY_FILE = CERT_DIR / 'localhost+1-key.pem'

# Check if certificates exist
if not SSL_CERT_FILE.exists() or not SSL_KEY_FILE.exists():
    logger.error(f"SSL certificates not found at {CERT_DIR}")
    logger.error(f"Expected certificate files: {SSL_CERT_FILE} and {SSL_KEY_FILE}")
    logger.error("Please ensure mkcert has been properly set up")
    sys.exit(1)

logger.info(f"Using SSL certificates from {CERT_DIR}")
logger.info(f"Certificate: {SSL_CERT_FILE}")
logger.info(f"Key: {SSL_KEY_FILE}")

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

def run_uvicorn_with_ssl():
    """
    Starts Uvicorn ASGI server with SSL/HTTPS support using mkcert certificates.
    Configures logging, reload behavior, and memory limits for better stability.
    """
    # Set environment variables for Uvicorn
    os.environ['PYTHONOPTIMIZE'] = '1'     # Enable basic optimizations
    os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'  # Ensure Django settings are set
    os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = 'true'  # Allow Django in async context
    
    # Force garbage collection before starting server
    gc.collect()
    
    # Create SSL context for HTTPS
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(
        certfile=str(SSL_CERT_FILE),
        keyfile=str(SSL_KEY_FILE)
    )
    
    # Configure Uvicorn with SSL and memory optimizations
    config = uvicorn.Config(
        "pyfactor.asgi:application",  # Changed from application factory to direct application
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
        factory=False,      # Use direct application instead of factory
        ssl_certfile=str(SSL_CERT_FILE),  # SSL certificate file
        ssl_keyfile=str(SSL_KEY_FILE),    # SSL key file
    )
    
    logger.info("Starting Uvicorn with HTTPS support")
    logger.info(f"Server will be available at https://127.0.0.1:8000")
    
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
    
    try:
        # Start Uvicorn with SSL (this will block until server stops)
        run_uvicorn_with_ssl()
    except Exception as e:
        logger.error(f"Error in Uvicorn server: {e}")
    finally:
        # Clean up resources on exit
        if 'celery_process_ref' in globals() and celery_process_ref:
            celery_process_ref.terminate() 