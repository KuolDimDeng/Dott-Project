# Cloudflare Security Settings to Check

Since your DNS is configured correctly but browsers still get Error 1000, check these Cloudflare settings:

## 1. SSL/TLS Settings
Go to **SSL/TLS → Overview**
- Encryption mode should be: **Full** or **Full (strict)**
- NOT "Off" or "Flexible"

## 2. Page Rules
Go to **Rules → Page Rules**
- Check if there's any rule for `api.dottapps.com/*`
- Remove any rules that might be blocking

## 3. Security Settings
Go to **Security → Settings**
- **Security Level**: Should be "Medium" or lower
- **Challenge Passage**: Should be at least 30 minutes
- **Browser Integrity Check**: Try disabling this temporarily

## 4. Firewall Rules
Go to **Security → WAF → Custom rules**
- Check for any rules blocking requests
- Look for rules that might block based on User-Agent or other headers

## 5. Bot Fight Mode
Go to **Security → Bots**
- If "Bot Fight Mode" is ON, try turning it OFF temporarily
- This can sometimes block legitimate browser requests

## 6. Under Attack Mode
Go to **Security → Settings**
- Make sure "I'm Under Attack Mode" is OFF

## 7. Rate Limiting
Go to **Security → WAF → Rate limiting rules**
- Check if there are aggressive rate limits

## Immediate Test
1. Open the test-api-directly.html file in your browser
2. Click both buttons to see the exact error
3. This will help identify if it's Cloudflare security or something else

## If Nothing Works
Try temporarily setting the api CNAME record to "DNS only" (gray cloud) instead of "Proxied" (orange cloud). This bypasses Cloudflare entirely and will confirm if Cloudflare is the issue.