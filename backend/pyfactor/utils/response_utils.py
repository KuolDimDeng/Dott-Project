from rest_framework.response import Response
from rest_framework import status


def create_success_response(message=None, data=None, status_code=status.HTTP_200_OK):
    """
    Create a standardized success response
    """
    response_data = {
        'success': True,
        'status': 'success'
    }
    
    if message:
        response_data['message'] = message
    
    if data is not None:
        response_data['data'] = data
    
    return Response(response_data, status=status_code)


def create_error_response(message, data=None, status_code=status.HTTP_400_BAD_REQUEST):
    """
    Create a standardized error response
    """
    response_data = {
        'success': False,
        'status': 'error',
        'message': message
    }
    
    if data is not None:
        response_data['data'] = data
    
    return Response(response_data, status=status_code)