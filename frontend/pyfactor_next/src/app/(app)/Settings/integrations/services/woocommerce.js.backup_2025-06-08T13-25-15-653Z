// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/integrations/services/woocommerce.js
import axios from 'axios';

export const fetchWooCommerceOrders = async (siteUrl, consumerKey, consumerSecret) => {
  try {
    const response = await axios.get(`${siteUrl}/wp-json/wc/v3/orders`, {
      auth: {
        username: consumerKey,
        password: consumerSecret,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce orders:', error);
    throw error;
  }
};

export const fetchWooCommerceCustomers = async (siteUrl, consumerKey, consumerSecret) => {
  try {
    const response = await axios.get(`${siteUrl}/wp-json/wc/v3/customers`, {
      auth: {
        username: consumerKey,
        password: consumerSecret,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce customers:', error);
    throw error;
  }
};
