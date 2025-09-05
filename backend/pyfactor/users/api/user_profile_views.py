"""
User Profile API Views
Provides user profile endpoints including /api/users/me/
"""
import logging
import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from users.models import UserProfile
from onboarding.models import OnboardingProgress
from core.cache_service import cache_service

logger = logging.getLogger(__name__)

class UserProfileMeView(APIView):
    """
    API endpoint for retrieving current user's profile information
    
    This endpoint provides the data that the frontend expects at /api/users/me/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def get(self, request):
        """
        Get current user's profile information
        
        Returns:
            Response: User profile data including subscription plan
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            logger.info(f"[UserProfileMeView] Getting profile for user: {request.user.email}")
            
            # Check cache first
            cached_profile = cache_service.get_user_profile(request.user.id)
            if cached_profile:
                logger.info(f"[UserProfileMeView] Returning cached profile")
                cached_profile['request_id'] = request_id  # Add fresh request ID
                return Response(cached_profile, status=status.HTTP_200_OK)
            
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
                logger.info(f"[UserProfileMeView] Found user profile")
            except UserProfile.DoesNotExist:
                logger.warning(f"[UserProfileMeView] No user profile found for user {request.user.id}")
                # Create basic response with user data only
                user_role = getattr(request.user, 'role', 'USER')
                has_business = bool(request.user.tenant)
                
                response_data = {
                    'id': request.user.id,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'role': user_role,
                    'has_business': has_business,
                    'subscription_plan': 'free',
                    'selected_plan': 'free',
                    'subscription_type': 'free',
                    'request_id': request_id
                }
                return Response(response_data, status=status.HTTP_200_OK)
            
            # Get subscription plan from users_subscription table (SINGLE SOURCE OF TRUTH)
            subscription_plan = 'free'
            selected_plan = 'free'
            
            try:
                # Use centralized subscription service (SINGLE SOURCE OF TRUTH)
                from users.subscription_service import SubscriptionService
                
                subscription_plan = SubscriptionService.get_subscription_plan(str(profile.tenant_id))
                selected_plan = subscription_plan
                
                logger.info(f"[UserProfileMeView] Subscription service returned: {subscription_plan}")
                        
            except Exception as e:
                logger.warning(f"[UserProfileMeView] Error getting subscription info: {str(e)}")
                # Default to free if there are any errors
                subscription_plan = 'free'
                selected_plan = 'free'
            
            # Get user's role and page permissions
            user_role = getattr(request.user, 'role', 'USER')
            page_permissions = []
            
            if user_role == 'OWNER':
                # Owners have access to all pages
                from custom_auth.models import PagePermission
                all_pages = PagePermission.objects.filter(is_active=True)
                for page in all_pages:
                    page_permissions.append({
                        'path': page.path,
                        'name': page.name,
                        'category': page.category,
                        'can_read': True,
                        'can_write': True,
                        'can_edit': True,
                        'can_delete': True
                    })
            elif user_role == 'ADMIN':
                # Admins have access to all pages with limited delete
                from custom_auth.models import PagePermission
                all_pages = PagePermission.objects.filter(is_active=True)
                for page in all_pages:
                    page_permissions.append({
                        'path': page.path,
                        'name': page.name,
                        'category': page.category,
                        'can_read': True,
                        'can_write': True,
                        'can_edit': True,
                        'can_delete': False
                    })
            else:
                # Regular users have specific permissions
                from custom_auth.models import UserPageAccess
                user_access = UserPageAccess.objects.filter(
                    user=request.user,
                    tenant=request.user.tenant
                ).select_related('page').prefetch_related('page__children')
                for access in user_access:
                    page_permissions.append({
                        'path': access.page.path,
                        'name': access.page.name,
                        'category': access.page.category,
                        'can_read': access.can_read,
                        'can_write': access.can_write,
                        'can_edit': access.can_edit,
                        'can_delete': access.can_delete
                    })
            
            # Get employee data if user has an employee record
            employee_data = None
            try:
                from hr.models import Employee
                employee = Employee.objects.filter(user=request.user).first()
                if employee:
                    employee_data = {
                        'id': str(employee.id),
                        'employee_number': employee.employee_number,
                        'first_name': employee.first_name,
                        'last_name': employee.last_name,
                        'job_title': employee.job_title,
                        'department': employee.department,
                        'hire_date': employee.hire_date.isoformat() if employee.hire_date else None,
                        'employee_type': employee.employee_type,
                        'can_approve_timesheets': employee.can_approve_timesheets,
                        'exempt_status': employee.exempt_status,
                        'hourly_rate': float(employee.hourly_rate) if employee.hourly_rate else 0,
                        'salary': float(employee.salary) if employee.salary else 0,
                    }
                    logger.info(f"[UserProfileMeView] Found employee record for user: {employee.id}")
            except Exception as e:
                logger.warning(f"[UserProfileMeView] Could not get employee data: {str(e)}")
            
            # Check if user has a business (tenant)
            has_business = bool(request.user.tenant)
            
            # Build response data
            user_country = str(profile.country) if profile.country else 'US'
            logger.info(f"[UserProfileMeView] Profile country: {profile.country}, Returning: {user_country}")
            
            response_data = {
                'id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'role': user_role,
                'has_business': has_business,  # Add has_business field for mobile app compatibility
                'page_permissions': page_permissions,
                'subscription_plan': subscription_plan,
                'selected_plan': selected_plan,
                'subscription_type': subscription_plan,  # Alias for compatibility
                'is_business_owner': profile.is_business_owner,
                'tenant_id': str(profile.tenant_id) if profile.tenant_id else None,
                'business_id': str(profile.business_id) if profile.business_id else None,
                'country': user_country,
                'phone_number': profile.phone_number,
                'occupation': profile.occupation,
                'show_whatsapp_commerce': profile.get_whatsapp_commerce_preference(),
                'whatsapp_commerce_explicit': profile.show_whatsapp_commerce,  # Explicit user setting (null if using default)
                'display_legal_structure': profile.display_legal_structure,
                'show_zero_stock_pos': profile.show_zero_stock_pos,  # POS preference for zero stock
                'employee': employee_data,  # Add employee data
                'request_id': request_id
            }
            
            # Add business information if available
            if profile.business:
                business = profile.business
                response_data.update({
                    'business_name': business.name,
                    'business_type': business.business_type,
                    'legal_structure': getattr(business, 'legal_structure', ''),
                })
            
            logger.info(f"[UserProfileMeView] Returning profile data with subscription_plan: {subscription_plan}")
            
            # Cache the profile data (excluding request_id for caching)
            cache_data = response_data.copy()
            cache_data.pop('request_id', None)
            cache_service.set_user_profile(request.user.id, cache_data)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[UserProfileMeView] Error retrieving user profile: {str(e)}")
            return Response({
                'error': 'Failed to retrieve user profile',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request):
        """
        Update current user's profile information
        
        Accepts:
            show_whatsapp_commerce: boolean or null to reset to country default
        
        Returns:
            Response: Updated user profile data
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            logger.info(f"[UserProfileMeView] Updating profile for user: {request.user.email}")
            logger.info(f"[UserProfileMeView] Patch data: {request.data}")
            
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                logger.error(f"[UserProfileMeView] No user profile found for user {request.user.id}")
                return Response({
                    'error': 'User profile not found',
                    'request_id': request_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Track if any updates were made
            updated = False
            
            # Update show_zero_stock_pos preference if provided
            if 'show_zero_stock_pos' in request.data:
                zero_stock_preference = request.data['show_zero_stock_pos']
                if isinstance(zero_stock_preference, bool):
                    profile.show_zero_stock_pos = zero_stock_preference
                    updated = True
                    logger.info(f"[UserProfileMeView] Updated show_zero_stock_pos to: {zero_stock_preference}")
                else:
                    return Response({
                        'error': 'show_zero_stock_pos must be a boolean',
                        'request_id': request_id
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update WhatsApp commerce preference if provided
            if 'show_whatsapp_commerce' in request.data:
                whatsapp_preference = request.data['show_whatsapp_commerce']
                
                # Allow null to reset to country default
                if whatsapp_preference is None:
                    profile.show_whatsapp_commerce = None
                elif isinstance(whatsapp_preference, bool):
                    profile.show_whatsapp_commerce = whatsapp_preference
                else:
                    return Response({
                        'error': 'show_whatsapp_commerce must be a boolean or null',
                        'request_id': request_id
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                updated = True
                logger.info(f"[UserProfileMeView] Updated WhatsApp preference to: {profile.show_whatsapp_commerce}")
            
            # Update legal structure display preference if provided
            if 'display_legal_structure' in request.data:
                display_preference = request.data['display_legal_structure']
                
                if isinstance(display_preference, bool):
                    profile.display_legal_structure = display_preference
                else:
                    return Response({
                        'error': 'display_legal_structure must be a boolean',
                        'request_id': request_id
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                updated = True
                logger.info(f"[UserProfileMeView] Updated legal structure display preference to: {profile.display_legal_structure}")
            
            # Save profile if any updates were made
            if updated:
                profile.save()
            
            # Return updated profile data (reuse the GET logic)
            return self.get(request)
            
        except Exception as e:
            logger.error(f"[UserProfileMeView] Error updating user profile: {str(e)}")
            return Response({
                'error': 'Failed to update user profile',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)