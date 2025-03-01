import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for REST framework that handles Cognito-specific errors.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if isinstance(exc, ClientError):
        error_code = exc.response['Error']['Code']
        if error_code == 'NotAuthorizedException':
            logger.warning(f"Authentication failed: {str(exc)}")
            return AuthenticationFailed('Invalid token or token expired')
        elif error_code == 'InvalidParameterException':
            logger.warning(f"Invalid parameters: {str(exc)}")
            return AuthenticationFailed('Invalid authentication parameters')
        else:
            logger.error(f"Cognito error: {str(exc)}")
            return AuthenticationFailed('Authentication failed')

    # Return the original response
    return response