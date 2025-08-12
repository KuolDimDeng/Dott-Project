#!/bin/bash

# 🚨 CRITICAL SECURITY FIXES
# This script addresses the most critical security vulnerabilities found in the codebase

echo "🔐 Starting Critical Security Fixes..."
echo "=================================="

# 1. CRITICAL: Remove hardcoded Plaid credentials
echo "1. 🚨 Removing hardcoded Plaid credentials..."

# Backend settings.py
sed -i.backup 's/PLAID_CLIENT_ID = PLAID_CLIENT_ID or "66d4706be66ef5001a59bbd2"/PLAID_CLIENT_ID = PLAID_CLIENT_ID or None/' backend/pyfactor/pyfactor/settings.py
sed -i 's/PLAID_SECRET = PLAID_SECRET or "22874241662b48071ffccf02a5db05"/PLAID_SECRET = PLAID_SECRET or None/' backend/pyfactor/pyfactor/settings.py

# Frontend ConnectBankManagement.js
sed -i.backup 's/clientId: .66d4706be66ef5001a59bbd2./clientId: process.env.NEXT_PUBLIC_PLAID_CLIENT_ID/' frontend/pyfactor_next/src/app/dashboard/components/forms/ConnectBankManagement.js
sed -i 's/secretSandbox: .22874241662b48071ffccf02a5db05./secretSandbox: process.env.PLAID_SECRET_SANDBOX/' frontend/pyfactor_next/src/app/dashboard/components/forms/ConnectBankManagement.js

# Remove test files with hardcoded credentials
find . -name "plaid_test.py" -exec rm -f {} \;

echo "   ✅ Hardcoded credentials removed"

# 2. CRITICAL: Fix session token logging
echo "2. 🚨 Fixing session token logging..."

# Create a function to mask session tokens in logs
cat > frontend/pyfactor_next/src/utils/secureLogger.js << 'EOF'
/**
 * Secure logging utility - prevents sensitive data exposure
 */

export const secureLog = {
  /**
   * Safely log session information with masked token
   */
  session: (message, sessionId) => {
    if (!sessionId) {
      console.log(`${message}: NO SESSION`);
      return;
    }
    const masked = sessionId.substring(0, 8) + '...' + sessionId.substring(sessionId.length - 4);
    console.log(`${message}: ${masked}`);
  },

  /**
   * Safely log API tokens with masking
   */
  token: (message, token) => {
    if (!token) {
      console.log(`${message}: NO TOKEN`);
      return;
    }
    const masked = token.substring(0, 12) + '...' + token.substring(token.length - 8);
    console.log(`${message}: ${masked}`);
  },

  /**
   * Regular logging for non-sensitive data
   */
  info: (message, data) => {
    console.log(message, data);
  },

  /**
   * Error logging
   */
  error: (message, error) => {
    console.error(message, error);
  }
};
EOF

echo "   ✅ Secure logger utility created"

# 3. HIGH: Add input validation utility
echo "3. 🛡️ Creating input validation utilities..."

cat > frontend/pyfactor_next/src/utils/inputValidation.js << 'EOF'
/**
 * Input validation utilities for security
 */

export const validateTaxRate = (value) => {
  const rate = parseFloat(value);
  
  if (isNaN(rate)) {
    throw new Error('Tax rate must be a valid number');
  }
  
  if (rate < 0 || rate > 100) {
    throw new Error('Tax rate must be between 0 and 100');
  }
  
  return rate;
};

export const validateDiscountRate = (value, maxDiscount = 100) => {
  const discount = parseFloat(value);
  
  if (isNaN(discount)) {
    throw new Error('Discount must be a valid number');
  }
  
  if (discount < 0 || discount > maxDiscount) {
    throw new Error(`Discount must be between 0 and ${maxDiscount}`);
  }
  
  return discount;
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value, fieldName) => {
  if (!value || value.toString().trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
};
EOF

echo "   ✅ Input validation utilities created"

# 4. HIGH: Create CSRF protection utility
echo "4. 🔒 Creating CSRF protection utilities..."

cat > frontend/pyfactor_next/src/utils/csrfProtection.js << 'EOF'
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
EOF

echo "   ✅ CSRF protection utilities created"

# 5. Create environment variable template
echo "5. 📝 Creating secure environment template..."

cat > .env.example << 'EOF'
# 🔐 SECURE ENVIRONMENT VARIABLES
# Copy this file to .env.local and fill in your actual values
# NEVER commit .env.local to version control

# Plaid Integration (REQUIRED)
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here
PLAID_SECRET_SANDBOX=your_plaid_sandbox_secret_here
NEXT_PUBLIC_PLAID_CLIENT_ID=your_plaid_client_id_here

# Auth0 Configuration (REQUIRED)
AUTH0_DOMAIN=your_auth0_domain
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Keys
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_SMART_INSIGHTS_API_KEY=your_claude_insights_key
CURRENCY_API_KEY=your_currency_api_key
RESEND_API_KEY=your_resend_api_key

# External Services
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_EXPRESS_ACCOUNT_ID=your_stripe_account_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_id

# Optional
REDIS_URL=redis://localhost:6379
WISE_API_KEY=your_wise_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Security
NEXTAUTH_SECRET=your_nextauth_secret_here
SESSION_SECRET=your_session_secret_here
EOF

echo "   ✅ Environment template created"

# 6. Update gitignore to ensure sensitive files are not committed
echo "6. 🚫 Updating .gitignore for security..."

cat >> .gitignore << 'EOF'

# Security - Environment variables
.env.local
.env.production.local
.env.development.local
.env.test.local
*.pem
*.key
*.crt

# Sensitive data
**/settings.py.backup*
**/plaid_test.py
**/*_credentials.json
**/*_secrets.json

# Log files that might contain sensitive data
*.log
logs/
*.log.*
EOF

echo "   ✅ .gitignore updated"

echo ""
echo "🎉 Critical Security Fixes Applied!"
echo "=================================="
echo ""
echo "⚠️  IMMEDIATE ACTIONS REQUIRED:"
echo ""
echo "1. 🔑 Set up environment variables:"
echo "   - Copy .env.example to .env.local"
echo "   - Fill in all required values"
echo "   - Remove any remaining hardcoded credentials"
echo ""
echo "2. 🔍 Manual fixes needed:"
echo "   - Replace console.log with secureLog.session() for session logging"
echo "   - Add CSRF token validation to API routes"
echo "   - Add input validation to form components"
echo ""
echo "3. 🧪 Test everything thoroughly:"
echo "   - Verify all functionality still works"
echo "   - Test authentication flows"
echo "   - Check API endpoints"
echo ""
echo "4. 🚀 Deploy security updates immediately"
echo ""
echo "📚 Files created:"
echo "   - frontend/pyfactor_next/src/utils/secureLogger.js"
echo "   - frontend/pyfactor_next/src/utils/inputValidation.js"  
echo "   - frontend/pyfactor_next/src/utils/csrfProtection.js"
echo "   - .env.example"
echo ""
echo "⚠️  Remember: This is just the start. Additional manual fixes needed!"