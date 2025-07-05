// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/integrations/utils/platformHelpers.js

export const PLATFORM_TYPES = {
  WOOCOMMERCE: 'woocommerce',
  SHOPIFY: 'shopify',
  // Add other platforms as needed
};

export const getPlatformSetupComponent = (platformType) => {
  switch (platformType) {
    case PLATFORM_TYPES.WOOCOMMERCE:
      return 'WooCommerceSetup';
    case PLATFORM_TYPES.SHOPIFY:
      return 'ShopifySetup';
    // Add cases for other platforms
    default:
      return null;
  }
};

export const validatePlatformCredentials = (platformType, credentials) => {
  // Implement platform-specific validation logic
  switch (platformType) {
    case PLATFORM_TYPES.WOOCOMMERCE:
      return credentials.siteUrl && credentials.consumerKey && credentials.consumerSecret;
    case PLATFORM_TYPES.SHOPIFY:
      return credentials.shopName && credentials.accessToken;
    // Add validation for other platforms
    default:
      return false;
  }
};
