# Browser DNS Cache Fix Instructions

The API is working correctly (confirmed via curl), but your browser has cached the DNS error. Here's how to fix it:

## Option 1: Force Refresh (Quickest)
1. Open Chrome DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Option 2: Clear Browser DNS Cache
### Chrome/Edge:
1. Close ALL browser tabs
2. Open new tab and go to: `chrome://net-internals/#dns`
3. Click "Clear host cache"
4. Go to: `chrome://net-internals/#sockets`
5. Click "Flush socket pools"
6. Restart browser completely

### Firefox:
1. Type `about:config` in address bar
2. Search for `network.dnsCacheExpiration`
3. Set to 0, then back to 60
4. Or just restart Firefox

## Option 3: Use Different Access Method
1. Try incognito/private mode
2. Use a different browser
3. Use your phone on mobile data (not WiFi)
4. Add timestamp to URL: `https://dottapps.com/?t=123456`

## Option 4: System-Level DNS Flush
```bash
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Or restart your computer
```

## Verification
The API is confirmed working:
- DNS resolves to: 104.21.89.207, 172.67.164.228 (Cloudflare IPs)
- Direct API test: `curl https://api.dottapps.com/health/` returns 200 OK

Your browser is just holding onto the old cached error.