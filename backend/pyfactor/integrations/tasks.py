from celery import shared_task
from .services.shopify_utils import get_shopify_orders, get_shopify_products, get_shopify_customers
from .models import ShopifyIntegration, ShopifyOrder, ShopifyProduct, ShopifyCustomer, ShopifyOrderItem
from django.db import transaction as db_transaction, connections
from pyfactor.logging_config import get_logger
from users.models import UserProfile, User
from django.conf import settings
from pyfactor.userDatabaseRouter import UserDatabaseRouter

logger = get_logger()

@shared_task
def fetch_shopify_data(shop, access_token):
    logger.info(f"Starting to fetch Shopify data for shop: {shop}")
    try:
        logger.debug(f"Attempting to retrieve ShopifyIntegration for shop: {shop}")
        integration = ShopifyIntegration.objects.get(shop_url=shop)
        logger.debug(f"ShopifyIntegration retrieved successfully for shop: {shop}")

        logger.debug(f"Attempting to retrieve user for integration: {integration.user_id}")
        user = User.objects.get(id=integration.user_id)
        logger.debug(f"User retrieved successfully: {user.email}")

        logger.debug(f"Attempting to retrieve UserProfile for user: {user.email}")
        try:
            user_profile = UserProfile.objects.using('default').get(user=user)
        except UserProfile.DoesNotExist:
            logger.warning(f"UserProfile for user {user.email} does not exist. Creating one.")
            user_profile = UserProfile.objects.create(user=user, database_name=f"{user.id}_{user.email.split('@')[0]}")
        
        logger.debug(f"UserProfile retrieved successfully for user: {user.email}")

        database_name = user_profile.database_name
        logger.info(f"Using database: {database_name} for shop: {shop}")

        # Use the UserDatabaseRouter to create the dynamic database if it doesn't exist
        router = UserDatabaseRouter()
        if database_name not in settings.DATABASES:
            router.create_dynamic_database(database_name)

        # Ensure the database connection is established
        if database_name not in connections.databases:
            connections.databases[database_name] = settings.DATABASES[database_name]
        
        with db_transaction.atomic(using=database_name):
            # Fetch orders
            logger.info(f"Fetching orders for shop: {shop}")
            orders = get_shopify_orders(shop, access_token)
            logger.info(f"Retrieved {len(orders)} orders for shop: {shop}")
            
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

                # Create or update order items
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

            # Fetch products
            logger.info(f"Fetching products for shop: {shop}")
            products = get_shopify_products(shop, access_token)
            logger.info(f"Retrieved {len(products)} products for shop: {shop}")
            
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

            # Fetch customers
            logger.info(f"Fetching customers for shop: {shop}")
            customers = get_shopify_customers(shop, access_token)
            logger.info(f"Retrieved {len(customers)} customers for shop: {shop}")
            
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

        logger.info(f"Successfully fetched and stored Shopify data for shop: {shop}")
        logger.info(f"Summary for shop {shop}:")
        logger.info(f"  - Orders: {len(orders)}")
        logger.info(f"  - Products: {len(products)}")
        logger.info(f"  - Customers: {len(customers)}")
        
    except ShopifyIntegration.DoesNotExist:
        logger.error(f"ShopifyIntegration for shop {shop} does not exist")
    except User.DoesNotExist:
        logger.error(f"User for ShopifyIntegration {integration.id} does not exist")
    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile for user {user.email} does not exist")
    except Exception as e:
        logger.exception(f"Error fetching Shopify data for {shop}: {str(e)}")