"""
MTN MoMo API Views for Dott
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
import logging
from .momo_service import momo_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_momo_user(request):
    """Create MoMo API User (sandbox)"""
    try:
        result = momo_service.create_api_user()
        if result['success']:
            return Response({
                'success': True,
                'api_user': result['api_user'],
                'message': 'API User created successfully'
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating MoMo user: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_momo_key(request):
    """Generate MoMo API Key"""
    try:
        api_user = request.data.get('api_user')
        result = momo_service.generate_api_key(api_user)
        
        if result['success']:
            return Response({
                'success': True,
                'api_key': result['api_key'],
                'message': 'API Key generated successfully'
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error generating MoMo key: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_momo_token(request):
    """Get MoMo access token"""
    try:
        result = momo_service.get_access_token()
        
        if result['success']:
            return Response({
                'success': True,
                'access_token': result['access_token'],
                'expires_in': result['expires_in'],
                'message': 'Access token obtained successfully'
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error getting MoMo token: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_momo_payment(request):
    """Request payment from customer"""
    try:
        amount = request.data.get('amount')
        phone = request.data.get('phone')
        currency = request.data.get('currency', 'EUR')
        reference = request.data.get('reference')
        message = request.data.get('message')
        
        if not amount or not phone:
            return Response({
                'success': False,
                'error': 'Amount and phone number are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Log the payment request
        logger.info(f"MoMo payment request: {amount} {currency} from {phone}")
        
        result = momo_service.request_payment(
            amount=amount,
            phone=phone,
            currency=currency,
            reference=reference,
            message=message
        )
        
        if result['success']:
            # Store transaction in database (optional)
            # Transaction.objects.create(...)
            
            return Response({
                'success': True,
                'reference_id': result['reference_id'],
                'message': result['message']
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error requesting MoMo payment: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_momo_status(request, reference_id):
    """Check payment status"""
    try:
        result = momo_service.check_payment_status(reference_id)
        
        if result['success']:
            return Response({
                'success': True,
                'data': result['data']
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error checking MoMo status: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_momo_balance(request):
    """Get MoMo account balance"""
    try:
        result = momo_service.get_balance()
        
        if result['success']:
            return Response({
                'success': True,
                'data': result['data']
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error getting MoMo balance: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
def momo_webhook(request):
    """Handle MoMo webhook callbacks"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            logger.info(f"MoMo webhook received: {data}")
            
            # Process webhook data
            reference_id = data.get('externalId')
            status_value = data.get('status')
            
            if reference_id and status_value:
                # Update transaction status in database
                # Transaction.objects.filter(reference_id=reference_id).update(status=status_value)
                pass
            
            return JsonResponse({'success': True})
            
        except Exception as e:
            logger.error(f"Error processing MoMo webhook: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_momo(request):
    """Initialize MoMo with all setup steps"""
    try:
        results = {}
        
        # Step 1: Create API User
        user_result = momo_service.create_api_user()
        results['api_user'] = user_result
        
        if not user_result['success']:
            return Response(results, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 2: Generate API Key
        key_result = momo_service.generate_api_key(user_result['api_user'])
        results['api_key'] = key_result
        
        if not key_result['success']:
            return Response(results, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 3: Get Access Token
        token_result = momo_service.get_access_token()
        results['access_token'] = token_result
        
        if not token_result['success']:
            return Response(results, status=status.HTTP_400_BAD_REQUEST)
        
        # All steps successful
        return Response({
            'success': True,
            'message': 'MoMo initialized successfully',
            'api_user': user_result['api_user'],
            'access_token': token_result['access_token'],
            'expires_in': token_result['expires_in']
        })
        
    except Exception as e:
        logger.error(f"Error initializing MoMo: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)