"""
Driver API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Sum, Avg, Count
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from .models import CourierProfile, DeliveryOrder, CourierEarnings, CourierNotification, DeliveryTracking
from .serializers import (
    CourierRegistrationSerializer, CourierProfileSerializer, CourierStatusSerializer,
    DeliveryOrderSerializer, DeliveryOrderListSerializer, AcceptDeliverySerializer,
    UpdateDeliveryStatusSerializer, DeliveryTrackingSerializer, CourierEarningsSerializer,
    CourierNotificationSerializer, CourierDashboardSerializer, NearbyCourierSerializer
)
from marketplace.models import BusinessListing
from marketplace.order_models import ConsumerOrder
from marketplace.payment_service import MarketplacePaymentService
from users.models import Business, UserProfile
from django.contrib.auth import get_user_model

User = get_user_model()


class CourierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for driver operations
    """
    queryset = CourierProfile.objects.all()
    serializer_class = CourierProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by current user if driver, otherwise show all for admin"""
        user = self.request.user
        if hasattr(user, 'courier_profile'):
            return CourierProfile.objects.filter(user=user)
        return CourierProfile.objects.all()
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def register(self, request):
        """Register a new driver with business creation"""
        serializer = CourierRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            user = request.user
            
            # Create business
            business = Business.objects.create(
                owner_id=user.id,
                name=data['business_name'],
                business_type='Transport/Delivery',
                simplified_business_type='SERVICE',
                legal_structure=data['legal_structure'],
                country=data['country'],
                marketplace_category='Transport',
                delivery_scope='local',
                tenant_id=None  # Will be set in save
            )
            
            # Update user profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.business_id = business.id
            profile.is_business_owner = True
            profile.city = data['city']
            profile.country = data['country']
            profile.phone_number = data['phone_number']
            profile.save()
            
            # Create marketplace listing
            listing = BusinessListing.objects.create(
                business=user,
                business_type='Transport',
                delivery_scope='local',
                delivery_radius_km=data['service_radius_km'],
                country=data['country'],
                city=data['city'],
                is_visible_in_marketplace=False,  # Start hidden until verified
                description=f"{data['business_name']} - Professional delivery service"
            )
            
            # Create driver profile
            driver = CourierProfile.objects.create(
                user=user,
                business=business,
                vehicle_type=data['vehicle_type'],
                vehicle_make=data.get('vehicle_make', ''),
                vehicle_model=data.get('vehicle_model', ''),
                vehicle_year=data.get('vehicle_year'),
                vehicle_color=data.get('vehicle_color', ''),
                vehicle_registration=data['vehicle_registration'],
                license_number=data['license_number'],
                license_expiry=data['license_expiry'],
                license_front_photo=data['license_front_photo'],
                license_back_photo=data['license_back_photo'],
                id_type=data['id_type'],
                id_number=data['id_number'],
                id_front_photo=data['id_front_photo'],
                id_back_photo=data.get('id_back_photo', ''),
                selfie_with_id=data['selfie_with_id'],
                service_radius_km=data['service_radius_km'],
                accepts_cash=data['accepts_cash'],
                accepts_food_delivery=data['accepts_food_delivery'],
                bank_account_number=data.get('bank_account_number', ''),
                bank_name=data.get('bank_name', ''),
                mpesa_number=data.get('mpesa_number', ''),
                preferred_payout_method=data.get('preferred_payout_method', 'mpesa'),
                emergency_contact_name=data.get('emergency_contact_name', ''),
                emergency_contact_phone=data.get('emergency_contact_phone', '')
            )
            
            # Send notification to admin for verification
            # TODO: Implement admin notification
            
            return Response({
                'success': True,
                'message': 'Driver registration successful. Awaiting verification.',
                'driver_id': driver.id,
                'business_id': business.id
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def update_status(self, request):
        """Update driver availability status"""
        try:
            driver = request.user.courier_profile
            serializer = CourierStatusSerializer(data=request.data)
            
            if serializer.is_valid():
                driver.availability_status = serializer.validated_data['availability_status']
                
                if 'current_latitude' in serializer.validated_data:
                    driver.update_location(
                        serializer.validated_data['current_latitude'],
                        serializer.validated_data['current_longitude']
                    )
                
                if driver.availability_status == 'online':
                    driver.last_online = timezone.now()
                
                driver.save()
                
                return Response({
                    'success': True,
                    'status': driver.availability_status
                })
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except CourierProfile.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get driver dashboard data"""
        try:
            driver = request.user.courier_profile
            today = timezone.now().date()
            
            # Today's stats
            today_orders = DeliveryOrder.objects.filter(
                driver=driver,
                created_at__date=today
            )
            today_deliveries = today_orders.filter(status='delivered').count()
            today_earnings = today_orders.filter(status='delivered').aggregate(
                total=Sum('driver_earnings')
            )['total'] or Decimal('0.00')
            
            # Active order
            active_order = DeliveryOrder.objects.filter(
                driver=driver,
                status__in=['driver_assigned', 'driver_heading_pickup', 'arrived_at_pickup', 
                          'package_picked', 'in_transit', 'arrived_at_delivery']
            ).first()
            
            # Nearby orders (within service radius)
            nearby_orders = []
            if driver.availability_status == 'online' and driver.current_latitude:
                # TODO: Implement geospatial query for nearby orders
                pending_orders = DeliveryOrder.objects.filter(
                    status='pending'
                ).order_by('-created_at')[:10]
                nearby_orders = pending_orders
            
            # Recent notifications
            notifications = CourierNotification.objects.filter(
                driver=driver,
                is_read=False
            ).order_by('-created_at')[:10]
            
            # Calculate acceptance rate
            total_notifications = CourierNotification.objects.filter(
                driver=driver,
                notification_type='new_order'
            ).count()
            accepted_notifications = CourierNotification.objects.filter(
                driver=driver,
                notification_type='new_order',
                was_accepted=True
            ).count()
            acceptance_rate = (accepted_notifications / total_notifications * 100) if total_notifications > 0 else 100
            
            dashboard_data = {
                'today_deliveries': today_deliveries,
                'today_earnings': today_earnings,
                'pending_earnings': driver.pending_earnings,
                'average_rating': driver.average_rating,
                'acceptance_rate': acceptance_rate,
                'on_time_percentage': driver.on_time_percentage,
                'active_order': DeliveryOrderSerializer(active_order).data if active_order else None,
                'nearby_orders': DeliveryOrderListSerializer(nearby_orders, many=True).data,
                'recent_notifications': CourierNotificationSerializer(notifications, many=True).data
            }
            
            return Response({
                'success': True,
                'data': dashboard_data
            })
            
        except CourierProfile.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver profile not found'
            }, status=status.HTTP_404_NOT_FOUND)


class DeliveryOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for delivery orders
    """
    queryset = DeliveryOrder.objects.all()
    serializer_class = DeliveryOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter orders based on user role"""
        user = self.request.user
        queryset = DeliveryOrder.objects.all()

        # Filter by user role
        if hasattr(user, 'courier_profile'):
            # Driver sees their orders
            queryset = queryset.filter(driver=user.courier_profile)
        elif hasattr(user, 'marketplace_listing'):
            # Business sees their orders
            queryset = queryset.filter(business=user.marketplace_listing)
        else:
            # Consumer sees their orders
            queryset = queryset.filter(consumer=user)

        # Apply status filter - handle both single status and multiple statuses
        status_filter = self.request.query_params.get('status')
        status_in_filter = self.request.query_params.get('status__in')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        elif status_in_filter:
            # Handle comma-separated status values for status__in parameter
            statuses = status_in_filter.split(',')
            queryset = queryset.filter(status__in=statuses)

        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """Override list to ensure proper response format"""
        try:
            queryset = self.filter_queryset(self.get_queryset())

            # Handle pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'success': True,
                'data': serializer.data,
                'count': len(serializer.data)
            })
        except Exception as e:
            # If any error occurs, return empty list instead of error
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error in delivery list: {str(e)}")

            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'message': 'No deliveries found'
            })
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Driver accepts a delivery order"""
        try:
            order = self.get_object()
            driver = request.user.courier_profile
            
            # Check if order is still available
            if order.status != 'pending':
                return Response({
                    'success': False,
                    'message': 'Order is no longer available'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if driver is available
            if driver.availability_status != 'online':
                return Response({
                    'success': False,
                    'message': 'You must be online to accept orders'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = AcceptDeliverySerializer(data=request.data)
            if serializer.is_valid():
                # Assign order to driver
                order.assign_driver(driver)
                
                # Update with estimates if provided
                if 'estimated_pickup_time' in serializer.validated_data:
                    order.requested_pickup_time = serializer.validated_data['estimated_pickup_time']
                if 'estimated_delivery_time' in serializer.validated_data:
                    order.requested_delivery_time = serializer.validated_data['estimated_delivery_time']
                
                order.save()
                
                # Mark notification as accepted
                notification = CourierNotification.objects.filter(
                    driver=driver,
                    delivery_order=order,
                    notification_type='new_order'
                ).first()
                if notification:
                    notification.was_accepted = True
                    notification.response_time = timezone.now()
                    notification.save()
                
                return Response({
                    'success': True,
                    'message': 'Order accepted successfully',
                    'order': DeliveryOrderSerializer(order).data
                })
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except CourierProfile.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update delivery order status"""
        order = self.get_object()
        serializer = UpdateDeliveryStatusSerializer(data=request.data)
        
        if serializer.is_valid():
            new_status = serializer.validated_data['status']
            
            # Update order status
            order.status = new_status
            
            # Handle specific status updates
            if new_status == 'package_picked':
                order.mark_picked_up()
            elif new_status == 'delivered':
                order.mark_delivered(
                    photo=serializer.validated_data.get('photo'),
                    signature=serializer.validated_data.get('signature'),
                    delivered_to=serializer.validated_data.get('delivered_to_name')
                )
            elif new_status == 'cancelled':
                order.cancelled_by = request.user
                order.cancellation_reason = serializer.validated_data.get('notes', '')
                order.save()
                
                # Free up driver
                if order.courier:
                    order.courier.availability_status = 'online'
                    order.courier.save()
            else:
                order.save()
            
            # Send notification to consumer
            # TODO: Implement consumer notification
            
            return Response({
                'success': True,
                'message': f'Order status updated to {order.get_status_display()}',
                'order': DeliveryOrderSerializer(order).data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_tracking(self, request, pk=None):
        """Add tracking point for delivery"""
        order = self.get_object()
        
        # Verify driver is assigned to this order
        if hasattr(request.user, 'courier_profile'):
            if order.courier != request.user.courier_profile:
                return Response({
                    'success': False,
                    'message': 'You are not assigned to this order'
                }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = DeliveryTrackingSerializer(data={
            **request.data,
            'delivery_order': order.id
        })
        
        if serializer.is_valid():
            tracking = serializer.save()
            
            # Update driver location
            if hasattr(request.user, 'courier_profile'):
                driver = request.user.courier_profile
                driver.update_location(
                    tracking.latitude,
                    tracking.longitude
                )
            
            return Response({
                'success': True,
                'tracking': DeliveryTrackingSerializer(tracking).data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Get all tracking points for a delivery"""
        order = self.get_object()
        tracking_points = order.tracking_points.all()
        
        return Response({
            'success': True,
            'order_status': order.status,
            'driver_location': {
                'latitude': order.courier.current_latitude,
                'longitude': order.courier.current_longitude
            } if order.courier else None,
            'tracking_points': DeliveryTrackingSerializer(tracking_points, many=True).data
        })

    @action(detail=True, methods=['post'])
    def verify_pickup_pin(self, request, pk=None):
        """Verify pickup PIN and release restaurant payment"""
        try:
            delivery_order = self.get_object()
            courier = request.user.courier_profile
            pin = request.data.get('pin')

            if not pin:
                return Response({
                    'success': False,
                    'message': 'PIN is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Verify courier is assigned to this order
            if delivery_order.driver != courier:
                return Response({
                    'success': False,
                    'message': 'You are not assigned to this delivery'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get the marketplace order
            marketplace_order = ConsumerOrder.objects.filter(
                id=delivery_order.order_id
            ).first()

            if not marketplace_order:
                return Response({
                    'success': False,
                    'message': 'Order not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Verify pickup PIN and release restaurant payment
            success, message = marketplace_order.verify_pickup_pin(pin, courier)

            if success:
                # Update delivery order status
                delivery_order.status = 'picked'
                delivery_order.picked_at = timezone.now()
                delivery_order.save()

                return Response({
                    'success': True,
                    'message': message
                })
            else:
                return Response({
                    'success': False,
                    'message': message
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def verify_delivery_pin(self, request, pk=None):
        """Verify delivery PIN and release courier payment"""
        try:
            delivery_order = self.get_object()
            courier = request.user.courier_profile
            pin = request.data.get('pin')

            if not pin:
                return Response({
                    'success': False,
                    'message': 'PIN is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Verify courier is assigned to this order
            if delivery_order.driver != courier:
                return Response({
                    'success': False,
                    'message': 'You are not assigned to this delivery'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get the marketplace order
            marketplace_order = ConsumerOrder.objects.filter(
                id=delivery_order.order_id
            ).first()

            if not marketplace_order:
                return Response({
                    'success': False,
                    'message': 'Order not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Verify delivery PIN and release courier payment
            success, message = marketplace_order.verify_delivery_pin(pin, courier)

            if success:
                # Update delivery order status
                delivery_order.status = 'delivered'
                delivery_order.delivered_at = timezone.now()
                delivery_order.save()

                # Get courier earnings amount for response
                earnings_amount = marketplace_order.courier_earnings or marketplace_order.delivery_fee * Decimal('0.75')

                return Response({
                    'success': True,
                    'message': message,
                    'earnings': float(earnings_amount)
                })
            else:
                return Response({
                    'success': False,
                    'message': message
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourierEarningsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for driver earnings
    """
    queryset = CourierEarnings.objects.all()
    serializer_class = CourierEarningsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by current driver"""
        if hasattr(self.request.user, 'courier_profile'):
            return CourierEarnings.objects.filter(
                driver=self.request.user.courier_profile
            )
        return CourierEarnings.objects.none()
    
    @action(detail=False, methods=['post'])
    def request_payout(self, request):
        """Request payout for pending earnings"""
        try:
            driver = request.user.courier_profile
            
            if driver.pending_earnings < Decimal('10.00'):
                return Response({
                    'success': False,
                    'message': 'Minimum payout amount is $10'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create earnings record
            earnings = CourierEarnings.objects.create(
                driver=driver,
                period_start=timezone.now().date() - timedelta(days=7),
                period_end=timezone.now().date(),
                total_deliveries=DeliveryOrder.objects.filter(
                    driver=driver,
                    status='delivered',
                    created_at__gte=timezone.now() - timedelta(days=7)
                ).count(),
                base_earnings=driver.pending_earnings,
                net_earnings=driver.pending_earnings,
                payout_method=driver.preferred_payout_method,
                payout_status='pending'
            )
            
            # Reset pending earnings
            driver.pending_earnings = Decimal('0.00')
            driver.save()
            
            # TODO: Process actual payout via payment provider
            
            return Response({
                'success': True,
                'message': 'Payout request submitted successfully',
                'earnings': CourierEarningsSerializer(earnings).data
            })
            
        except CourierProfile.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Driver profile not found'
            }, status=status.HTTP_404_NOT_FOUND)


class NearbyCouriersViewSet(viewsets.ViewSet):
    """
    ViewSet for finding nearby drivers (consumer facing)
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def find(self, request):
        """Find nearby available drivers"""
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        radius_km = request.data.get('radius_km', 10)
        
        if not latitude or not longitude:
            return Response({
                'success': False,
                'message': 'Location coordinates required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find online drivers
        # TODO: Implement proper geospatial query
        drivers = CourierProfile.objects.filter(
            availability_status='online',
            is_verified=True
        )
        
        nearby_drivers = []
        for driver in drivers:
            if driver.current_latitude and driver.current_longitude:
                # Calculate distance (simplified)
                # In production, use proper geospatial calculations
                distance_km = 5  # Placeholder
                
                if distance_km <= radius_km:
                    nearby_drivers.append({
                        'driver_id': driver.id,
                        'name': driver.user.get_full_name() or driver.user.email,
                        'vehicle_type': driver.vehicle_type,
                        'rating': driver.average_rating,
                        'distance_km': distance_km,
                        'estimated_arrival_minutes': int(distance_km * 3),  # Rough estimate
                        'latitude': driver.current_latitude,
                        'longitude': driver.current_longitude
                    })
        
        # Sort by distance
        nearby_drivers.sort(key=lambda x: x['distance_km'])
        
        return Response({
            'success': True,
            'drivers_found': len(nearby_drivers),
            'drivers': nearby_drivers[:10]  # Return top 10 closest
        })