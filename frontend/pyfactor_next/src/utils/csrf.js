import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.AUTH0_CLIENT_SECRET || 'default-csrf-secret';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token
 */
export function generateCSRFToken() {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now();
  
  // Create a signed token with timestamp
  const data = `${token}.${timestamp}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');
    
  return `${data}.${signature}`;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token, maxAge = 3600000) { // 1 hour default
  if (!token) return false;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const [tokenPart, timestamp, signature] = parts;
    const data = `${tokenPart}.${timestamp}`;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('hex');
      
    if (signature !== expectedSignature) {
      return false;
    }
    
    // Check timestamp
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > maxAge) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Middleware to validate CSRF tokens on state-changing requests
 */
export function csrfProtection(request) {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }
  
  // Get CSRF token from header or body
  const headerToken = request.headers.get('x-csrf-token');
  const valid = validateCSRFToken(headerToken);
  
  if (!valid) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token'
    };
  }
  
  return { valid: true };
}