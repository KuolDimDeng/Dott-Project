import crypto from 'crypto';

/**
 * Generate a CSP nonce for inline scripts
 * This allows specific inline scripts without using unsafe-inline
 */
export function generateCSPNonce() {
  return crypto.randomBytes(16).toString('base64');
}