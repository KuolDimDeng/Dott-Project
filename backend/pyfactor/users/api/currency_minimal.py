"""
Minimal currency endpoint to bypass all complexity
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def currency_minimal(request):
    """Ultra-minimal endpoint to test basic connectivity"""
    
    # Get request info
    method = request.method
    path = request.path
    
    # Get user info if available
    user_info = "Not authenticated"
    if hasattr(request, 'user') and request.user.is_authenticated:
        user_info = f"User: {request.user.email}"
    
    # Get session info
    session_info = "No session"
    if 'HTTP_AUTHORIZATION' in request.META:
        session_info = f"Auth header: {request.META['HTTP_AUTHORIZATION'][:20]}..."
    
    if method == 'GET':
        return JsonResponse({
            'success': True,
            'message': 'Minimal endpoint working',
            'method': method,
            'path': path,
            'user': user_info,
            'session': session_info,
            'preferences': {
                'currency_code': 'USD',
                'currency_name': 'US Dollar',
                'currency_symbol': '$'
            }
        })
    
    elif method == 'PUT':
        try:
            body = json.loads(request.body) if request.body else {}
        except:
            body = {}
        
        return JsonResponse({
            'success': True,
            'message': 'PUT received',
            'received': body,
            'user': user_info
        })
    
    return JsonResponse({
        'error': 'Method not allowed',
        'method': method
    }, status=405)