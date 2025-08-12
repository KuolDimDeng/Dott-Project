/**
 * Cloudflare-aware session utilities
 */

export const getClientIP = (request) => {
  // Cloudflare provides the real IP
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For') || 
         request.headers.get('X-Real-IP') ||
         'unknown';
};

export const getCloudflareRay = (request) => {
  return request.headers.get('CF-Ray') || 'none';
};

export const isCloudflareRequest = (request) => {
  return !!request.headers.get('CF-Ray');
};

export const getSecureHeaders = (request) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add Cloudflare headers if present
  if (isCloudflareRequest(request)) {
    headers['CF-Connecting-IP'] = getClientIP(request);
    headers['CF-Ray'] = getCloudflareRay(request);
  }
  
  return headers;
};
