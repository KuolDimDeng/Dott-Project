# 🔧 Auth0 Environment Configuration Guide

## Production Environment Variables

Replace your current `.env.production` with these optimized values:

```env
# PyFactor Production Environment - Auth0 Optimized
# Updated: 2025-06-04 - Post-Authentication Fix

# API Configuration
NEXT_PUBLIC_API_URL=https://api.dottapps.com
BACKEND_API_URL=https://api.dottapps.com

# Auth0 Configuration - Optimized
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
AUTH0_CLIENT_SECRET=your_actual_secret_here
AUTH0_SECRET=generate_new_32_char_secret_here
NEXT_PUBLIC_BASE_URL=https://dottapps.com

# OAuth Callbacks - Optimized
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://dottapps.com/api/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://dottapps.com/auth/signin
NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email,read:profile

# Performance Settings
AUTH0_CACHE_DURATION=300000
AUTH0_TOKEN_REFRESH_BUFFER=30000
```

## Backend Environment Variables

Update your Django `.env` file:

```env
# Auth0 Backend Configuration - Optimized
USE_AUTH0=true
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_ISSUER_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_AUDIENCE=https://api.dottapps.com
AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
AUTH0_CLIENT_SECRET=your_actual_secret_here

# Security Settings
AUTH0_TOKEN_ALGORITHM=RS256
AUTH0_TOKEN_LEEWAY=10
```

## Render Deployment

### Set these in Render Dashboard:
1. Go to your service → Environment
2. Add these environment variables:

```
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dottapps.com
AUTH0_CLIENT_SECRET=[your_secret]
```

## Vercel Deployment

### Set these in Vercel Dashboard:
```bash
vercel env add NEXT_PUBLIC_AUTH0_DOMAIN
vercel env add NEXT_PUBLIC_AUTH0_CLIENT_ID  
vercel env add NEXT_PUBLIC_AUTH0_AUDIENCE
vercel env add AUTH0_CLIENT_SECRET
```

## Security Notes

### 🔐 Generate New Secrets:
```bash
# Generate AUTH0_SECRET (32 characters)
openssl rand -base64 32

# Rotate client secret in Auth0 dashboard
# Go to Applications → Dott → Settings → Rotate Secret
```

### 🛡️ Verify Configuration:
```bash
# Test configuration
npm run build
npm run start

# Check logs for:
# ✅ "Using configuration: environment"
# ✅ "Token type: JWT (not JWE)"
```

## Migration Steps

### 1. Update Frontend Config
```bash
cd frontend/pyfactor_next
cp .env.production .env.production.backup
# Update .env.production with new values above
```

### 2. Update Backend Config  
```bash
cd backend/pyfactor
cp .env .env.backup
# Update .env with new values above
```

### 3. Deploy Changes
```bash
# Frontend
npm run build
npm run start

# Backend  
python manage.py runserver
```

### 4. Verify Authentication
- [ ] Login with Google OAuth works
- [ ] JWT tokens received (not JWE)
- [ ] User profile loads correctly
- [ ] Tenant mapping works
- [ ] No console errors

## Troubleshooting

### If Environment Variables Not Loading:
```javascript
// Add to next.config.js
module.exports = {
  env: {
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_AUTH0_AUDIENCE: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  }
};
```

### If Still Getting JWE Tokens:
```javascript
// Force audience in auth0 config
authorizationParams: {
  audience: 'https://api.dottapps.com', // MUST be set
  scope: 'openid profile email'
}
```

Your configuration is now optimized and environment-variable driven! 🚀 