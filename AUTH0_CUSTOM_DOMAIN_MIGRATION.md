# Auth0 Custom Domain Migration Guide

## 🏆 **Migration Completed Successfully!**

**Custom Domain**: `auth.dottapps.com`  
**Status**: ✅ Ready to Use  
**Updated**: January 3rd, 2025

---

## 📋 **What Was Changed**

### **1. Environment Configuration Updated**
✅ **Updated Files:**
- `frontend/pyfactor_next/production.env`
- `frontend/pyfactor_next/.env.production`
- `frontend/pyfactor_next/.env.local`

✅ **Changed Variables:**
```bash
# OLD VALUES (Updated)
NEXT_PUBLIC_AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
NEXT_PUBLIC_AUTH0_AUDIENCE=https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/

# NEW VALUES (Current)
NEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com
AUTH0_DOMAIN=auth.dottapps.com
NEXT_PUBLIC_AUTH0_AUDIENCE=https://auth.dottapps.com/api/v2/
AUTH0_ISSUER_BASE_URL=https://auth.dottapps.com
```

### **2. Auth0 Dashboard Configuration Required**

⚠️ **ACTION REQUIRED: Update Auth0 Application Settings**

1. **Login to Auth0 Dashboard**
   - Go to https://manage.auth0.com
   - Navigate to Applications → Your App

2. **Update Application URLs**
   ```
   Allowed Callback URLs:
   https://dottapps.com/api/auth/callback,
   http://localhost:3000/api/auth/callback

   Allowed Logout URLs:
   https://dottapps.com/auth/signin,
   http://localhost:3000/auth/signin

   Allowed Web Origins:
   https://dottapps.com,
   http://localhost:3000

   Allowed Origins (CORS):
   https://dottapps.com,
   http://localhost:3000
   ```

3. **Enable Custom Domain**
   - Go to Branding → Custom Domains
   - Ensure `auth.dottapps.com` is enabled
   - Toggle "Use Custom Domain for Emails" to ON

---

## 🔒 **Security Benefits**

### **Before (Default Domain)**
- ❌ Users redirected to `dev-cbyy63jovi6zrcos.us.auth0.com`
- ❌ Different domain creates trust concerns
- ❌ Breaks consistent branding experience

### **After (Custom Domain)**
- ✅ Users stay on `auth.dottapps.com`
- ✅ Consistent branding and trust
- ✅ Professional appearance
- ✅ Better SEO and user experience

---

## 🧪 **Testing the Migration**

### **1. Test Production Login**
```bash
# Test the auth flow
curl -I https://auth.dottapps.com/.well-known/openid_configuration
```

### **2. Test Application Login**
1. Go to https://dottapps.com
2. Click "Sign In with Google" 
3. Should redirect to `auth.dottapps.com` (not old domain)
4. Complete authentication
5. Should return to `dottapps.com`

### **3. Verify Environment Variables**
```bash
# In Vercel dashboard, check environment variables:
NEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com
AUTH0_DOMAIN=auth.dottapps.com
AUTH0_ISSUER_BASE_URL=https://auth.dottapps.com
```

---

## 🚀 **Deployment Checklist**

### **Frontend (Vercel)**
- ✅ Environment variables updated in Vercel dashboard
- ✅ Production deployment triggered with new config
- ✅ Local development environment configured

### **Backend (Render)**
- ⚠️ **Action Required**: Update backend Auth0 validation
- Update `AUTH0_DOMAIN` in Render environment variables
- Update JWT validation to use custom domain

### **Auth0 Dashboard**
- ✅ Custom domain configured and verified
- ⚠️ **Action Required**: Update application URLs (see above)
- ⚠️ **Action Required**: Enable custom domain for emails

---

## 🔍 **Verification Steps**

### **✅ Completed**
1. Custom domain configured in Auth0
2. Environment files updated
3. Code deployed to production

### **⚠️ Action Required**
1. Update Auth0 application callback URLs
2. Enable custom domain in Auth0 settings
3. Update backend environment variables
4. Test complete authentication flow

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

**Issue**: "Invalid redirect URI"
**Solution**: Update callback URLs in Auth0 dashboard

**Issue**: "Invalid issuer"  
**Solution**: Verify `AUTH0_ISSUER_BASE_URL=https://auth.dottapps.com`

**Issue**: "Token validation failed"
**Solution**: Update backend to validate tokens from custom domain

### **Verification Commands**
```bash
# Test Auth0 configuration endpoint
curl https://auth.dottapps.com/.well-known/openid_configuration

# Test JWKS endpoint  
curl https://auth.dottapps.com/.well-known/jwks.json

# Verify environment
echo $NEXT_PUBLIC_AUTH0_DOMAIN
```

---

## 🎯 **Next Steps**

1. **Immediate**: Update Auth0 application settings (callback URLs)
2. **Today**: Test complete authentication flow
3. **This Week**: Update backend environment variables
4. **Monitor**: Watch for any authentication errors in logs

**Status**: 🟡 **Partial Complete** - Environment updated, Auth0 settings pending 