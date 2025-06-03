# In a new file, e.g., utils/error_handling.py
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        logger.error(f"Error occurred: {exc}", exc_info=True)
        response.data['status_code'] = response.status_code
    else:
        logger.critical(f"Unhandled exception: {exc}", exc_info=True)
        response = Response(
            {"detail": "A server error occurred."},
            status=500
        )

    return response