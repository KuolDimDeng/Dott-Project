from celery import shared_task
from .services.shopify_utils import get_shopify_orders, get_shopify_products, get_shopify_customers
from .models import ShopifyIntegration, ShopifyOrder, ShopifyProduct, ShopifyCustomer, ShopifyOrderItem
from django.db import transaction as db_transaction, connections
from pyfactor.logging_config import get_logger
from users.models import UserProfile, User
from django.conf import settings
from pyfactor.userDatabaseRouter import UserDatabaseRouter
import traceback
from pyfactor.user_console import console


logger = get_logger()

@shared_task
def fetch_shopify_data(shop, access_token):
    logger.info(f"fetch_shopify_data task started for shop: {shop}")
    console.info(f"fetch_shopify_data task started for shop: {shop}")
    try:
        logger.debug(f"Attempting to retrieve ShopifyIntegration for shop: {shop}")
        console.info(f"Attempting to retrieve ShopifyIntegration for shop: {shop}")
        integration = ShopifyIntegration.objects.get(shop_url=shop)
        logger.debug(f"ShopifyIntegration retrieved successfully for shop: {shop}")
        console.info(f"ShopifyIntegration retrieved successfully for shop: {shop}")

        logger.debug(f"Attempting to retrieve user for integration: {integration.user_id}")
        console.info(f"Attempting to retrieve user for integration: {integration.user_id}")
        user = User.objects.get(id=integration.user_id)
        logger.debug(f"User retrieved successfully: {user.email}")
        console.info(f"User retrieved successfully: {user.email}")

        logger.debug(f"Attempting to retrieve UserProfile for user: {user.email}")
        console.info(f"Attempting to retrieve UserProfile for user: {user.email}")
        try:
            user_profile = UserProfile.objects.using('default').get(user=user)
        except UserProfile.DoesNotExist:
            logger.warning(f"UserProfile for user {user.email} does not exist. Creating one.")
            console.error(f"UserProfile for user {user.email} does not exist. Creating one.")
            user_profile = UserProfile.objects.create(user=user, database_name=f"{user.id}_{user.email.split('@')[0]}")
        
        logger.debug(f"UserProfile retrieved successfully for user: {user.email}")
        console.info(f"UserProfile retrieved successfully for user: {user.email}")

        database_name = user_profile.database_name
        logger.info(f"Using database: {database_name} for shop: {shop}")

        # Use the UserDatabaseRouter to create the dynamic database if it doesn't exist
        router = UserDatabaseRouter()
        if database_name not in settings.DATABASES:
            logger.info(f"Creating dynamic database: {database_name}")
            router.create_dynamic_database(database_name)

        # Ensure the database connection is established
        if database_name not in connections.databases:
            logger.info(f"Adding database connection for: {database_name}")
            connections.databases[database_name] = settings.DATABASES[database_name]
        
        with db_transaction.atomic(using=database_name):
            # Fetch orders
            try:
                logger.info(f"Fetching orders for shop: {shop}")
                console.info(f"Fetching orders for shop: {shop}")
                orders = get_shopify_orders(shop, access_token)
                logger.info(f"API call for orders returned {len(orders)} items")
                console.info(f"API call for orders returned {len(orders)} items")
                if orders:
                    logger.debug(f"Sample order data: {orders[0].__dict__}")
                
                for index, order in enumerate(orders, start=1):
                    logger.debug(f"Processing order {index}/{len(orders)} (ID: {order.id}) for shop: {shop}")
                    shopify_order, created = ShopifyOrder.objects.using(database_name).update_or_create(
                        integration=integration,
                        id=order.id,
                        defaults={
                            'email': order.email,
                            'created_at': order.created_at,
                            'updated_at': order.updated_at,
                            'total_price': order.total_price,
                            'subtotal_price': order.subtotal_price,
                            'currency': order.currency,
                            'financial_status': order.financial_status,
                            'fulfillment_status': order.fulfillment_status,
                            'customer_id': order.customer.id if order.customer else None,
                            'shipping_address': str(order.shipping_address),
                            'billing_address': str(order.billing_address)
                        }
                    )
                    logger.debug(f"Order {order.id} {'created' if created else 'updated'}")

                    logger.debug(f"Processing {len(order.line_items)} line items for order {order.id}")
                    for item in order.line_items:
                        ShopifyOrderItem.objects.using(database_name).update_or_create(
                            order=shopify_order,
                            product_id=item.product_id,
                            defaults={
                                'variant_id': item.variant_id,
                                'title': item.title,
                                'quantity': item.quantity,
                                'price': item.price,
                                'sku': item.sku
                            }
                        )
                    logger.debug(f"Finished processing line items for order {order.id}")
            except Exception as e:
                logger.exception(f"Error processing orders for {shop}: {str(e)}")

            # Fetch products
            try:
                logger.info(f"Fetching products for shop: {shop}")
                console.info(f"Fetching products for shop: {shop}")  # Replace with actual console logging if needed
                products = get_shopify_products(shop, access_token)
                logger.info(f"API call for products returned {len(products)} items")
                console.info(f"API call for products returned {len(products)} items")  #
                if products:
                    logger.debug(f"Sample product data: {products[0].__dict__}")
                
                for index, product in enumerate(products, start=1):
                    logger.debug(f"Processing product {index}/{len(products)} (ID: {product.id}) for shop: {shop}")
                    ShopifyProduct.objects.using(database_name).update_or_create(
                        integration=integration,
                        product_id=product.id,
                        defaults={
                            'title': product.title,
                            'body_html': product.body_html,
                            'vendor': product.vendor,
                            'product_type': product.product_type,
                            'created_at': product.created_at,
                            'updated_at': product.updated_at,
                            'published_at': product.published_at,
                            'template_suffix': product.template_suffix,
                            'status': product.status,
                            'published_scope': product.published_scope,
                            'tags': product.tags,
                            'admin_graphql_api_id': product.admin_graphql_api_id
                        }
                    )
            except Exception as e:
                logger.exception(f"Error processing products for {shop}: {str(e)}")
                console.error(f"Error processing products for {shop}: {str(e)}")

            # Fetch customers
            try:
                logger.info(f"Fetching customers for shop: {shop}")
                console.info(f"Fetching customers for shop: {shop}")  # Replace with actual console logging if needed
                customers = get_shopify_customers(shop, access_token)
                logger.info(f"API call for customers returned {len(customers)} items")
                if customers:
                    logger.debug(f"Sample customer data: {customers[0].__dict__}")
                
                for index, customer in enumerate(customers, start=1):
                    logger.debug(f"Processing customer {index}/{len(customers)} (ID: {customer.id}) for shop: {shop}")
                    ShopifyCustomer.objects.using(database_name).update_or_create(
                        integration=integration,
                        customer_id=customer.id,
                        defaults={
                            'email': customer.email,
                            'first_name': customer.first_name,
                            'last_name': customer.last_name,
                            'created_at': customer.created_at,
                            'updated_at': customer.updated_at
                        }
                    )
            except Exception as e:
                logger.exception(f"Error processing customers for {shop}: {str(e)}")
                console.error(f"Error processing customers for {shop}: {str(e)}")

        logger.info(f"Successfully fetched and stored Shopify data for shop: {shop}")
        console.info(f"Successfully fetched and stored Shopify data for shop: {shop}")
        logger.info(f"Summary for shop {shop}:")
        logger.info(f"  - Orders: {len(orders)}")
        logger.info(f"  - Products: {len(products)}")
        logger.info(f"  - Customers: {len(customers)}")
        
    except ShopifyIntegration.DoesNotExist:
        logger.error(f"ShopifyIntegration for shop {shop} does not exist")
        console.error(f"ShopifyIntegration for shop {shop} does not exist")
    except User.DoesNotExist:
        logger.error(f"User for ShopifyIntegration {integration.id} does not exist")
        console.error(f"User for ShopifyIntegration {integration.id} does not exist")
    except Exception as e:
        logger.exception(f"Unexpected error in fetch_shopify_data for {shop}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        console.error(f"Unexpected error in fetch_shopify_data for {shop}: {str(e)}")

    logger.info(f"fetch_shopify_data task completed for shop: {shop}")
    console.info(f"fetch_shopify_data task completed for shop: {shop}")