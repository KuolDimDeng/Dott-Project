# Mobile Build Guide

## Current Architecture Issues & Solutions

### Problems Identified:
1. **File sync overwrites changes** - `npx cap sync` overwrites manual fixes
2. **API routing confusion** - Mobile app routing through frontend proxy instead of direct backend
3. **Multiple source locations** causing version conflicts
4. **Staging frontend can't reach backend** (Render internal networking issue)

### Solution Architecture:

```
Mobile App → Backend API (Direct)
   ↓
https://dott-api-staging.onrender.com

NOT:
Mobile App → Frontend Proxy → Backend API ❌
```

## Correct Build Process

### Quick Update (Recommended):
```bash
./update-ios-fixed.sh
```

This script:
- Fixes API URLs in source files
- Preserves direct backend connections
- Avoids overwriting with `cap sync`
- Updates build numbers for cache clearing

### Manual Build Process:

1. **Edit source files in `/out/`**:
```bash
# Fix any API URLs if needed
sed -i '' 's|https://staging.dottapps.com/api/|https://dott-api-staging.onrender.com/api/|g' out/mobile-auth.html
```

2. **Copy to iOS** (use `copy` not `sync`):
```bash
npx cap copy ios  # NOT npx cap sync ios
```

3. **Clean and rebuild**:
```bash
npx cap open ios
# In Xcode: Cmd+Shift+K (Clean)
# Then: Cmd+R (Run)
```

## Environment URLs

### Staging (Current):
- **Backend API**: `https://dott-api-staging.onrender.com`
- **Frontend Web**: `https://staging.dottapps.com`
- **Mobile should use**: Backend API directly

### Production (Future):
- **Backend API**: `https://api.dottapps.com`
- **Frontend Web**: `https://app.dottapps.com`
- **Mobile should use**: Backend API directly

## Common Issues & Fixes

### Issue: Authentication fails with 500 error
**Cause**: Mobile app calling frontend proxy which can't reach backend
**Fix**: Use direct backend URL: `https://dott-api-staging.onrender.com`

### Issue: Changes revert after update
**Cause**: Using `npx cap sync` which overwrites files
**Fix**: Use `npx cap copy` or the `update-ios-fixed.sh` script

### Issue: Old cached version loads
**Fix**: 
1. Update build number in Info.plist
2. Clear Xcode DerivedData
3. Clean build in Xcode (Cmd+Shift+K)

## File Structure

```
/out/                           # Source files (edit here)
  ├── mobile-auth.html         # Main auth page
  ├── mobile-business-menu.html # Business interface
  └── mobile-consumer-menu.html # Consumer interface

/ios/App/App/public/           # iOS target (gets copied from /out/)
  └── [same files]             # Don't edit directly!

/mobile-config.js              # Centralized config (new)
/update-ios-fixed.sh           # Fixed update script (new)
```

## Testing Checklist

- [ ] Auth works with `support@dottapps.com`
- [ ] Business menu loads after login
- [ ] Consumer menu accessible
- [ ] API calls go to `dott-api-staging.onrender.com`
- [ ] No 500 errors from frontend proxy

## Next Steps

1. **Immediate**: Use `./update-ios-fixed.sh` for builds
2. **Short-term**: Fix staging frontend → backend connection
3. **Long-term**: Implement `mobile-config.js` in all mobile HTML files

## Support

If builds fail, check:
1. Backend health: `curl https://dott-api-staging.onrender.com/health/`
2. File contents: `grep "staging.dottapps.com/api" out/*.html`
3. iOS file contents: `grep "dott-api-staging" ios/App/App/public/mobile-auth.html`