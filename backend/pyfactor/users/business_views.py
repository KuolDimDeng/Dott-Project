#/Users/kuoldeng/projectx/backend/pyfactor/users/business_views.py
from django.shortcuts import get_object_or_404, render, redirect
from django.views import View
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Business, BusinessMember
from integrations.models import Integration
from .forms import BusinessRegistrationForm
from .business_serializers import AddBusinessMemberSerializer, BusinessSerializer, BusinessRegistrationSerializer
from .models import UserProfile
import requests
from django.contrib.auth import get_user_model
# TODO: TEMPORARY FIX - Comment out stripe import to bypass ModuleNotFoundError
# import stripe
from django.urls import reverse
from django.conf import settings

from pyfactor.logging_config import get_logger
from rest_framework.decorators import api_view, permission_classes
from .models import Business, Subscription
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.db.models import Q

User = get_user_model()

# TODO: TEMPORARY FIX - Comment out stripe API key setting
# stripe.api_key = settings.STRIPE_SECRET_KEY

logger = get_logger()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def business_search(request):
    """
    Search for businesses based on provided search parameters.
    
    Parameters:
    - query: search string to match against business name
    - business_type: filter by business type
    - country: filter by country
    """
    try:
        query = request.query_params.get('query', '')
        business_type = request.query_params.get('business_type', None)
        country = request.query_params.get('country', None)
        
        # First check if user has a business through their profile
        user_profile = UserProfile.objects.filter(user=request.user).first()
        if user_profile and user_profile.business:
            # User already has a business
            business = user_profile.business
            business_data = BusinessSerializer(business).data
            return Response([business_data])  # Return as a list for consistency
        
        # For staff users, return all businesses
        if request.user.is_staff:
            businesses = Business.objects.all()
            
            # Apply filters
            if query:
                businesses = businesses.filter(name__icontains=query)
            
            if business_type:
                # Get business IDs with matching type from BusinessDetails
                from users.models import BusinessDetails
                business_ids = BusinessDetails.objects.filter(
                    business_type=business_type
                ).values_list('business_id', flat=True)
                businesses = businesses.filter(id__in=business_ids)
                
            if country:
                # Get business IDs with matching country from BusinessDetails
                from users.models import BusinessDetails
                business_ids = BusinessDetails.objects.filter(
                    country=country
                ).values_list('business_id', flat=True)
                businesses = businesses.filter(id__in=business_ids)
            
            # Serialize and return results
            serializer = BusinessSerializer(businesses, many=True)
            return Response(serializer.data)
        
        # Regular users only see businesses they're associated with via BusinessMember
        try:
            from users.models import BusinessMember
            # Get business IDs where user is a member
            business_ids = BusinessMember.objects.filter(
                user=request.user
            ).values_list('business_id', flat=True)
            
            if not business_ids:
                # User is not a member of any business
                return Response([])
                
            businesses = Business.objects.filter(id__in=business_ids)
            
            # Apply filters same as above
            if query:
                businesses = businesses.filter(name__icontains=query)
            
            if business_type or country:
                # Filter through BusinessDetails if needed
                from users.models import BusinessDetails
                detail_filters = {}
                
                if business_type:
                    detail_filters['business_type'] = business_type
                
                if country:
                    detail_filters['country'] = country
                    
                if detail_filters:
                    business_ids = BusinessDetails.objects.filter(
                        business_id__in=business_ids,
                        **detail_filters
                    ).values_list('business_id', flat=True)
                    businesses = businesses.filter(id__in=business_ids)
            
            # Serialize and return results
            serializer = BusinessSerializer(businesses, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error filtering businesses: {str(e)}")
            return Response([], status=200)  # Return empty array instead of error
    
    except Exception as e:
        logger.error(f"Error searching businesses: {str(e)}")
        return Response(
            {"error": "An error occurred while searching businesses"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_business_details(request):
    """
    Get detailed information about a business.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business

        if not business:
            return Response({'error': 'No business found for user'}, status=404)
            
        # Get detailed business information
        # This could be expanded to include more detailed information as needed
        business_data = BusinessSerializer(business).data
        
        # You can add more data here as needed
        
        return Response(business_data)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting business details: {str(e)}")
        return Response({'error': 'An internal server error occurred'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_subscription(request):
    """
    Get the subscription information for the current user's business.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
            
        try:
            subscription = Subscription.objects.filter(business=business, is_active=True).latest('start_date')
            return Response({
                'plan': subscription.selected_plan,
                'is_active': subscription.is_active,
                'start_date': subscription.start_date,
                'billing_cycle': subscription.billing_cycle
            })
        except Subscription.DoesNotExist:
            return Response({'plan': 'free', 'is_active': True})
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting user subscription: {str(e)}")
        return Response({'error': 'An internal server error occurred'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_business(request):
    """
    Update basic business information.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
            
        serializer = BusinessSerializer(business, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error updating business: {str(e)}")
        return Response({'error': 'An internal server error occurred'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_business_details(request):
    """
    Update detailed business information.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
            
        # This assumes business details are part of the Business model
        # If they're in a separate model, you'd need to fetch and update that
        serializer = BusinessSerializer(business, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error updating business details: {str(e)}")
        return Response({'error': 'An internal server error occurred'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_business(request):
    """
    Create a new business.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        
        # Check if user already has a business
        if user_profile.business:
            return Response({'error': 'User already has a business'}, status=400)
            
        serializer = BusinessSerializer(data=request.data)
        if serializer.is_valid():
            business = serializer.save(owner=request.user)
            
            # Update user profile with new business
            user_profile.business = business
            user_profile.save()
            
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error creating business: {str(e)}")
        return Response({'error': 'An internal server error occurred'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_business_details(request):
    """
    Create detailed business information.
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
            
        # This assumes business details are part of the Business model
        # If they're in a separate model, you'd need to create that separately
        serializer = BusinessSerializer(business, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error creating business details: {str(e)}")
        return Response({'error': 'An internal server error occurred'}, status=500)

class BusinessRegistrationView(View):
    logger.debug("BusinessRegistrationView get method called")
    
    def get(self, request):
        logger.debug("BusinessRegistrationView get method called with request.user: %s", request.user)
        form = BusinessRegistrationForm()
        return render(request, 'business/registration.html', {'form': form})

    def post(self, request):
        logger.debug("BusinessRegistrationView post method called with request.user: %s", request.user)
        form = BusinessRegistrationForm(request.POST)
        if form.is_valid():
            business = form.save(commit=False)
            
            # Assuming the user is already authenticated
            logger.debug("Updating user profile with business: %s", business)
            user_profile = UserProfile.objects.get(user=request.user)
            business.user = request.user
            business.save()
            
            # Update the user profile with the business
            logger.debug('Updating user profile with business: %s', business)
            user_profile.business = business
            user_profile.save()

            if business.business_type == 'ecommerce':
                return redirect('ecommerce_platform_selection')
            return redirect('dashboard')
        return render(request, 'business/registration.html', {'form': form})

class EcommerceIntegrationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        integrations = [
            {"name": "WooCommerce", "url": "/integrate/woocommerce/"},
            {"name": "Shopify", "url": "/integrate/shopify/"},
        ]
        return Response({"integrations": integrations})
    


class WooCommerceIntegrationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        consumer_key = request.data.get('consumer_key')
        consumer_secret = request.data.get('consumer_secret')
        store_url = request.data.get('store_url')

        if not all([consumer_key, consumer_secret, store_url]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        response = requests.get(
            f"{store_url}/wp-json/wc/v3/orders",
            auth=(consumer_key, consumer_secret)
        )

        if response.status_code == 200:
            orders = response.json()
            return Response({"message": "WooCommerce integration successful.", "orders": orders})
        else:
            return Response({"error": "Failed to connect to WooCommerce"}, status=status.HTTP_400_BAD_REQUEST)

def ecommerce_platform_selection(request):
    if request.method == 'POST':
        platform = request.POST.get('platform')
        if platform:
            Integration.objects.create(
                user_profile=request.user.profile,
                platform=platform,
                is_active=False
            )
            return redirect('dashboard')
    
    platforms = Integration.PLATFORM_CHOICES
    return render(request, 'business/ecommerce_platform_selection.html', {'platforms': platforms})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_business_data(request):
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business

        if business:
            business_data = BusinessSerializer(business).data
            return Response(business_data)
        else:
            return Response({'error': 'No business found for user'}, status=404)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        return Response({'error': 'An internal server error occurred'}, status=500)

class AddBusinessMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddBusinessMemberSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            role = serializer.validated_data['role']
            business_id = serializer.validated_data['business_id']

            try:
                business = Business.objects.get(id=business_id)
                if not business.business_memberships.filter(user=request.user, role='owner').exists():
                    return Response({"detail": "You don't have permission to add members to this business."}, status=status.HTTP_403_FORBIDDEN)

                user_to_add = User.objects.get(email=email)

                if BusinessMember.objects.filter(business=business, user=user_to_add).exists():
                    return Response({"detail": "This user is already associated with the business."}, status=status.HTTP_400_BAD_REQUEST)

                business_member = BusinessMember.objects.create(
                    business=business,
                    user=user_to_add,
                    role=role
                )

                logger.info(f"User {email} added to business {business.business_name} with role {role}")
                return Response({"detail": f"User {email} added to the business with role {role}."}, status=status.HTTP_201_CREATED)

            except Business.DoesNotExist:
                return Response({"detail": "Business not found."}, status=status.HTTP_404_NOT_FOUND)
            except User.DoesNotExist:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                logger.error(f"Error adding business member: {str(e)}")
                return Response({"detail": "An error occurred while adding the business member."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        

class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # TODO: TEMPORARY FIX - Return error since stripe is disabled
        return Response({
            'error': 'Stripe checkout is temporarily disabled due to dependency issues'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # ORIGINAL CODE (commented out temporarily):
        # try:
        #     billing_cycle = request.data.get('billingCycle', 'monthly')
        #     price_id = settings.STRIPE_PRICE_ID_MONTHLY if billing_cycle == 'monthly' else settings.STRIPE_PRICE_ID_ANNUAL
        #
        #     # Get the user's business
        #     user_profile = UserProfile.objects.get(user=request.user)
        #     business = user_profile.business
        #     
        #     # Store metadata about the subscription
        #     metadata = {
        #         'user_id': str(request.user.id),
        #         'business_id': str(business.id),
        #         'selected_plan': 'professional',  # Since this is a checkout for professional plan
        #         'billing_cycle': billing_cycle
        #     }
        #
        #     checkout_session = stripe.checkout.Session.create(
        #         client_reference_id=request.user.id,
        #         payment_method_types=['card'],
        #         line_items=[{
        #             'price': price_id,
        #             'quantity': 1,
        #         }],
        #         mode='subscription',
        #         success_url=request.build_absolute_uri(reverse('onboarding:onboarding_success')) + '?session_id={CHECKOUT_SESSION_ID}',
        #         cancel_url=request.build_absolute_uri(reverse('onboarding:save_step3')),
        #         metadata=metadata,
        #     )
        #     return Response({'sessionId': checkout_session.id})
        # except Exception as e:
        #     return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def update_storage_quota(business_id, selected_plan):
    """Update storage quota based on subscription plan"""
    try:
        # Get the business owner
        business = Business.objects.get(id=business_id)
        user = business.owner
        
        # Get the user's tenant
        from custom_auth.models import Tenant
        tenant = Tenant.objects.get(owner=user)
        
        # Set quota based on plan
        if selected_plan == 'professional':
            quota_bytes = 30 * 1024 * 1024 * 1024  # 30GB
            logger.info(f"Increasing storage quota to 30GB for user {user.id} (professional plan)")
        else:
            quota_bytes = 2 * 1024 * 1024 * 1024  # 2GB
            logger.info(f"Setting storage quota to 2GB for user {user.id} (free plan)")
        
        # Update tenant quota
        tenant.storage_quota_bytes = quota_bytes
        tenant.save(update_fields=['storage_quota_bytes'])
        
        # Update database-level quota if needed
        from onboarding.utils import apply_database_quota
        if  tenant.id and tenant.is_active:
            try:
                apply_database_quota( tenant.id, quota_bytes)
            except Exception as e:
                logger.error(f"Failed to apply database quota: {str(e)}")
                # Continue even if database quota update fails
                
        return True
    except Exception as e:
        logger.error(f"Failed to update storage quota: {str(e)}")
        return False

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_subscription_plan(request):
    """Update a user's subscription plan and storage quota"""
    try:
        # Get the plan from request
        selected_plan = request.data.get('selected_plan')
        if not selected_plan in ['free', 'professional']:
            return Response({'error': 'Invalid plan'}, status=400)
            
        # Get the user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
        
        # Update subscription
        subscription, created = Subscription.objects.update_or_create(
            business=business,
            defaults={
                'selected_plan': selected_plan,
                'is_active': True,
                'start_date': timezone.now().date(),
                'billing_cycle': request.data.get('billing_cycle', 'monthly')
            }
        )
        
        # Update storage quota
        update_storage_quota(business.id, selected_plan)
        
        # Update Cognito attributes if applicable
        try:
            from custom_auth.cognito import update_user_attributes_sync
            update_user_attributes_sync(str(request.user.id), {
                'custom:subplan': selected_plan
            })
        except Exception as e:
            logger.error(f"Failed to update Cognito attributes: {str(e)}")
        
        return Response({
            'status': 'success',
            'plan': selected_plan,
            'is_active': subscription.is_active
        })
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        return Response({'error': str(e)}, status=500)



@csrf_exempt
def stripe_webhook(request):
    # TODO: TEMPORARY FIX - Return early since stripe is disabled
    return HttpResponse("Stripe webhook temporarily disabled", status=503)
    
    # ORIGINAL CODE (commented out temporarily):
    # payload = request.body
    # sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    # 
    # try:
    #     event = stripe.Webhook.construct_event(
    #         payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
    #     )
    # except ValueError as e:
    #     # Invalid payload
    #     return HttpResponse(status=400)
    # except stripe.error.SignatureVerificationError as e:
    #     # Invalid signature
    #     return HttpResponse(status=400)
    #     
    # # Handle the checkout.session.completed event
    # if event.type == 'checkout.session.completed':
    #     session = event.data.object
    #     
    #     # Retrieve the subscription from metadata
    #     metadata = session.metadata
    #     business_id = metadata.get('business_id')
    #     selected_plan = metadata.get('selected_plan')
    #     
    #     if business_id and selected_plan:
    #         # Process the subscription
    #         try:
    #             business = Business.objects.get(id=business_id)
    #             
    #             # Create/update subscription record
    #             Subscription.objects.update_or_create(
    #                 business=business,
    #                 defaults={
    #                     'selected_plan': selected_plan,
    #                     'is_active': True,
    #                     'start_date': timezone.now().date(),
    #                     'billing_cycle': metadata.get('billing_cycle', 'monthly')
    #                 }
    #             )
    #             
    #             # Update storage quota
    #             update_storage_quota(business_id, selected_plan)
    #             
    #             logger.info(f"Subscription updated via Stripe webhook for business {business_id}")
    #         except Exception as e:
    #             logger.error(f"Failed to process subscription from webhook: {str(e)}")
    # 
    # # Handle subscription events
    # elif event.type == 'customer.subscription.updated' or event.type == 'customer.subscription.created':
    #     subscription = event.data.object
    #     
    #     # Map the price ID to a plan
    #     plan_mapping = {
    #         settings.STRIPE_PRICE_ID_MONTHLY: 'professional',
    #         settings.STRIPE_PRICE_ID_ANNUAL: 'professional',
    #         # Add any other price IDs you use
    #     }
    #     
    #     # Get the price ID from the subscription
    #     if subscription.items.data and len(subscription.items.data) > 0:
    #         price_id = subscription.items.data[0].price.id
    #         
    #         # Find the user by customer ID
    #         try:
    #             # This assumes you store the Stripe customer ID with your user
    #             customer = stripe.Customer.retrieve(subscription.customer)
    #             user = User.objects.get(email=customer.email)
    #             
    #             # Get the business
    #             business = Business.objects.get(owner=user)
    #             
    #             # Determine the plan
    #             selected_plan = plan_mapping.get(price_id, 'free')
    #             
    #             # Update storage quota
    #             update_storage_quota(business.id, selected_plan)
    #             
    #             logger.info(f"Storage quota updated via subscription event for user {user.id}")
    #         except Exception as e:
    #             logger.error(f"Failed to update quota from subscription event: {str(e)}")
    #     
    # return HttpResponse(status=200)