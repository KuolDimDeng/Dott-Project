# Auth0 Setup Guide

## 🎯 **Complete Cognito → Auth0 Migration**

This guide will walk you through setting up Auth0 to replace AWS Cognito for authentication.

## 📋 **Prerequisites**
- Auth0 account (free tier available)
- Access to your Vercel/deployment environment variables
- Google Cloud Console account (for Google sign-in)

## 🚀 **Step 1: Create Auth0 Application**

1. **Sign up for Auth0**: Go to [auth0.com](https://auth0.com) and create a free account
2. **Create Application**: 
   - Go to Dashboard > Applications
   - Click "Create Application"
   - Name: "Dott Financial App"
   - Type: "Regular Web Applications"
   - Click "Create"

## 🔧 **Step 2: Configure Application Settings**

In your Auth0 application settings:

### **Basic Information**
Copy these values for your environment variables:
- **Domain**: `your-domain.auth0.com`
- **Client ID**: `abc123...`
- **Client Secret**: `xyz789...` (keep this secret!)

### **Application URIs**
```
Allowed Callback URLs:
https://dottapps.com/api/auth/callback
http://localhost:3000/api/auth/callback

Allowed Logout URLs:
https://dottapps.com/auth/signin
http://localhost:3000/auth/signin

Allowed Web Origins:
https://dottapps.com
http://localhost:3000
```

## 🌍 **Step 3: Environment Variables**

Add these to your Vercel environment variables:

```bash
# Required Auth0 Settings
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-32-character-secret-key

# Optional API Settings
NEXT_PUBLIC_AUTH0_AUDIENCE=https://your-domain.auth0.com/api/v2/

# Application URL
NEXT_PUBLIC_BASE_URL=https://dottapps.com
```

### **Generate AUTH0_SECRET**
```bash
# Run this in your terminal to generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🔐 **Step 4: Enable Google Sign-In**

1. **In Auth0 Dashboard**:
   - Go to Authentication > Social
   - Click "+" next to Google
   - Click "Create Application"

2. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials > Create Credentials > OAuth 2.0 Client ID
   - Application type: Web application
   - Add authorized redirect URIs:
     ```
     https://your-domain.auth0.com/login/callback
     ```

3. **Configure in Auth0**:
   - Copy Google Client ID and Secret to Auth0 Google connection
   - In Attributes: Map `email` to `email`, `name` to `name`
   - Save configuration

## 🎨 **Step 5: Customize Auth0 (Optional)**

### **Universal Login**
- Go to Branding > Universal Login
- Customize colors to match your brand
- Upload your logo

### **Email Templates**
- Go to Branding > Email Templates
- Customize welcome, password reset emails

## 🧪 **Step 6: Test Your Setup**

1. **Test Email/Password Login**:
   ```javascript
   // Visit: https://dottapps.com/api/auth/login
   // Should redirect to Auth0 login page
   ```

2. **Test Google Sign-In**:
   ```javascript
   // Visit: https://dottapps.com/api/auth/login?connection=google-oauth2
   // Should redirect to Google OAuth
   ```

## 🔒 **Step 7: Security Settings**

### **Enable Security Features**:
- Go to Security > Attack Protection
- Enable "Brute Force Protection"
- Enable "Suspicious IP Throttling"
- Configure "Breached Password Detection"

### **Set Up Monitoring**:
- Go to Monitoring > Logs
- Set up log streams for production monitoring

## 📊 **Step 8: Financial Compliance**

Auth0 provides built-in compliance features:

### **SOC 2 Compliance**:
- ✅ Already enabled by default
- Access reports in Security Center

### **Audit Logging**:
- ✅ All authentication events logged
- Available via Management API

### **Data Residency**:
- Configure in Account Settings
- Choose appropriate region for your users

## 🚀 **Step 9: Backend Integration**

Update your Django backend to validate Auth0 JWTs:

```python
# settings.py
SIMPLE_JWT = {
    'ALGORITHM': 'RS256',
    'AUDIENCE': os.environ.get('AUTH0_AUDIENCE'),
    'ISSUER': f"https://{os.environ.get('AUTH0_DOMAIN')}/",
    'JWK_URL': f"https://{os.environ.get('AUTH0_DOMAIN')}/.well-known/jwks.json",
}
```

## ✅ **Migration Complete!**

Once configured, your app will have:

- 🔐 **Secure email/password authentication**
- 🌐 **Working Google sign-in** (no debugging required!)
- 📋 **SOC 2 compliance** out of the box
- 🔍 **Comprehensive audit logs**
- 🛡️ **Built-in security features**
- 📊 **Financial industry compliance**

## 🆘 **Troubleshooting**

### **Common Issues**:

1. **"Callback URL mismatch"**:
   - Check Application URIs in Auth0 settings
   - Ensure URLs match exactly (including https/http)

2. **"Invalid client"**:
   - Verify NEXT_PUBLIC_AUTH0_CLIENT_ID is correct
   - Check for trailing spaces in environment variables

3. **"Access denied"**:
   - Verify AUTH0_CLIENT_SECRET is correct
   - Ensure user has permission to sign in

### **Debug Mode**:
```bash
# Add to environment variables for debugging:
DEBUG=@auth0/nextjs-auth0*
```

---

## 🎉 **Congratulations!**

You've successfully migrated from Cognito to Auth0! Your financial app now has enterprise-grade authentication that's:

- ✅ **Easier to maintain**
- ✅ **More reliable**
- ✅ **Compliance-ready**
- ✅ **Better for users**

No more debugging OAuth flows - Auth0 handles all the complexity for you! 🚀 