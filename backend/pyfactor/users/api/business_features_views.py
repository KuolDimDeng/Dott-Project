"""
Business Features API Views
Provides endpoint to get enabled features based on business type
"""
import logging
from datetime import datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from users.models import UserProfile
from users.business_categories import get_features_for_business_type, get_category_for_business_type, should_show_menu

logger = logging.getLogger(__name__)

# Date when simplified business types were introduced
SIMPLIFIED_TYPES_LAUNCH_DATE = datetime(2025, 7, 26)

def get_menu_items_for_business_type(business_type, features):
    """
    Get menu items based on business type and enabled features
    """
    menu_items = []
    
    # Common items for all businesses
    if 'pos' in features:
        menu_items.append({
            'id': 'pos',
            'label': 'POS Terminal',
            'icon': 'card-outline',
            'screen': 'POSScreen',
            'requiresFeature': 'pos'
        })
    
    # Service business items
    if business_type in ['HOME_SERVICES', 'CONSTRUCTION', 'CLEANING', 'AUTOMOTIVE_REPAIR']:
        if 'jobs' in features:
            menu_items.append({
                'id': 'jobs',
                'label': "Today's Jobs",
                'icon': 'construct-outline',
                'screen': 'ServiceJobs',
                'requiresFeature': 'jobs'
            })
        menu_items.append({
            'id': 'navigate',
            'label': 'Navigate to Next',
            'icon': 'navigate-outline',
            'screen': 'NavigationScreen'
        })
    
    # Restaurant/Food business items
    if business_type in ['RESTAURANT_CAFE', 'GROCERY_MARKET', 'HOTEL_HOSPITALITY']:
        menu_items.append({
            'id': 'orders',
            'label': 'Orders',
            'icon': 'restaurant-outline',
            'screen': 'OrderQueue'
        })
        if should_show_menu(business_type):
            menu_items.append({
                'id': 'menu',
                'label': 'Menu Management',
                'icon': 'list-outline',
                'screen': 'MenuManagement',
                'requiresFeature': 'menu'
            })
        if business_type == 'RESTAURANT_CAFE':
            menu_items.append({
                'id': 'tables',
                'label': 'Tables',
                'icon': 'grid-outline',
                'screen': 'TableManagement'
            })
    
    # Transport/Delivery business items
    if business_type in ['TRANSPORT_SERVICE', 'LOGISTICS_FREIGHT']:
        menu_items.append({
            'id': 'deliveries',
            'label': 'Active Deliveries',
            'icon': 'cube-outline',
            'screen': 'DeliveryList'
        })
        menu_items.append({
            'id': 'navigate',
            'label': 'Navigate',
            'icon': 'navigate-outline',
            'screen': 'NavigationScreen'
        })
    
    # Common business management items
    menu_items.extend([
        {
            'id': 'inventory',
            'label': 'Inventory',
            'icon': 'cube-outline',
            'screen': 'InventoryScreen',
            'requiresFeature': 'inventory'
        },
        {
            'id': 'timesheets',
            'label': 'Timesheets',
            'icon': 'time-outline',
            'screen': 'TimesheetScreen',
            'requiresFeature': 'timesheets'
        },
        {
            'id': 'employees',
            'label': 'Employees',
            'icon': 'people-outline',
            'screen': 'EmployeesScreen'
        },
        {
            'id': 'expenses',
            'label': 'Expenses',
            'icon': 'card-outline',
            'screen': 'ExpensesScreen'
        },
        {
            'id': 'invoices',
            'label': 'Invoices',
            'icon': 'document-text-outline',
            'screen': 'InvoicesScreen'
        },
        {
            'id': 'reports',
            'label': 'Reports',
            'icon': 'bar-chart-outline',
            'screen': 'ReportsScreen'
        },
        {
            'id': 'banking',
            'label': 'Banking',
            'icon': 'business-outline',
            'screen': 'BankingScreen'
        }
    ])
    
    return menu_items

