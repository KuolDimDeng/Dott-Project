"""
Mobile Courier API Views
Handles courier registration, availability, and delivery management
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta

from .models import CourierProfile
from .services import CourierAvailabilityService, CourierAssignmentService
from .serializers import CourierProfileSerializer
from marketplace.order_models import ConsumerOrder
from marketplace.serializers import ConsumerOrderSerializer

logger = logging.getLogger(__name__)


class MobileCourierViewSet(viewsets.ModelViewSet):
    """
    Mobile API for courier operations
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CourierProfileSerializer
    
    def get_queryset(self):
        """Get courier profile for current user"""
        return CourierProfile.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def register_courier(self, request):
        """
        Register as a courier with delivery categories
        """
        user = request.user
        
        # Check if user already has a courier profile
        if CourierProfile.objects.filter(user=user).exists():
            return Response(
                {'error': 'You are already registered as a courier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Get registration data
                delivery_categories = request.data.get('delivery_categories', [])
                vehicle_type = request.data.get('vehicle_type', 'motorcycle')
                vehicle_registration = request.data.get('vehicle_registration')
                license_number = request.data.get('license_number')
                license_expiry = request.data.get('license_expiry')
                id_type = request.data.get('id_type', 'national_id')
                id_number = request.data.get('id_number')
                operating_hours = request.data.get('operating_hours', {})
                delivery_radius = request.data.get('delivery_radius', 10)
                
                # Create courier profile
                courier = CourierProfile.objects.create(
                    user=user,
                    business=user.business if hasattr(user, 'business') else None,
                    vehicle_type=vehicle_type,
                    vehicle_registration=vehicle_registration,
                    license_number=license_number,
                    license_expiry=license_expiry,
                    id_type=id_type,
                    id_number=id_number,
                    delivery_categories=delivery_categories,
                    operating_hours=operating_hours,
                    delivery_radius=delivery_radius,
                    employment_type='independent',
                    # Document uploads handled separately
                    license_front_photo=request.data.get('license_front_photo', ''),
                    license_back_photo=request.data.get('license_back_photo', ''),
                    id_front_photo=request.data.get('id_front_photo', ''),
                    id_back_photo=request.data.get('id_back_photo', ''),
                    selfie_with_id=request.data.get('selfie_with_id', ''),
                )
                
                # Set default operating hours if not provided
                if not operating_hours:
                    default_hours = {
                        'monday': {'start': '08:00', 'end': '20:00', 'is_open': True},
                        'tuesday': {'start': '08:00', 'end': '20:00', 'is_open': True},
                        'wednesday': {'start': '08:00', 'end': '20:00', 'is_open': True},
                        'thursday': {'start': '08:00', 'end': '20:00', 'is_open': True},
                        'friday': {'start': '08:00', 'end': '20:00', 'is_open': True},
                        'saturday': {'start': '09:00', 'end': '18:00', 'is_open': True},
                        'sunday': {'start': '10:00', 'end': '16:00', 'is_open': True},
                    }
                    courier.operating_hours = default_hours
                    courier.save()
                
                serializer = self.get_serializer(courier)
                return Response({
                    'success': True,
                    'message': 'Courier registration successful',
                    'data': serializer.data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Courier registration failed: {str(e)}")
            return Response(
                {'error': 'Registration failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def toggle_availability(self, request):
        """
        Toggle courier online/offline status
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            
            # Toggle online status
            courier.is_online = not courier.is_online
            
            if courier.is_online:
                courier.availability_status = 'online'
                courier.last_online = timezone.now()
            else:
                courier.availability_status = 'offline'
            
            courier.save()
            
            return Response({
                'success': True,
                'is_online': courier.is_online,
                'status': courier.availability_status
            })
            
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def update_location(self, request):
        """
        Update courier's current location
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            
            latitude = request.data.get('latitude')
            longitude = request.data.get('longitude')
            
            if not latitude or not longitude:
                return Response(
                    {'error': 'Latitude and longitude are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            courier.current_latitude = latitude
            courier.current_longitude = longitude
            courier.location_updated_at = timezone.now()
            courier.save()
            
            return Response({
                'success': True,
                'message': 'Location updated'
            })
            
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def update_operating_hours(self, request):
        """
        Update courier's operating hours
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            
            operating_hours = request.data.get('operating_hours', {})
            courier.operating_hours = operating_hours
            courier.save()
            
            return Response({
                'success': True,
                'message': 'Operating hours updated',
                'operating_hours': courier.operating_hours
            })
            
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def available_deliveries(self, request):
        """
        Get available delivery requests for courier
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            
            if not courier.is_online:
                return Response({
                    'success': True,
                    'data': [],
                    'message': 'You are offline'
                })
            
            # Get orders searching for courier
            orders = ConsumerOrder.objects.filter(
                order_status='searching_courier',
                tenant=request.user.tenant
            ).select_related('consumer', 'business')
            
            # Filter by courier's delivery categories
            delivery_orders = []
            for order in orders:
                # Check if order matches courier's categories
                business_type = order.business.marketplace_listing.business_type if hasattr(order.business, 'marketplace_listing') else 'food'
                
                # Map business type to delivery category
                category_map = {
                    'restaurant': 'food',
                    'cafe': 'food',
                    'grocery_store': 'groceries',
                    'pharmacy': 'medicine',
                }
                delivery_category = category_map.get(business_type, 'packages')
                
                if delivery_category in courier.delivery_categories:
                    # Calculate distance and earnings
                    pickup_location = order.business.marketplace_listing if hasattr(order.business, 'marketplace_listing') else None
                    
                    if pickup_location:
                        distance = CourierAvailabilityService.calculate_distance(
                            courier.current_latitude,
                            courier.current_longitude,
                            pickup_location.latitude,
                            pickup_location.longitude
                        )
                        
                        if distance <= courier.delivery_radius:
                            earnings = CourierAssignmentService.calculate_courier_earnings(
                                order.total_amount,
                                distance,
                                delivery_category
                            )
                            
                            delivery_orders.append({
                                'order_id': str(order.id),
                                'order_number': order.order_number,
                                'pickup_business': order.business.business_name,
                                'pickup_address': pickup_location.city if pickup_location else 'Unknown',
                                'delivery_address': order.delivery_address,
                                'distance_km': round(distance, 2),
                                'estimated_earnings': str(earnings),
                                'items_count': len(order.items) if order.items else 0,
                                'payment_method': order.payment_method,
                                'created_at': order.created_at
                            })
            
            return Response({
                'success': True,
                'data': delivery_orders[:10]  # Limit to 10 nearest orders
            })
            
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def accept_delivery(self, request):
        """
        Accept a delivery request
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            order_id = request.data.get('order_id')
            
            if not order_id:
                return Response(
                    {'error': 'Order ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign courier to order
            success = CourierAssignmentService.assign_courier_to_order(
                order_id, 
                auto_assign=False
            )
            
            if success:
                # Accept the delivery
                result, message = CourierAssignmentService.courier_accept_delivery(
                    courier.id, order_id
                )
                
                if result:
                    return Response({
                        'success': True,
                        'message': 'Delivery accepted',
                        'order_id': order_id
                    })
                else:
                    return Response(
                        {'error': message},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': 'Failed to accept delivery'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def pickup_order(self, request):
        """
        Confirm order pickup
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            order_id = request.data.get('order_id')
            
            if not order_id:
                return Response(
                    {'error': 'Order ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            success, result = CourierAssignmentService.courier_pickup_order(
                courier.id, order_id
            )
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Order picked up',
                    'delivery_pin': result  # PIN for delivery verification
                })
            else:
                return Response(
                    {'error': result},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def verify_delivery(self, request):
        """
        Verify delivery with PIN
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            order_id = request.data.get('order_id')
            pin = request.data.get('pin')
            
            if not order_id or not pin:
                return Response(
                    {'error': 'Order ID and PIN are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            success, message = CourierAssignmentService.verify_delivery(
                courier.id, order_id, pin
            )
            
            if success:
                return Response({
                    'success': True,
                    'message': message
                })
            else:
                return Response(
                    {'error': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def my_deliveries(self, request):
        """
        Get courier's delivery history
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            
            # Get today's deliveries
            today = timezone.now().date()
            deliveries = ConsumerOrder.objects.filter(
                courier=courier,
                created_at__date=today
            ).order_by('-created_at')
            
            serializer = ConsumerOrderSerializer(deliveries, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'stats': {
                    'today_deliveries': deliveries.count(),
                    'today_earnings': sum(d.courier_earnings or 0 for d in deliveries),
                    'total_deliveries': courier.total_deliveries,
                    'pending_earnings': str(courier.pending_earnings),
                    'average_rating': str(courier.average_rating)
                }
            })
            
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def earnings(self, request):
        """
        Get courier earnings summary
        """
        try:
            courier = CourierProfile.objects.get(user=request.user)
            
            # Calculate earnings for different periods
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())
            month_start = today.replace(day=1)
            
            today_earnings = ConsumerOrder.objects.filter(
                courier=courier,
                created_at__date=today,
                order_status='delivered'
            ).values_list('courier_earnings', flat=True)
            
            week_earnings = ConsumerOrder.objects.filter(
                courier=courier,
                created_at__date__gte=week_start,
                order_status='delivered'
            ).values_list('courier_earnings', flat=True)
            
            month_earnings = ConsumerOrder.objects.filter(
                courier=courier,
                created_at__date__gte=month_start,
                order_status='delivered'
            ).values_list('courier_earnings', flat=True)
            
            return Response({
                'success': True,
                'data': {
                    'today': str(sum(today_earnings)),
                    'this_week': str(sum(week_earnings)),
                    'this_month': str(sum(month_earnings)),
                    'pending_payout': str(courier.pending_earnings),
                    'total_earnings': str(courier.total_earnings),
                    'last_payout': courier.last_payout_date
                }
            })
            
        except CourierProfile.DoesNotExist:
            return Response(
                {'error': 'Courier profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )