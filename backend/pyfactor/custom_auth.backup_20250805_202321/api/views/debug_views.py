"""
Debug endpoint for checking user session state
Created by Version0008_fix_paid_user_auth_issues.py
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

class DebugSessionStateView(APIView):
    """
    Debug endpoint to check complete user session state
    GET /api/debug/session-state/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get complete session state for debugging"""
        try:
            # Simplified version to avoid import issues
            user = request.user
            
            response_data = {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'auth0_sub': getattr(user, 'auth0_sub', None),
                    'tenant_id': str(user.tenant.id) if hasattr(user, 'tenant') and user.tenant else None,
                },
                'message': 'Debug endpoint temporarily simplified due to import issues',
                'request_info': {
                    'has_auth_token': bool(request.auth),
                    'headers': {
                        'authorization': 'present' if request.META.get('HTTP_AUTHORIZATION') else 'missing',
                        'x-tenant-id': request.META.get('HTTP_X_TENANT_ID'),
                    }
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Debug endpoint error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
