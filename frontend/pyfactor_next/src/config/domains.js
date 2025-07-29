// Domain configuration for app subdomain structure
export const DOMAINS = {
  // Base domains
  MARKETING: 'https://dottapps.com',
  APP: 'https://app.dottapps.com',
  API: 'https://api.dottapps.com',
  
  // Auth domains
  AUTH: 'https://auth.dottapps.com',
  
  // Development domains
  DEV_MARKETING: 'http://localhost:3000',
  DEV_APP: 'http://localhost:3000',
  DEV_API: 'http://localhost:8000',
};

// Check if we're on the app subdomain
export const isAppSubdomain = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('app.');
};

// Check if we're on the marketing site
export const isMarketingSite = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'dottapps.com' || hostname === 'www.dottapps.com';
};

// Get the appropriate domain based on environment
export const getDomain = (type = 'APP') => {
  const isDev = process.env.NODE_ENV === 'development';
  
  switch (type) {
    case 'MARKETING':
      return isDev ? DOMAINS.DEV_MARKETING : DOMAINS.MARKETING;
    case 'APP':
      return isDev ? DOMAINS.DEV_APP : DOMAINS.APP;
    case 'API':
      return isDev ? DOMAINS.DEV_API : DOMAINS.API;
    case 'AUTH':
      return DOMAINS.AUTH;
    default:
      return isDev ? DOMAINS.DEV_APP : DOMAINS.APP;
  }
};

// Build URLs with the app subdomain
export const buildAppUrl = (path, tenantId = null) => {
  const baseDomain = getDomain('APP');
  
  if (tenantId) {
    return `${baseDomain}/${tenantId}${path}`;
  }
  
  return `${baseDomain}${path}`;
};

// Build URLs for the marketing site
export const buildMarketingUrl = (path) => {
  const baseDomain = getDomain('MARKETING');
  return `${baseDomain}${path}`;
};

// Redirect to app subdomain if needed
export const ensureAppSubdomain = () => {
  if (typeof window === 'undefined') return;
  
  const currentHost = window.location.hostname;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Only redirect in production and if we're not already on app subdomain
  if (isProduction && !currentHost.startsWith('app.') && !isMarketingSite()) {
    const newUrl = buildAppUrl(window.location.pathname + window.location.search);
    window.location.replace(newUrl);
  }
};

// Redirect to marketing site if needed
export const ensureMarketingSite = () => {
  if (typeof window === 'undefined') return;
  
  const currentHost = window.location.hostname;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Only redirect in production and if we're on app subdomain
  if (isProduction && currentHost.startsWith('app.')) {
    const newUrl = buildMarketingUrl(window.location.pathname + window.location.search);
    window.location.replace(newUrl);
  }
};