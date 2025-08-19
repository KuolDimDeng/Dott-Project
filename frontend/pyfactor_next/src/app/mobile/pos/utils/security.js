'use client';

/**
 * Security utilities for Mobile POS
 * Implements PCI compliance and security best practices
 */

// Luhn algorithm for card validation
export const isValidCardNumber = (number) => {
  const digits = number.replace(/\D/g, '');
  
  // Check length (13-19 digits for valid cards)
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Detect card type
export const getCardType = (number) => {
  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };
  
  const cleaned = number.replace(/\D/g, '');
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleaned)) {
      return type;
    }
  }
  
  return 'unknown';
};

// Validate expiry date
export const isValidExpiry = (expiry) => {
  const [month, year] = expiry.split('/').map(n => parseInt(n, 10));
  
  if (!month || !year) return false;
  if (month < 1 || month > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
};

// Validate CVC
export const isValidCVC = (cvc, cardType) => {
  const length = cardType === 'amex' ? 4 : 3;
  return /^\d+$/.test(cvc) && cvc.length === length;
};

// Rate limiter for payment attempts
class RateLimiter {
  constructor(maxAttempts = 5, lockoutDuration = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.lockoutDuration = lockoutDuration;
    this.attempts = 0;
    this.lockedUntil = null;
    this.attemptTimestamps = [];
  }
  
  canAttempt() {
    // Check if locked out
    if (this.lockedUntil && Date.now() < this.lockedUntil) {
      const remainingTime = Math.ceil((this.lockedUntil - Date.now()) / 1000 / 60);
      throw new Error(`Too many attempts. Try again in ${remainingTime} minutes.`);
    }
    
    // Clean old attempts (older than 15 minutes)
    const cutoff = Date.now() - this.lockoutDuration;
    this.attemptTimestamps = this.attemptTimestamps.filter(ts => ts > cutoff);
    
    // Check attempt count
    if (this.attemptTimestamps.length >= this.maxAttempts) {
      this.lockedUntil = Date.now() + this.lockoutDuration;
      throw new Error(`Too many attempts. Try again in 15 minutes.`);
    }
    
    return true;
  }
  
  recordAttempt() {
    this.attemptTimestamps.push(Date.now());
    this.attempts++;
  }
  
  recordSuccess() {
    this.attempts = 0;
    this.attemptTimestamps = [];
    this.lockedUntil = null;
  }
}

export const paymentRateLimiter = new RateLimiter();

// Sanitize card data before display
export const sanitizeCardNumber = (number) => {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length < 8) return '****';
  
  const first4 = cleaned.slice(0, 4);
  const last4 = cleaned.slice(-4);
  return `${first4} **** **** ${last4}`;
};

// Clear sensitive data from memory
export const clearSensitiveData = (formRef) => {
  if (formRef.current) {
    // Clear form inputs
    const inputs = formRef.current.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.type === 'password' || 
          input.name === 'cardNumber' || 
          input.name === 'cvc' ||
          input.name === 'cvv') {
        input.value = '';
      }
    });
  }
  
  // Clear from any state or variables
  return {
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  };
};

// Encrypt data for offline storage
export const encryptForStorage = (data, key) => {
  // Simple XOR encryption for demo - use proper encryption library in production
  const jsonString = JSON.stringify(data);
  let encrypted = '';
  
  for (let i = 0; i < jsonString.length; i++) {
    encrypted += String.fromCharCode(
      jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  
  return btoa(encrypted); // Base64 encode
};

export const decryptFromStorage = (encrypted, key) => {
  try {
    const decoded = atob(encrypted); // Base64 decode
    let decrypted = '';
    
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed');
    return null;
  }
};

// Security headers for payment pages
export const getPaymentSecurityHeaders = () => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://js.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(self)'
  };
};

// Audit logging
export const logSecurityEvent = (event, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Send to backend for logging
  fetch('/api/security/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(logEntry)
  }).catch(console.error);
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[SECURITY AUDIT]', logEntry);
  }
};

export default {
  isValidCardNumber,
  getCardType,
  isValidExpiry,
  isValidCVC,
  paymentRateLimiter,
  sanitizeCardNumber,
  clearSensitiveData,
  encryptForStorage,
  decryptFromStorage,
  getPaymentSecurityHeaders,
  logSecurityEvent
};