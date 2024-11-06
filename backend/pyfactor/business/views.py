from django.shortcuts import get_object_or_404, render, redirect
from django.views import View
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Business, BusinessMember
from integrations.models import Integration
from .forms import BusinessRegistrationForm
from .serializers import AddBusinessMemberSerializer, BusinessSerializer, BusinessRegistrationSerializer
from users.models import UserProfile
import requests
from django.contrib.auth import get_user_model
import stripe
from django.urls import reverse
from django.conf import settings

from pyfactor.logging_config import get_logger  # Change this line
from rest_framework.decorators import api_view, permission_classes
from .models import Business, Subscription

User = get_user_model()

stripe.api_key = settings.STRIPE_SECRET_KEY


logger = get_logger()

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
                if not business.members.filter(id=request.user.id, businessmember__role='OWNER').exists():
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
        try:
            billing_cycle = request.data.get('billingCycle', 'monthly')
            price_id = settings.STRIPE_PRICE_ID_MONTHLY if billing_cycle == 'monthly' else settings.STRIPE_PRICE_ID_ANNUAL

            checkout_session = stripe.checkout.Session.create(
                client_reference_id=request.user.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=request.build_absolute_uri(reverse('onboarding:onboarding_success')) + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=request.build_absolute_uri(reverse('onboarding:save_step3')),
            )
            return Response({'sessionId': checkout_session.id})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)