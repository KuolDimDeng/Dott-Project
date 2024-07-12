import shopify
import requests
from django.conf import settings
from django.core import signing
from ..models import ShopifyIntegration
from pyfactor.logging_config import get_logger
from django.contrib.auth import get_user_model
from users.models import UserProfile
import secrets
from django.db import transaction as db_transaction

User = get_user_model()

logger = get_logger()

def initialize_shopify_session(shop_url, api_key, api_secret):
    shopify.ShopifyResource.set_site(f"https://{api_key}:{api_secret}@{shop_url}/admin/api/2023-04")
    session = shopify.Session(shop_url, '2023-04', api_key)
    access_token = shopify.Session.request_token(session, api_secret)
    return session, access_token

def get_shopify_orders(shop, access_token):
    session = shopify.Session(shop, version='2024-01', token=access_token)
    shopify.ShopifyResource.activate_session(session)
    try:
        return shopify.Order.find()
    finally:
        shopify.ShopifyResource.clear_session()

def get_shopify_products(shop, access_token):
    session = shopify.Session(shop, version='2024-01', token=access_token)
    shopify.ShopifyResource.activate_session(session)
    try:
        return shopify.Product.find()
    finally:
        shopify.ShopifyResource.clear_session()

def get_shopify_customers(shop, access_token):
    session = shopify.Session(shop, version='2024-01', token=access_token)
    shopify.ShopifyResource.activate_session(session)
    try:
        return shopify.Customer.find()
    finally:
        shopify.ShopifyResource.clear_session()

def generate_nonce(length=32):
    return secrets.token_urlsafe(length)

def exchange_code_for_token(shop, code):
    logger.info(f"Exchanging code for token. Shop: {shop}")
    try:
        url = f"https://{shop}/admin/oauth/access_token"
        data = {
            'client_id': settings.SHOPIFY_API_KEY,
            'client_secret': settings.SHOPIFY_API_SECRET,
            'code': code
        }
        response = requests.post(url, data=data)
        logger.info(f"Token exchange response status: {response.status_code}")
        
        if response.status_code == 200:
            return response.json().get('access_token')
        else:
            logger.error(f"Failed to exchange code for token. Status: {response.status_code}")
            logger.error(f"Response content: {response.text[:100]}...")  # Log first 100 characters of response
            return None
    except requests.RequestException as e:
        logger.exception(f"Exception during token exchange: {str(e)}")
        return None

def store_access_token(shop, access_token):
    logger.info(f"Storing access token for shop: {shop}")
    try:
        with db_transaction.atomic():
            integration, created = ShopifyIntegration.objects.get_or_create(shop_url=shop)
            integration.access_token = access_token
            integration.save()
        if created:
            logger.info(f"Created new ShopifyIntegration for shop: {shop}")
        else:
            logger.info(f"Updated existing ShopifyIntegration for shop: {shop}")
        logger.info("Access token stored successfully")
    except Exception as e:
        logger.exception(f"Exception while storing access token: {str(e)}")
        raise


if __name__ == "__main__":
    # Test code here (if needed)
    pass
