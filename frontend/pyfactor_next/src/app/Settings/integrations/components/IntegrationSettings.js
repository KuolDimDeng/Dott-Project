import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const PLATFORMS = [
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'shopify', label: 'Shopify' },
];

const IntegrationSettings = React.memo(
  ({ initialStatus, initialPlatform, initialBusinessData, title }) => {
    console.log('IntegrationSettings rendered', {
      initialStatus,
      initialPlatform,
      initialBusinessData,
      title,
    });
    const toast = useToast();

    const [businessData, setBusinessData] = useState(initialBusinessData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [wooCommerceData, setWooCommerceData] = useState({
      url: '',
      consumer_key: '',
      consumer_secret: '',
    });
    const [shopifyData, setShopifyData] = useState({
      shop: '',
    });
    const [connecting, setConnecting] = useState(false);
    const [currentPlatform, setCurrentPlatform] = useState('woocommerce');
    const [isShopifyConnected, setIsShopifyConnected] = useState(false);

    useEffect(() => {
      console.log('IntegrationSettings useEffect triggered', { initialBusinessData, loading });
      if (initialStatus && initialPlatform) {
        handleConnectionStatus(initialStatus, initialPlatform);
      }
    }, [initialStatus, initialPlatform]);

    const handleConnectionStatus = (status, platform) => {
      if (status === 'success' && platform === 'shopify') {
        toast.info('Successfully connected to Shopify!');
        setIsShopifyConnected(true);
      } else if (status === 'error' && platform === 'shopify') {
        toast.error('Failed to connect to Shopify. Please try again.');
        setIsShopifyConnected(false);
      }
      setCurrentPlatform('shopify');
    };

    const handleInputChange = (e, platform) => {
      const { name, value } = e.target;
      if (platform === 'woocommerce') {
        setWooCommerceData((prevData) => ({ ...prevData, [name]: value }));
      } else if (platform === 'shopify') {
        setShopifyData((prevData) => ({ ...prevData, [name]: value }));
      }
    };

    const handleConnectWooCommerce = async () => {
      setConnecting(true);
      try {
        const response = await axiosInstance.post(
          '/api/integrations/connect-woocommerce/',
          wooCommerceData
        );
        toast.info(response.data.message);
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'An error occurred while connecting to WooCommerce'
        );
      } finally {
        setConnecting(false);
      }
    };

    const initiateShopifyOAuth = async () => {
      setConnecting(true);
      try {
        const response = await axiosInstance.post('/api/integrations/initiate-shopify-oauth/', {
          shop: shopifyData.shop,
        });
        if (response.data.authUrl) {
          window.location.href = response.data.authUrl;
        } else {
          toast.error('Failed to initiate Shopify OAuth: No auth URL received');
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'An error occurred while initiating Shopify OAuth'
        );
      } finally {
        setConnecting(false);
      }
    };

    const handleTabChange = (newValue) => {
      setCurrentPlatform(newValue);
    };

    console.log('IntegrationSettings rendering content', { businessData });

    return (
      <div className="bg-white min-h-screen p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-2xl font-semibold mb-4">
            {title || 'Integrations Settings'}
          </h4>
          {isShopifyConnected && (
            <p className="text-green-600 mb-4">
              Connected to Shopify
            </p>
          )}
          {businessData && businessData.business_type?.toLowerCase() === 'ecommerce' && (
            <>
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.value}
                      className={`py-2 px-4 font-medium text-sm mr-8 ${
                        currentPlatform === platform.value
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => handleTabChange(platform.value)}
                    >
                      {platform.label}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="mt-6">
                {currentPlatform === 'woocommerce' && (
                  <>
                    <h5 className="text-xl font-semibold">WooCommerce</h5>
                    <p className="mt-2 text-gray-700">
                      Connect to your WooCommerce store here.
                    </p>
                    <form className="mt-4 space-y-4" noValidate autoComplete="off">
                      <div>
                        <label htmlFor="woo-url" className="block text-sm font-medium text-gray-700 mb-1">
                          WooCommerce Store URL
                        </label>
                        <input
                          id="woo-url"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          name="url"
                          value={wooCommerceData.url}
                          onChange={(e) => handleInputChange(e, 'woocommerce')}
                        />
                      </div>
                      <div>
                        <label htmlFor="consumer-key" className="block text-sm font-medium text-gray-700 mb-1">
                          Consumer Key
                        </label>
                        <input
                          id="consumer-key"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          name="consumer_key"
                          value={wooCommerceData.consumer_key}
                          onChange={(e) => handleInputChange(e, 'woocommerce')}
                        />
                      </div>
                      <div>
                        <label htmlFor="consumer-secret" className="block text-sm font-medium text-gray-700 mb-1">
                          Consumer Secret
                        </label>
                        <input
                          id="consumer-secret"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          name="consumer_secret"
                          type="password"
                          value={wooCommerceData.consumer_secret}
                          onChange={(e) => handleInputChange(e, 'woocommerce')}
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          onClick={handleConnectWooCommerce}
                          disabled={connecting}
                        >
                          {connecting ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Connecting...</span>
                            </div>
                          ) : 'Connect to WooCommerce'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {currentPlatform === 'shopify' && (
                  <>
                    <h5 className="text-xl font-semibold">Shopify</h5>
                    <p className="mt-2 text-gray-700">
                      Connect to your Shopify store here.
                    </p>
                    <form className="mt-4 space-y-4" noValidate autoComplete="off">
                      <div>
                        <label htmlFor="shopify-url" className="block text-sm font-medium text-gray-700 mb-1">
                          Shopify Store URL
                        </label>
                        <input
                          id="shopify-url"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          name="shop"
                          value={shopifyData.shop}
                          onChange={(e) => handleInputChange(e, 'shopify')}
                          placeholder="yourstore.myshopify.com"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          onClick={initiateShopifyOAuth}
                          disabled={connecting}
                        >
                          {connecting ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Connecting...</span>
                            </div>
                          ) : 'Connect to Shopify'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </>
          )}
          {(!businessData || businessData.business_type?.toLowerCase() !== 'ecommerce') && (
            <p className="text-gray-700">
              Integration settings are only available for e-commerce businesses.
            </p>
          )}
        </div>
      </div>
    );
  }
);

export default IntegrationSettings;