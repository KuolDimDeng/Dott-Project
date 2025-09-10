"""
Courier Profile Views
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def courier_profile(request):
    """
    Get courier profile for the authenticated user
    """
    try:
        # Check if user is a courier
        from couriers.models import CourierProfile
        
        try:
            profile = CourierProfile.objects.get(user=request.user)
            
            return Response({
                'success': True,
                'data': {
                    'id': str(profile.id),
                    'is_courier': True,
                    'is_active': profile.is_active,
                    'is_available': profile.is_available,
                    'verification_status': profile.verification_status,
                    'trust_level': profile.trust_level,
                    'total_deliveries': profile.total_deliveries,
                    'rating': str(profile.rating) if profile.rating else None,
                    'vehicle_type': profile.vehicle_type,
                    'vehicle_registration': profile.vehicle_registration,
                    'phone': profile.phone,
                    'created_at': profile.created_at.isoformat() if profile.created_at else None
                }
            })
            
        except CourierProfile.DoesNotExist:
            # User is not a courier
            return Response({
                'success': True,
                'data': {
                    'is_courier': False,
                    'message': 'User is not registered as a courier'
                }
            })
        
    except Exception as e:
        logger.error(f"Error getting courier profile: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def courier_deliveries(request):
    """
    Get deliveries for the authenticated courier
    """
    try:
        # Get query parameters
        status_filter = request.query_params.get('status', 'assigned')
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        
        # Check if user is a courier
        from couriers.models import CourierProfile, DeliveryOrder
        
        try:
            profile = CourierProfile.objects.get(user=request.user)
        except CourierProfile.DoesNotExist:
            return Response({
                'success': True,
                'data': {
                    'deliveries': [],
                    'total': 0,
                    'message': 'User is not registered as a courier'
                }
            })
        
        # Get deliveries
        deliveries = DeliveryOrder.objects.filter(
            courier=profile
        ).order_by('-created_at')
        
        # Apply status filter
        if status_filter and status_filter != 'all':
            deliveries = deliveries.filter(status=status_filter)
        
        # Get total count
        total = deliveries.count()
        
        # Apply pagination
        deliveries = deliveries[offset:offset + limit]
        
        # Format deliveries
        delivery_list = []
        for delivery in deliveries:
            delivery_list.append({
                'id': str(delivery.id),
                'order_number': delivery.order_number,
                'status': delivery.status,
                'pickup_address': delivery.pickup_address,
                'delivery_address': delivery.delivery_address,
                'pickup_time': delivery.pickup_time.isoformat() if delivery.pickup_time else None,
                'delivery_time': delivery.delivery_time.isoformat() if delivery.delivery_time else None,
                'distance': str(delivery.distance) if delivery.distance else None,
                'delivery_fee': str(delivery.delivery_fee),
                'tip_amount': str(delivery.tip_amount) if delivery.tip_amount else '0.00',
                'customer_name': delivery.customer_name,
                'customer_phone': delivery.customer_phone,
                'created_at': delivery.created_at.isoformat() if delivery.created_at else None
            })
        
        return Response({
            'success': True,
            'data': {
                'deliveries': delivery_list,
                'total': total,
                'limit': limit,
                'offset': offset
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting courier deliveries: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)