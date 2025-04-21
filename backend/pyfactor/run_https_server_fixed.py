#!/usr/bin/env python3
# /Users/kuoldeng/projectx/backend/pyfactor/run_https_server_fixed.py

# Add the site-packages from the virtual environment to path
import sys
import os
import site
venv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.venv')
if os.path.exists(venv_path):
    site_packages = os.path.join(venv_path, 'lib', 'python3.12', 'site-packages')
    if os.path.exists(site_packages) and site_packages not in sys.path:
        sys.path.insert(0, site_packages)

import uvicorn
import subprocess
import signal
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
CERT_FILE = CERT_DIR / 'localhost+1.pem'
KEY_FILE = CERT_DIR / 'localhost+1-key.pem'

# Check if certificates exist
if not CERT_FILE.exists() or not KEY_FILE.exists():
    logger.error(f"SSL certificates not found at {CERT_DIR}")
    logger.error(f"Expected certificate files: {CERT_FILE} and {KEY_FILE}")
    logger.error("Please ensure mkcert has been properly set up")
    sys.exit(1)

logger.info(f"Using SSL certificates from {CERT_DIR}")
logger.info(f"Certificate: {CERT_FILE}")
logger.info(f"Key: {KEY_FILE}")

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
    
    try:
        # Start Celery in the project directory
        process = subprocess.Popen(
            celery_command,
            env=env,
            cwd=project_dir
        )
        return process
    except Exception as e:
        logger.error(f"Failed to start Celery: {e}")
        # Return None if celery fails to start - we'll continue without it
        return None

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
        certfile=str(CERT_FILE),
        keyfile=str(KEY_FILE)
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
        ssl_certfile=str(CERT_FILE),  # SSL certificate file
        ssl_keyfile=str(KEY_FILE),    # SSL key file
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

# Simple function to run HTTPS server without Celery
def run_simple_https_server():
    """
    Run a simple HTTPS server without Celery for testing
    """
    logger.info("Starting simple HTTPS server without Celery")
    
    # Set environment variables for Uvicorn
    os.environ['PYTHONOPTIMIZE'] = '1'     # Enable basic optimizations
    os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'  # Ensure Django settings are set
    os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = 'true'  # Allow Django in async context
    
    # Set up uvicorn command line
    uvicorn_cmd = [
        "uvicorn",
        "pyfactor.asgi:application",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--ssl-keyfile", str(KEY_FILE),
        "--ssl-certfile", str(CERT_FILE)
    ]
    
    logger.info(f"Running command: {' '.join(uvicorn_cmd)}")
    
    try:
        # Start uvicorn as a subprocess
        process = subprocess.run(uvicorn_cmd)
        return process.returncode
    except Exception as e:
        logger.error(f"Error running uvicorn: {e}")
        return 1

def initialize_rls():
    """Initialize RLS tenant context parameter before starting the server"""
    try:
        logger.info("Initializing RLS tenant context parameter...")
        
        # Run the RLS initialization script
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_rls_on_startup.py")
        if not os.path.exists(script_path):
            logger.error(f"RLS initialization script not found at {script_path}")
            return False
            
        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logger.info("RLS initialization successful")
            return True
        else:
            logger.error(f"RLS initialization failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error initializing RLS: {e}")
        return False

def memory_usage_info():
    """Log memory usage information"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        memory_mb = process.memory_info().rss / 1024 / 1024
        system_percent = psutil.virtual_memory().percent
        logger.info(f"Initial memory usage: Process: {memory_mb:.2f}MB, System: {system_percent}%")
    except ImportError:
        logger.info("psutil not installed. Memory usage information not available.")

def start_celery_worker():
    """Start Celery worker with safer connection settings"""
    logger.info("Starting Celery worker with safer database connection settings")
    # Set environment variables for better DB connection behavior
    os.environ["DJANGO_CELERY_DB_SAFETY"] = "true"

def start_https_server():
    """Start Django with Uvicorn HTTPS server"""
    try:
        # Check if certificate files exist
        if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
            logger.error(f"SSL certificate files not found at {CERT_FILE} and {KEY_FILE}")
            return False
            
        logger.info(f"Using SSL certificates from {CERT_DIR}")
        logger.info(f"Certificate: {CERT_FILE}")
        logger.info(f"Key: {KEY_FILE}")
        
        # Log memory usage
        memory_usage_info()
        
        # Start Celery worker
        start_celery_worker()
        
        # Start Uvicorn with SSL
        logger.info("Starting Uvicorn with HTTPS support")
        logger.info("Server will be available at https://127.0.0.1:8000")
        
        # Use uvicorn directly for cleaner process management
        command = [
            "uvicorn", 
            "pyfactor.asgi:application", 
            "--host", "0.0.0.0",
            "--port", "8000",
            "--ssl-keyfile", KEY_FILE,
            "--ssl-certfile", CERT_FILE,
            "--reload"
        ]
        
        process = subprocess.Popen(command)
        return process
    except Exception as e:
        logger.error(f"Error starting HTTPS server: {e}")
        return None

def main():
    """Main entry point for the HTTPS server script"""
    # Initialize RLS first
    if not initialize_rls():
        logger.warning("RLS initialization had issues, but continuing with server startup")
        
    # Start the server
    server_process = start_https_server()
    
    if not server_process:
        logger.error("Failed to start HTTPS server")
        sys.exit(1)
        
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        logger.info("Shutting down server...")
        server_process.terminate()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Keep the script running until Ctrl+C
    try:
        server_process.wait()
    except KeyboardInterrupt:
        logger.info("Received Keyboard Interrupt. Shutting down...")
        server_process.terminate()

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
    
    try:
        # Try starting Celery worker (this will be None if it fails)
        celery_process_ref = start_celery()
        
        # If Celery fails to start, we'll just run without it
        if celery_process_ref is None:
            logger.warning("Failed to start Celery. Continuing without Celery worker.")
        
        # Try both methods to run the HTTPS server
        try:
            # Try the standard method first
            run_uvicorn_with_ssl()
        except Exception as e:
            logger.error(f"Error in standard Uvicorn startup: {e}")
            logger.info("Trying alternative method...")
            # If that fails, try the command-line method
            exit_code = run_simple_https_server()
            sys.exit(exit_code)
    except Exception as e:
        logger.error(f"Error in HTTPS server: {e}")
    finally:
        # Clean up resources on exit
        if 'celery_process_ref' in globals() and celery_process_ref:
            celery_process_ref.terminate()

    main() 