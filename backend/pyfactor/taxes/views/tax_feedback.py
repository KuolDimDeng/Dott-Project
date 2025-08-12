"""
Tax feedback view for collecting user feedback on tax rate accuracy
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
# from taxes.models import TaxRateFeedback

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_tax_feedback(request):
    """
    Submit feedback about tax rate accuracy
    """
    try:
        # Extract request data
        business_info = request.data.get('businessInfo', {})
        feedback_type = request.data.get('feedbackType')
        details = request.data.get('details')
        inaccurate_fields = request.data.get('inaccurateFields', [])
        suggested_sources = request.data.get('suggestedSources', '')
        displayed_rates = request.data.get('displayedRates', {})
        ai_confidence_score = request.data.get('aiConfidenceScore')
        
        # Validate required fields
        if not all([feedback_type, details]):
            return Response({
                'error': 'Missing required fields: feedbackType and details are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract location info
        country = business_info.get('country', '')
        state_province = business_info.get('stateProvince', '')
        city = business_info.get('city', '')
        business_type = business_info.get('businessType', 'retail')
        
        if not all([country, state_province, city]):
            return Response({
                'error': 'Missing location information'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create feedback record
        feedback = TaxRateFeedback.objects.create(
            tenant=request.user.tenant,
            country=country,
            state_province=state_province,
            city=city,
            business_type=business_type,
            feedback_type=feedback_type,
            inaccurate_fields=inaccurate_fields,
            feedback_details=details,
            suggested_sources=suggested_sources,
            displayed_rates=displayed_rates,
            ai_confidence_score=ai_confidence_score,
            submitted_by=request.user.email,
            user_role=getattr(request.user, 'role', 'USER')
        )
        
        logger.info(f"Tax feedback submitted: {feedback.id} by {request.user.email} for {city}, {state_province}, {country}")
        
        return Response({
            'success': True,
            'feedbackId': feedback.id,
            'message': 'Thank you for your feedback! This helps us improve our tax suggestions.'
        })
        
    except Exception as e:
        logger.error(f"Error submitting tax feedback: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)