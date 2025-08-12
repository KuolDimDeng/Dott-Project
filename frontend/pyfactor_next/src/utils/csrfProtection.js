/**
 * CSRF Protection utilities
 */

// Generate CSRF token
export const generateCSRFToken = () => {
  return crypto.randomUUID();
};

// Get CSRF token from meta tag or generate new one
export const getCSRFToken = () => {
  if (typeof window === 'undefined') return null;
  
  let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  if (!token) {
    token = generateCSRFToken();
    // Store in sessionStorage for this session
    sessionStorage.setItem('csrf-token', token);
  }
  
  return token;
};

// Add CSRF token to fetch headers
export const addCSRFHeaders = (headers = {}) => {
  const token = getCSRFToken();
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  return headers;
};

// Validate CSRF token on server side
export const validateCSRFToken = (requestToken, sessionToken) => {
  return requestToken && sessionToken && requestToken === sessionToken;
};
