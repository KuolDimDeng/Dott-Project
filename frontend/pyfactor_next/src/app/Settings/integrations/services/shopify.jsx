// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/integrations/services/shopify.js
import axios from 'axios';

export const fetchShopifyOrders = async (shopName, accessToken) => {
  try {
    const response = await axios.get(
      `https://${shopName}.myshopify.com/admin/api/2023-04/orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );
    return response.data.orders;
  } catch (error) {
    console.error('Error fetching Shopify orders:', error);
    throw error;
  }
};

export const fetchShopifyCustomers = async (shopName, accessToken) => {
  try {
    const response = await axios.get(
      `https://${shopName}.myshopify.com/admin/api/2023-04/customers.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );
    return response.data.customers;
  } catch (error) {
    console.error('Error fetching Shopify customers:', error);
    throw error;
  }
};
