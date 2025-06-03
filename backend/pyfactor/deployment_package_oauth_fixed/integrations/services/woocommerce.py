# backend/pyfactor/integrations/services/woocommerce.py
import requests
from datetime import datetime
from ..models import WooCommerceIntegration, WooCommerceOrder

def fetch_and_store_orders(integration_id):
    try:
        integration = WooCommerceIntegration.objects.get(id=integration_id)
        
        response = requests.get(
            f"{integration.site_url}/wp-json/wc/v3/orders",
            auth=(integration.consumer_key, integration.consumer_secret)
        )

        if response.status_code == 200:
            orders = response.json()
            for order_data in orders:
                WooCommerceOrder.objects.update_or_create(
                    integration=integration,
                    order_id=order_data['id'],
                    defaults={
                        'status': order_data['status'],
                        'currency': order_data['currency'],
                        'total': order_data['total'],
                        'date_created': datetime.strptime(order_data['date_created'], '%Y-%m-%dT%H:%M:%S'),
                        'billing': order_data['billing'],
                        'shipping': order_data['shipping'],
                        'line_items': order_data['line_items'],
                    }
                )
            return True
        else:
            print(f"Error fetching orders: {response.status_code}")
            return False
    except WooCommerceIntegration.DoesNotExist:
        print(f"WooCommerce integration with id {integration_id} does not exist")
        return False
    except Exception as e:
        print(f"Error fetching and storing orders: {str(e)}")
        return False