import os
import sys
import traceback
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('eb_application')
logger.setLevel(logging.DEBUG)  # Set to DEBUG for more verbose logging during deployment

# Add the project directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
path = os.path.dirname(current_dir)
if path not in sys.path:
    sys.path.insert(0, path)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Debug Python path
logger.info("Python path: %s", sys.path)
logger.info("Current directory: %s", current_dir)

# Make sure logs directory exists
logs_dir = os.path.join(current_dir, 'logs')
if not os.path.exists(logs_dir):
    try:
        os.makedirs(logs_dir)
        logger.info("Created logs directory at %s", logs_dir)
    except Exception as e:
        logger.warning("Failed to create logs directory: %s", str(e))

# Set the Django settings module - default to settings_eb.py for Elastic Beanstalk
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
logger.info("Using Django settings module: %s", os.environ.get('DJANGO_SETTINGS_MODULE'))

# Determine if we're running in the Elastic Beanstalk environment
IN_ELASTIC_BEANSTALK = 'EB_ENV_NAME' in os.environ
if IN_ELASTIC_BEANSTALK:
    logger.info("Running in Elastic Beanstalk environment: %s", os.environ.get('EB_ENV_NAME'))
else:
    logger.info("Not running in Elastic Beanstalk environment")

# Print environment variables for debugging (excluding sensitive info)
safe_vars = {k: v for k, v in os.environ.items() 
             if not any(secret in k.lower() for secret in ['password', 'secret', 'key', 'token'])}
logger.debug("Environment variables: %s", safe_vars)

# Preload dependencies to catch any import errors early
try:
    import django
    logger.info("Django version: %s", django.get_version())
    
    import psycopg2
    logger.info("psycopg2 installed")
    
    # Try to import other critical packages
    import redis
    logger.info("Redis installed")
    
except ImportError as e:
    logger.error("Failed to import required package: %s", str(e))
    logger.error(traceback.format_exc())

# Health check WSGI application
def application(environ, start_response):
    path = environ.get('PATH_INFO', '')

    # Handle health check endpoint
    if path == '/health/':
        logger.info("Health check request received")
        status = '200 OK'
        headers = [('Content-type', 'text/plain')]
        start_response(status, headers)
        return [b'Healthy']

    # For all other paths, try using Django
    try:
        logger.info(f"Processing request: {path}")
        from django.core.wsgi import get_wsgi_application
        
        # Initialize Django application
        try:
            django_app = get_wsgi_application()
            logger.info("Django WSGI application initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Django WSGI application: {str(e)}")
            logger.error(traceback.format_exc())
            raise
            
        return django_app(environ, start_response)
    except Exception as e:
        # Log the full traceback for debugging
        logger.error(f"Error in Django application: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Check for common errors and provide more specific error messages
        error_message = str(e).lower()
        if "database" in error_message or "db" in error_message or "sql" in error_message:
            logger.error("Database connection error detected. Check RDS settings and connectivity.")
        elif "redis" in error_message or "broker" in error_message:
            logger.error("Redis connection error detected. Check REDIS_HOST and REDIS_PORT settings.")
        elif "import" in error_message or "module" in error_message:
            logger.error("Python import error detected. Check installed dependencies.")
        elif "permission" in error_message or "access" in error_message:
            logger.error("Permission error detected. Check file and directory permissions.")

        # Fallback response for any errors
        status = '500 Internal Server Error'
        headers = [('Content-type', 'text/plain')]

        # Only show detailed error in non-production environments
        if not IN_ELASTIC_BEANSTALK or os.environ.get('DEBUG', 'False').lower() == 'true':
            error_message = f"Application Error: {str(e)}\n\n{traceback.format_exc()}"
            start_response(status, headers)
            return [error_message.encode('utf-8')]
        else:
            # In production, show a generic error message
            start_response(status, headers)
            return [b'Application Error. Please check the logs for details.']

if __name__ == '__main__':
    # For local testing
    from wsgiref.simple_server import make_server

    httpd = make_server('', 8000, application)
    print("Serving on port 8000...")
    httpd.serve_forever()
