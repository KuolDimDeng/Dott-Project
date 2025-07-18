"""
Basic test view with no external imports
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from pyfactor.logging_config import get_logger

logger = get_logger()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_basic_endpoint(request):
    """Ultra basic test endpoint"""
    logger.info(f"[TestBasic] === BASIC TEST REACHED ===")
    logger.info(f"[TestBasic] User: {request.user}")
    logger.info(f"[TestBasic] User email: {request.user.email}")
    
    return Response({
        "test": "Basic endpoint works",
        "user_email": request.user.email,
        "user_id": str(request.user.id)
    })