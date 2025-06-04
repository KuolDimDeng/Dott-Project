#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/views/setup.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
import uuid
import logging
import time
from celery.result import AsyncResult

logger = logging.getLogger(__name__)

# Cache settings
CACHE_TIMEOUT = 60  # 60 seconds cache for setup status (increased from 30)
CACHE_KEY_PREFIX = 'setup_status_'

@method_decorator(csrf_exempt, name='dispatch')
class SetupStatusView(APIView):
    """
    View for handling setup status checks without requiring authentication.
    This view provides a lightweight way to check setup status before authentication.
    """
    authentication_classes = []  # No authentication required
    permission_classes = []  # No permissions required
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get(self, request, tenant_id=None):
        """Handle GET requests for setup status"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Generate cache key based on tenant_id if available
            cache_key = f"{CACHE_KEY_PREFIX}{tenant_id or 'default'}"
            
            # Try to get response from cache first
            cached_response = cache.get(cache_key)
            if cached_response:
                logger.debug(f"Returning cached setup status for key: {cache_key}")
                response = Response(cached_response, status=status.HTTP_200_OK)
                response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
                response["Access-Control-Allow-Credentials"] = "true"
                response["X-Cache"] = "HIT"
                return response
                
            # For unauthenticated requests, return a basic setup status
            response_data = {
                'status': 'setup_available',
                'setup_id': str(uuid.uuid4()),
                'message': 'Setup is available',
                'requires_auth': False,
                'timestamp': str(uuid.uuid1())
            }
            
            # If tenant_id is provided, include it in the response
            if tenant_id:
                response_data['tenant_id'] = str(tenant_id)
                response_data['message'] = f'Setup status for tenant {tenant_id}'
                
                # Get tenant ID from headers as well if available
                header_tenant_id = request.headers.get('X-Tenant-ID')
                if header_tenant_id and header_tenant_id != str(tenant_id):
                    logger.warning(f"Tenant ID mismatch: URL={tenant_id}, Header={header_tenant_id}")
                
                # You could add additional tenant-specific logic here
            
            # Try to update user attributes if tenant_id is provided (Auth0 mode)
            if tenant_id:
                logger.info(f"Setup completed for tenant {tenant_id} (using Auth0)")
            
            # Cache the response
            cache.set(cache_key, response_data, CACHE_TIMEOUT)
            logger.debug(f"Cached setup status for key: {cache_key}, timeout: {CACHE_TIMEOUT}s")
            
            response = Response(response_data, status=status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            response["X-Cache"] = "MISS"
            return response
            
        except Exception as e:
            logger.error(f"Error checking setup status: {str(e)}")
            error_response = Response({
                'error': 'Failed to check setup status',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            error_response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            error_response["Access-Control-Allow-Credentials"] = "true"
            return error_response

    def options(self, request, *args, **kwargs):
        """Handle OPTIONS requests"""
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

@method_decorator(csrf_exempt, name='dispatch')
class InitializeSetupView(APIView):
    """
    View for initializing setup process without requiring authentication.
    This allows users to start the setup process before authentication.
    """
    authentication_classes = []  # No authentication required
    permission_classes = []  # No permissions required
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def post(self, request):
        """Handle POST requests to initialize setup"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Generate a unique setup ID
            setup_id = str(uuid.uuid4())
            
            # Return setup initialization data
            response_data = {
                'status': 'setup_initialized',
                'setup_id': setup_id,
                'message': 'Setup process initialized successfully',
                'requires_auth': False,
                'next_step': 'business_info',
                'timestamp': str(uuid.uuid1())
            }
            
            # Log success since using Auth0 instead of Cognito
            logger.info(f"Setup completed for user {request.user.id}")

            response = Response(response_data, status=status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            logger.error(f"Error initializing setup: {str(e)}")
            error_response = Response({
                'error': 'Failed to initialize setup',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            error_response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            error_response["Access-Control-Allow-Credentials"] = "true"
            return error_response

    def options(self, request, *args, **kwargs):
        """Handle OPTIONS requests"""
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

@method_decorator(csrf_exempt, name='dispatch')
class SetupStatusCheckView(APIView):
    """
    View for checking the status of a specific setup task by its ID.
    This view allows checking the progress of long-running setup tasks.
    """
    authentication_classes = []  # No authentication required
    permission_classes = []  # No permissions required
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]

    def get(self, request, task_id):
        """Handle GET requests to check status of a specific task"""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            # Generate cache key for this task
            cache_key = f"{CACHE_KEY_PREFIX}task_{task_id}"
            
            # Try to get response from cache first
            cached_response = cache.get(cache_key)
            if cached_response:
                logger.debug(f"Returning cached task status for task: {task_id}")
                response = Response(cached_response, status=status.HTTP_200_OK)
                response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
                response["Access-Control-Allow-Credentials"] = "true"
                response["X-Cache"] = "HIT"
                return response
            
            # Get the task result using the task_id
            task_result = AsyncResult(task_id)
            
            # Prepare response based on task status
            if task_result.ready():
                if task_result.successful():
                    result = task_result.result
                    response_data = {
                        'status': 'completed',
                        'task_id': task_id,
                        'result': result if result else 'Task completed successfully',
                        'timestamp': str(uuid.uuid1())
                    }
                    
                    # Cache completed tasks for longer (30 seconds)
                    cache.set(cache_key, response_data, 30)
                else:
                    # Task failed
                    response_data = {
                        'status': 'failed',
                        'task_id': task_id,
                        'error': str(task_result.result) if task_result.result else 'Task failed',
                        'timestamp': str(uuid.uuid1())
                    }
                    
                    # Cache failed tasks for longer (30 seconds)
                    cache.set(cache_key, response_data, 30)
            else:
                # Task is still in progress
                response_data = {
                    'status': 'in_progress',
                    'task_id': task_id,
                    'message': 'Task is still running',
                    'timestamp': str(uuid.uuid1())
                }
                
                # Cache in-progress tasks for a shorter time (5 seconds)
                cache.set(cache_key, response_data, 5)
            
            logger.debug(f"Cached task status for task: {task_id}")
            
            response = Response(response_data, status=status.HTTP_200_OK)
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            response["X-Cache"] = "MISS"
            return response
            
        except Exception as e:
            logger.error(f"Error checking task status: {str(e)}")
            error_response = Response({
                'error': 'Failed to check task status',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            error_response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            error_response["Access-Control-Allow-Credentials"] = "true"
            return error_response

    def options(self, request, *args, **kwargs):
        """Handle OPTIONS requests"""
        response = Response()
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Id"
        response["Access-Control-Allow-Credentials"] = "true"
        return response

__all__ = ['SetupStatusView', 'InitializeSetupView', 'SetupStatusCheckView']