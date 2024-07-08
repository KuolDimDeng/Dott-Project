from django.shortcuts import render, redirect
from django.views import View
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Business
from integrations.models import Integration
from .forms import BusinessRegistrationForm
from .serializers import BusinessSerializer, BusinessRegistrationSerializer
from users.models import UserProfile
import requests
from pyfactor.logging_config import get_logger  # Change this line
from rest_framework.decorators import api_view, permission_classes
from .models import Business, Subscription


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
    logger.info(f"get_business_data view hit for user: {request.user}")
    try:
        business = Business.objects.get(owners=request.user)
        logger.info(f"Business found: {business}, Type: {business.business_type}")
        subscriptions = Subscription.objects.filter(business=business)
        logger.info(f"Subscriptions found: {subscriptions}")
        
        data = {
            'business_type': business.business_type,
            'subscriptions': [
                {
                    'subscription_type': sub.subscription_type,
                    'is_active': sub.is_active
                } for sub in subscriptions
            ]
        }
        logger.info(f"Returning data: {data}")
        return Response(data)
    except Business.DoesNotExist:
        logger.warning(f"No business found for user: {request.user}")
        return Response({'error': 'Business not found'}, status=404)
    except Exception as e:
        logger.error(f"Error in get_business_data: {str(e)}")
        return Response({'error': str(e)}, status=500)