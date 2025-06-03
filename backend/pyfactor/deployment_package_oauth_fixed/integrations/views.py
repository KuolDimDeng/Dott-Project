from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.db import connections, transaction as db_transaction
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from woocommerce import API
from .services.shopify_utils import generate_nonce, exchange_code_for_token, store_access_token
from users.forms import BusinessRegistrationForm
from users.models import UserProfile
from .models import Integration, WooCommerceIntegration, ShopifyIntegration, ShopifyOrder, ShopifyOrderItem
from .services.woocommerce import fetch_and_store_orders
from .services.shopify_utils import initialize_shopify_session, get_shopify_orders, exchange_code_for_token, store_access_token
from .serializers import WooCommerceIntegrationSerializer, ShopifyIntegrationSerializer
from pyfactor.logging_config import get_logger
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework import status
from django.core.cache import cache
from .tasks import fetch_shopify_data

import traceback


logger = get_logger()

@api_view(['POST'])
def initiate_shopify_oauth(request):
    logger.info("Initiate Shopify OAuth view called")
    logger.info(f"Request data: {request.data}")
    logger.info(f"User: {request.user}")
    logger.info(f"Request method: {request.method}")
    
    try:
        shop = request.data.get('shop')
        if not shop:
            logger.error("Shop URL is required but not provided")
            return JsonResponse({"error": "Shop URL is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Initiating OAuth for shop: {shop}")
        
        scopes = 'read_products,write_products,read_orders,write_orders'
        redirect_uri = f"{settings.APP_URL}/api/integrations/shopify-oauth-callback/"
        nonce = generate_nonce()
        
        auth_url = f"https://{shop}/admin/oauth/authorize?client_id={settings.SHOPIFY_API_KEY}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}"
        
        logger.info(f"Generated auth URL: {auth_url}")
        logger.info(f"Generated nonce: {nonce}")
        
        # Store nonce in cache
        cache_key = f"shopify_oauth_nonce_{shop}"
        cache.set(cache_key, nonce, 300)  # Store for 5 minutes
        
        logger.info(f"Nonce stored in cache with key: {cache_key}")
        
        return JsonResponse({"authUrl": auth_url})
    
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return JsonResponse({"error": "An internal server error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def shopify_oauth_callback(request):
        logger.info("Shopify OAuth callback received")
        logger.info(f"Query params: {request.GET}")
        
        shop = request.GET.get('shop')
        code = request.GET.get('code')
        state = request.GET.get('state')
        
        logger.info(f"Shop: {shop}")
        logger.info(f"Code: {code}")
        logger.info(f"State: {state}")
        
        # Retrieve the stored nonce from cache
        cache_key = f"shopify_oauth_nonce_{shop}"
        stored_nonce = cache.get(cache_key)
        logger.info(f"Stored nonce: {stored_nonce}")
        logger.info(f"Received state: {state}")
        
        # Verify the state (nonce) to prevent CSRF
        if state != stored_nonce:
            logger.error(f"Invalid state parameter. Expected: {stored_nonce}, Received: {state}")
            return Response({"error": "Invalid state parameter"}, status=400)
        
        logger.info("State verification successful")
        
        # Clear the nonce from cache
        cache.delete(cache_key)
        
        # Exchange the temporary code for a permanent access token
        access_token = exchange_code_for_token(shop, code)
        
        if access_token:
            logger.info(f"Successfully obtained access token for shop: {shop}")
                # Store the access token securely (e.g., encrypted in your database)
            try:
                logger.debug(f"Storing access token for shop: {shop}")
                store_access_token(shop, access_token)
                
                # Queue a background task to fetch Shopify data
                logger.debug(f"Queueing background task to fetch Shopify data for shop: {shop}")
                fetch_shopify_data.delay(shop, access_token)
                logger.debug(f"Background task queued for shop: {shop}")

                return redirect(f"{settings.FRONTEND_URL}/dashboard/integrations?status=success&platform=shopify")
            except Exception as e:
                logger.error(f"Error storing access token: {str(e)}")
                return redirect(f"{settings.FRONTEND_URL}/dashboard/integrations?status=error&platform=shopify&message=token_storage_failed")
        else:
            logger.error("Failed to obtain access token")
            return redirect(f"{settings.FRONTEND_URL}/dashboard/integrations?status=error&platform=shopify&message=token_acquisition_failed")

def setup_woocommerce(request):
    if request.method == 'POST':
        site_url = request.POST.get('site_url')
        consumer_key = request.POST.get('consumer_key')
        consumer_secret = request.POST.get('consumer_secret')

        integration = WooCommerceIntegration.objects.create(
            user_profile=request.user.profile,
            site_url=site_url,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret
        )

        # Fetch initial data
        fetch_and_store_orders(integration.id)

        return redirect('dashboard')  # or wherever you want to redirect after setup

    return render(request, 'integrations/setup_woocommerce.html')

def business_registration(request):
    if request.method == 'POST':
        form = BusinessRegistrationForm(request.POST)
        if form.is_valid():
            business = form.save(commit=False)
            business.user = request.user
            business.save()

            # Check if the business type is e-commerce
            if business.business_type == 'ecommerce':
                # Redirect to e-commerce platform selection
                return redirect('ecommerce_platform_selection')
            
            return redirect('dashboard')  # or wherever you want to redirect after successful registration
    else:
        form = BusinessRegistrationForm()

    return render(request, 'business/registration.html', {'form': form})

def ecommerce_platform_selection(request):
    if request.method == 'POST':
        platform = request.POST.get('platform')
        if platform:
            Integration.objects.create(
                user_profile=request.user.profile,
                platform=platform,
                is_active=False  # Set to True when the integration is fully set up
            )
            return redirect('dashboard')  # or to a setup page for the chosen platform
    
    platforms = Integration.PLATFORM_CHOICES
    return render(request, 'business/ecommerce_platform_selection.html', {'platforms': platforms})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_woocommerce(request):
    logger.debug(f"Connecting to WooCommerce for user: {request.user.username}")
    serializer = WooCommerceIntegrationSerializer(data=request.data)
    if serializer.is_valid():
        url = serializer.validated_data['site_url']
        consumer_key = serializer.validated_data['consumer_key']
        consumer_secret = serializer.validated_data['consumer_secret']

        wcapi = API(
            url=url,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            version="wc/v3"
        )

        try:
            # Try to fetch some test data (e.g., list of products)
            response = wcapi.get("products")
            if response.status_code == 200:
                # Connection successful, save or update the integration
                user_profile = UserProfile.objects.get(user=request.user)
                integration, created = WooCommerceIntegration.objects.update_or_create(
                    user_profile=user_profile,
                    defaults={
                        'site_url': url,
                        'consumer_key': consumer_key,
                        'consumer_secret': consumer_secret,
                        'is_active': True
                    }
                )
                return Response({
                    "status": "success",
                    "message": "Successfully connected to WooCommerce",
                    "data": response.json()[:5]  # Return first 5 products as test data
                })
            else:
                logger.error(f"Failed to connect to WooCommerce: {response.text}")
                return Response({
                    "status": "error",
                    "message": "Failed to connect to WooCommerce",
                    "error": response.text
                }, status=response.status_code)
        except Exception as e:
            logger.exception(f"Error connecting to WooCommerce: {str(e)}")
            return Response({
                "status": "error",
                "message": "An error occurred while connecting to WooCommerce",
                "error": str(e)
            }, status=500)
    else:
        logger.error(f"Invalid WooCommerce connection data: {serializer.errors}")
        return Response(serializer.errors, status=400)
            
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_shopify(request):
    logger.debug(f"Connecting to Shopify for user: {request.user.username}")
    serializer = ShopifyIntegrationSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        shop_url = serializer.validated_data['shop_url']
        access_token = serializer.validated_data['access_token']

        try:
            user_profile = UserProfile.objects.using('default').get(user=user)
            database_name = user_profile.database_name

            with db_transaction.atomic(using=database_name):
                # 1. Create or update ShopifyIntegration
                shopify_integration, created = ShopifyIntegration.objects.using(database_name).update_or_create(
                    user_profile=user_profile,
                    defaults={
                        'shop_url': shop_url,
                        'access_token': access_token,
                        'is_active': True
                    }
                )

                # 2. Clear existing Shopify orders (optional, depending on your use case)
                ShopifyOrderItem.objects.using(database_name).filter(order__integration=shopify_integration).delete()
                ShopifyOrder.objects.using(database_name).filter(integration=shopify_integration).delete()

                # 3. Initialize Shopify session and get orders
                access_token = initialize_shopify_session(shop_url, settings.SHOPIFY_API_KEY, settings.SHOPIFY_API_SECRET)
                orders = get_shopify_orders(shop_url, access_token, limit=250)

                # 4. Populate new tables with Shopify data
                for order in orders:
                    shopify_order = ShopifyOrder.objects.using(database_name).create(
                        integration=shopify_integration,
                        id=order.id,
                        email=order.email,
                        created_at=order.created_at,
                        updated_at=order.updated_at,
                        total_price=order.total_price,
                        subtotal_price=order.subtotal_price,
                        currency=order.currency,
                        financial_status=order.financial_status,
                        fulfillment_status=order.fulfillment_status,
                        customer_id=order.customer.id if order.customer else None,
                        shipping_address=str(order.shipping_address),
                        billing_address=str(order.billing_address)
                    )

                    for item in order.line_items:
                        ShopifyOrderItem.objects.using(database_name).create(
                            order=shopify_order,
                            product_id=item.product_id,
                            variant_id=item.variant_id,
                            title=item.title,
                            quantity=item.quantity,
                            price=item.price,
                            sku=item.sku
                        )

            logger.info(f"Successfully connected to Shopify for user: {user.username}")
            return Response({"success": True, "message": "Successfully connected to Shopify and updated orders"})

        except UserProfile.DoesNotExist:
            logger.error(f"User profile not found for user: {user.username}")
            return Response({"success": False, "error": "User profile not found"}, status=404)
        except Exception as e:
            logger.exception(f"Error connecting to Shopify for user {user.username}: {str(e)}")
            return Response({"success": False, "error": str(e)}, status=500)
    else:
        logger.error(f"Invalid Shopify connection data: {serializer.errors}")
        return Response(serializer.errors, status=400)