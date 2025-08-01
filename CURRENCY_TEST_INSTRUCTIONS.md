# Currency Persistence Test Instructions

## Quick Test (Browser-Based)

1. **Access the test page:**
   - Go to: https://app.dottapps.com/test-currency.html
   - Make sure you're logged in first

2. **Run the tests:**
   - Click "Run All Tests" button
   - The tests will:
     - Get your current currency
     - Change it to SSP (or USD if already SSP)
     - Verify it persisted
     - Clear cache and verify again

3. **Check results:**
   - ✅ Green = Success
   - ❌ Red = Error (shows details)

## Manual Test (To verify the fix)

1. **Login to your account**
2. **Go to Settings → Business → Currency Preferences**
3. **Change currency to SSP (South Sudanese Pound)**
4. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → "Cached images and files" → Clear
   - Or: Developer Tools → Application → Clear Storage → Clear site data
5. **Refresh the page**
6. **Check if currency is still SSP**

## What Was Fixed

1. **Frontend was masking backend errors** by returning `success: true` even when the backend failed
2. **Now properly reports backend errors** so we can see what's actually happening
3. **Database columns exist** (confirmed via SQL), so any remaining issues are in the save logic

## If Currency Still Reverts to USD

The frontend fix will now show the actual error message from the backend, which will help identify:
- Authentication issues
- Permission problems  
- Database save errors
- Any other backend issues

## Command Line Test (Advanced)

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python test_currency_api.py YOUR_SESSION_ID
```

To get your session ID:
1. Open browser developer tools (F12)
2. Go to Application → Cookies
3. Find the 'sid' cookie value