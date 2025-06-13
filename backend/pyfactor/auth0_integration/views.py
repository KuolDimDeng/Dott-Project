# Add this view to the existing auth0_integration/views.py file

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import OnboardingProgress

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_onboarding_status(request):
    """
    Lightweight endpoint to check if user has completed onboarding.
    Used by frontend middleware to enforce onboarding.
    """
    try:
        user = request.user
        
        # Check if user has completed onboarding
        onboarding_completed = False
        tenant_id = None
        
        # Check OnboardingProgress model
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
            onboarding_completed = onboarding.is_complete
        except OnboardingProgress.DoesNotExist:
            # If no onboarding record exists, user hasn't started onboarding
            onboarding_completed = False
        
        # Get tenant ID if user has one
        if hasattr(user, 'tenant') and user.tenant:
            tenant_id = str(user.tenant.id)
        
        return Response({
            'onboarding_completed': onboarding_completed,
            'tenant_id': tenant_id,
            'user_id': str(user.id),
            'auth0_sub': user.auth0_sub,
        })
        
    except Exception as e:
        logger.error(f"Error checking onboarding status: {str(e)}")
        return Response(
            {'error': 'Failed to check onboarding status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )