"""
Courier Services - Availability and Assignment System
"""
import logging
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import math

from .models import CourierProfile
from marketplace.order_models import ConsumerOrder

logger = logging.getLogger(__name__)


class CourierAvailabilityService:
    """
    Manages courier availability and assignment
    """
    
    @staticmethod
    def get_online_couriers(city=None, country=None, delivery_category=None):
        """
        Get all online couriers, optionally filtered by location and category
        """
        queryset = CourierProfile.objects.filter(
            is_online=True,
            is_verified=True,
            availability_status='online'
        )
        
        # Filter by location if provided
        if city and country:
            # For now, simple city/country match
            # In production, would use PostGIS for geo queries
            queryset = queryset.filter(
                Q(user__profile__city=city) | 
                Q(user__profile__country=country)
            )
        
        # Filter by delivery category if provided
        if delivery_category:
            # Use JSON contains for PostgreSQL
            queryset = queryset.filter(
                delivery_categories__contains=[delivery_category]
            )
        
        return queryset
    
    @staticmethod
    def check_courier_operating_hours(courier_profile):
        """
        Check if courier is within operating hours
        """
        now = timezone.now()
        day_name = now.strftime('%A').lower()
        current_time = now.strftime('%H:%M')
        
        operating_hours = courier_profile.operating_hours or {}
        day_hours = operating_hours.get(day_name, {})
        
        if not day_hours.get('is_open', False):
            return False
        
        start_time = day_hours.get('start', '00:00')
        end_time = day_hours.get('end', '23:59')
        
        return start_time <= current_time <= end_time
    
    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points using Haversine formula
        Returns distance in kilometers
        """
        if not all([lat1, lon1, lat2, lon2]):
            return float('inf')
        
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(float(lat1))
        lat2_rad = math.radians(float(lat2))
        delta_lat = math.radians(float(lat2) - float(lat1))
        delta_lon = math.radians(float(lon2) - float(lon1))
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    @staticmethod
    def find_nearest_available_courier(pickup_lat, pickup_lon, delivery_category, 
                                      max_distance_km=None):
        """
        Find the nearest available courier for a delivery
        Uses first-come-first-serve based on distance
        """
        online_couriers = CourierAvailabilityService.get_online_couriers(
            delivery_category=delivery_category
        )
        
        courier_distances = []
        
        for courier in online_couriers:
            # Check operating hours
            if not CourierAvailabilityService.check_courier_operating_hours(courier):
                continue
            
            # Calculate distance from courier to pickup location
            distance = CourierAvailabilityService.calculate_distance(
                courier.current_latitude,
                courier.current_longitude,
                pickup_lat,
                pickup_lon
            )
            
            # Check if within courier's delivery radius
            if distance > courier.delivery_radius:
                continue
            
            # Check if within max distance if specified
            if max_distance_km and distance > max_distance_km:
                continue
            
            courier_distances.append({
                'courier': courier,
                'distance': distance
            })
        
        # Sort by distance (nearest first)
        courier_distances.sort(key=lambda x: x['distance'])
        
        # Return the nearest courier or None
        return courier_distances[0]['courier'] if courier_distances else None


class CourierAssignmentService:
    """
    Handles courier assignment to orders
    """
    
    @staticmethod
    def calculate_courier_earnings(order_total, distance_km, delivery_category='food'):
        """
        Calculate courier earnings for a delivery
        """
        # Base fee structure (can be configured per tenant)
        base_fee = Decimal('2.00')  # Base delivery fee
        per_km_rate = Decimal('0.50')  # Per kilometer rate
        
        # Category multipliers
        category_multipliers = {
            'food': Decimal('1.0'),
            'groceries': Decimal('1.1'),
            'medicine': Decimal('1.2'),
            'packages': Decimal('0.9'),
            'documents': Decimal('0.8'),
        }
        
        multiplier = category_multipliers.get(delivery_category, Decimal('1.0'))
        
        # Calculate earnings
        distance_fee = Decimal(str(distance_km)) * per_km_rate
        subtotal = base_fee + distance_fee
        
        # Apply category multiplier
        earnings = subtotal * multiplier
        
        # Add percentage of order value (optional)
        order_percentage = order_total * Decimal('0.05')  # 5% of order value
        earnings += order_percentage
        
        # Apply minimum and maximum limits
        earnings = max(earnings, Decimal('3.00'))  # Minimum $3
        earnings = min(earnings, Decimal('50.00'))  # Maximum $50
        
        return earnings
    
    @staticmethod
    @transaction.atomic
    def assign_courier_to_order(order_id, auto_assign=True):
        """
        Assign a courier to an order
        Returns the assigned courier or None
        """
        try:
            order = ConsumerOrder.objects.select_for_update().get(id=order_id)
            
            # Check if order is eligible for courier assignment
            if order.order_status != 'business_accepted':
                logger.warning(f"Order {order_id} not in correct status for courier assignment")
                return None
            
            # Get business location
            business_listing = order.business.marketplace_listing
            pickup_lat = business_listing.latitude
            pickup_lon = business_listing.longitude
            
            # Determine delivery category from order items
            # For now, default to 'food' - can be enhanced based on business type
            delivery_category = 'food'
            if business_listing.business_type == 'pharmacy':
                delivery_category = 'medicine'
            elif business_listing.business_type == 'grocery_store':
                delivery_category = 'groceries'
            
            # Update order status to searching
            order.order_status = 'searching_courier'
            order.save()
            
            if auto_assign:
                # Find nearest available courier
                courier = CourierAvailabilityService.find_nearest_available_courier(
                    pickup_lat, pickup_lon, 
                    delivery_category,
                    max_distance_km=10  # 10km max radius
                )
                
                if courier:
                    # Calculate distance for earnings
                    delivery_distance = CourierAvailabilityService.calculate_distance(
                        pickup_lat, pickup_lon,
                        order.delivery_latitude if hasattr(order, 'delivery_latitude') else None,
                        order.delivery_longitude if hasattr(order, 'delivery_longitude') else None
                    ) or 5  # Default 5km if no delivery location
                    
                    # Calculate courier earnings
                    earnings = CourierAssignmentService.calculate_courier_earnings(
                        order.total_amount,
                        delivery_distance,
                        delivery_category
                    )
                    
                    # Assign courier to order
                    order.assign_courier(courier, earnings)
                    
                    # Update courier status
                    courier.availability_status = 'busy'
                    courier.save()
                    
                    # Send notification to courier (implement notification service)
                    CourierAssignmentService.notify_courier_of_assignment(courier, order)
                    
                    logger.info(f"Courier {courier.id} assigned to order {order_id}")
                    return courier
                else:
                    logger.warning(f"No available courier found for order {order_id}")
                    # Keep status as searching_courier
                    return None
            
            return None
            
        except ConsumerOrder.DoesNotExist:
            logger.error(f"Order {order_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error assigning courier to order {order_id}: {str(e)}")
            return None
    
    @staticmethod
    def notify_courier_of_assignment(courier, order):
        """
        Send notification to courier about new assignment
        """
        # TODO: Implement push notification service
        # For now, just log
        logger.info(f"Notification would be sent to courier {courier.user.email} for order {order.order_number}")
        
        # Notification should include:
        # - Pickup location and business name
        # - Delivery location
        # - Order items summary
        # - Estimated earnings
        # - Accept/Reject buttons with 30-second timer
    
    @staticmethod
    @transaction.atomic
    def courier_accept_delivery(courier_id, order_id):
        """
        Courier accepts a delivery assignment
        """
        try:
            courier = CourierProfile.objects.get(id=courier_id)
            order = ConsumerOrder.objects.select_for_update().get(id=order_id)
            
            # Verify courier is assigned to this order
            if order.courier != courier:
                return False, "Courier not assigned to this order"
            
            # Check order status
            if order.order_status != 'courier_assigned':
                return False, "Order not in correct status"
            
            # Accept the delivery
            order.courier_accept()
            
            # Update courier status
            courier.availability_status = 'busy'
            courier.save()
            
            # Notify business and consumer
            CourierAssignmentService.notify_parties_of_acceptance(order)
            
            return True, "Delivery accepted"
            
        except Exception as e:
            logger.error(f"Error accepting delivery: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def notify_parties_of_acceptance(order):
        """
        Notify business and consumer that courier accepted
        """
        # TODO: Implement notification service
        logger.info(f"Notifications would be sent for order {order.order_number}")
    
    @staticmethod
    @transaction.atomic
    def courier_pickup_order(courier_id, order_id):
        """
        Courier confirms pickup of order
        """
        try:
            courier = CourierProfile.objects.get(id=courier_id)
            order = ConsumerOrder.objects.select_for_update().get(id=order_id)
            
            # Verify courier
            if order.courier != courier:
                return False, "Courier not assigned to this order"
            
            # Check order status
            if order.order_status not in ['ready_for_pickup', 'courier_assigned', 'preparing']:
                return False, "Order not ready for pickup"
            
            # Mark as picked up and generate PIN
            order.mark_picked_up()
            
            # Notify consumer with PIN
            CourierAssignmentService.notify_consumer_with_pin(order)
            
            return True, order.delivery_pin
            
        except Exception as e:
            logger.error(f"Error picking up order: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def notify_consumer_with_pin(order):
        """
        Send PIN to consumer for delivery verification
        """
        # TODO: Implement notification service
        logger.info(f"PIN {order.delivery_pin} would be sent to consumer for order {order.order_number}")
    
    @staticmethod
    @transaction.atomic
    def verify_delivery(courier_id, order_id, pin):
        """
        Verify delivery with PIN
        """
        try:
            courier = CourierProfile.objects.get(id=courier_id)
            order = ConsumerOrder.objects.select_for_update().get(id=order_id)
            
            # Verify courier
            if order.courier != courier:
                return False, "Courier not assigned to this order"
            
            # Verify PIN
            if order.verify_delivery_pin(pin):
                # Update courier status back to online
                courier.availability_status = 'online'
                courier.total_deliveries += 1
                courier.successful_deliveries += 1
                courier.save()
                
                # Add earnings to courier's pending earnings
                courier.pending_earnings += order.courier_earnings
                courier.save()
                
                return True, "Delivery completed successfully"
            else:
                return False, "Invalid PIN"
                
        except Exception as e:
            logger.error(f"Error verifying delivery: {str(e)}")
            return False, str(e)