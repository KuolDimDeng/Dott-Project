# Firefox DNS Cache Clear Instructions

The API is working correctly now, but Firefox has cached the DNS error. Here's how to clear it:

## Method 1: Complete Firefox Reset (Fastest)
1. Close ALL Firefox windows and tabs
2. Wait 10 seconds
3. Open Firefox again
4. Try signing in

## Method 2: Clear DNS Cache in Firefox
1. Type `about:networking#dns` in the address bar
2. Click "Clear DNS Cache" button
3. Refresh the page and try again

## Method 3: Force Refresh
1. Hold Shift + Cmd (Mac) or Shift + Ctrl (Windows)
2. Click the Refresh button
3. This forces a complete reload bypassing cache

## Method 4: Private Window
1. Open a new Private/Incognito window (Cmd+Shift+P or Ctrl+Shift+P)
2. Go to https://dottapps.com
3. Try signing in (private windows don't use cache)

## Method 5: Clear All Firefox Data (Last Resort)
1. Firefox menu → Settings → Privacy & Security
2. Under "Cookies and Site Data"
3. Click "Clear Data"
4. Check both boxes and click "Clear"
5. Restart Firefox

## Verification
The API is confirmed working:
- DNS now resolves correctly to Cloudflare IPs
- Health endpoint returns 200 OK
- The issue is only browser cache

Try Method 1 or 4 first as they're the quickest!