class BusinessFeaturesView(APIView):
    """
    API endpoint for retrieving enabled features based on business type
    
    For existing users (onboarded before 2025-07-26): Returns both ['jobs', 'pos']
    For new users: Returns features based on their simplified business type
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def get(self, request):
        """
        Get enabled features for the current user's business
        
        Returns:
            Response: {
                'business_type': 'HOME_SERVICES' | null,
                'features': ['jobs'] | ['pos'] | ['jobs', 'pos'],
                'category': 'SERVICE' | 'RETAIL' | 'MIXED' | 'OTHER',
                'is_legacy_user': true | false
            }
        """
        try:
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                logger.warning(f"[BusinessFeaturesView] No user profile found for user {request.user.id}")
                return Response({
                    'business_type': None,
                    'features': ['jobs', 'pos'],
                    'category': 'OTHER',
                    'is_legacy_user': False
                })
            
            # Check if user is a legacy user (onboarded before simplified types)
            is_legacy_user = False
            if hasattr(request.user, 'onboarding_progress'):
                onboarding = request.user.onboarding_progress
                if onboarding.created_at and onboarding.created_at.replace(tzinfo=None) < SIMPLIFIED_TYPES_LAUNCH_DATE:
                    is_legacy_user = True
                    logger.info(f"[BusinessFeaturesView] User {request.user.email} is legacy user - showing all features")
            
            # Legacy users always see all features
            if is_legacy_user:
                # Get business name and type for legacy users
                business_name = None
                simplified_type = None
                if profile.business:
                    business_name = profile.business.name
                    # Try to get business type even for legacy users
                    if hasattr(profile.business, 'details') and profile.business.details:
                        simplified_type = profile.business.details.simplified_business_type

                # Legacy users get all features including menu
                all_features = ['jobs', 'pos', 'menu', 'inventory', 'timesheets']

                # Auto-detect restaurant type from business name for legacy users
                if business_name:
                    business_name_lower = business_name.lower()
                    if any(word in business_name_lower for word in ['restaurant', 'cafe', 'diner', 'bistro', 'eatery', 'grill', 'kitchen', 'food']):
                        # It's a restaurant - use restaurant type even if not set
                        business_type_for_menu = 'RESTAURANT_CAFE'
                        logger.info(f"[BusinessFeaturesView] Detected restaurant from name: {business_name}")
                    else:
                        # Use actual business type if available, otherwise default to mixed
                        business_type_for_menu = simplified_type if simplified_type else 'OTHER'
                else:
                    business_type_for_menu = simplified_type if simplified_type else 'OTHER'

                # Get menu items including restaurant-specific ones
                menu_items = get_menu_items_for_business_type(business_type_for_menu, all_features)

                # Ensure Menu option exists for restaurants
                if business_type_for_menu == 'RESTAURANT_CAFE':
                    has_menu = any(item['id'] == 'menu' for item in menu_items)
                    if not has_menu:
                        menu_items.append({
                            'id': 'menu',
                            'label': 'Menu',
                            'icon': 'list-outline',
                            'screen': 'MenuManagement',
                            'requiresFeature': 'menu'
                        })

                return Response({
                    'business_type': business_type_for_menu,  # Return detected type
                    'business_name': business_name,
                    'features': all_features,  # Include menu in features for legacy users
                    'menu_items': menu_items,
                    'category': 'OTHER',
                    'is_legacy_user': True
                })
            
            # For new users, check simplified business type
            simplified_type = None
            if profile.business and hasattr(profile.business, 'details'):
                business_details = profile.business.details
                if business_details:
                    simplified_type = business_details.simplified_business_type
            
            # Get features based on business type
            features = get_features_for_business_type(simplified_type)
            category = get_category_for_business_type(simplified_type)
            
            # Get menu items for this business type
            menu_items = get_menu_items_for_business_type(simplified_type, features)
            
            # Get business name
            business_name = None
            if profile.business:
                business_name = profile.business.name
            
            logger.info(f"[BusinessFeaturesView] User {request.user.email} - Type: {simplified_type}, Features: {features}")
            
            return Response({
                'business_type': simplified_type,
                'business_name': business_name,
                'features': features,
                'menu_items': menu_items,
                'category': category,
                'is_legacy_user': False
            })
            
        except Exception as e:
            logger.error(f"[BusinessFeaturesView] Error getting business features: {str(e)}")
            # Default to showing all features on error
            return Response({
                'business_type': None,
                'features': ['jobs', 'pos'],
                'category': 'OTHER',
                'is_legacy_user': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)