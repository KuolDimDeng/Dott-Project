# /Users/kuoldeng/projectx/backend/pyfactor/run_server.py

import uvicorn
import subprocess
import signal
import sys
import os
from multiprocessing import Process

def start_celery():
    """
    Starts Celery worker with optimized settings for database operations.
    The settings are tuned for reliability and resource management.
    """
    celery_command = [
        'celery',
        '-A', 'pyfactor',
        'worker',
        '--loglevel=INFO',
        '--concurrency=2',              # Limit concurrent tasks for database safety
        '--max-tasks-per-child=50',     # Restart workers periodically to prevent memory leaks
        '--max-memory-per-child=512000', # Limit memory usage per worker
        '--task-events',                # Enable task event monitoring
        '-Q', 'default,setup,onboarding'  # Specify queues for different task types
    ]
    return subprocess.Popen(celery_command)

def run_uvicorn():
    """
    Starts Uvicorn ASGI server with appropriate settings for development.
    Configures logging and reload behavior for better debugging.
    """
    uvicorn.run(
        "pyfactor.asgi:application",
        host="0.0.0.0",
        port=8000,
        reload=True,        # Enable auto-reload for development
        log_level="info",   # Changed from debug to reduce noise
        workers=1           # Single worker for development
    )

def handle_shutdown(signum, frame):
    """
    Handles graceful shutdown of both Uvicorn and Celery processes.
    Ensures clean termination of database connections and background tasks.
    """
    print("\nInitiating graceful shutdown...")
    if celery_process:
        celery_process.terminate()
        celery_process.wait()
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    # Start Celery worker
    celery_process = start_celery()
    
    try:
        # Start Uvicorn (this will block until server stops)
        run_uvicorn()
    finally:
        # Ensure Celery is cleaned up
        if celery_process:
            celery_process.terminate()
            celery_process.wait()