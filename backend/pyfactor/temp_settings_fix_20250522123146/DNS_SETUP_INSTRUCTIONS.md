# DNS Setup Instructions for HTTPS/SSL

## Current Status
Your Django application is configured for HTTPS/SSL with the following certificate:
- **Certificate ARN**: arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810
- **Domains**: dottapps.com, www.dottapps.com
- **Status**: Issued and Valid

## DNS Configuration Required

### Step 1: Get Your Elastic Beanstalk Environment URL
Your current EB environment URL: https://DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

### Step 2: Configure DNS Records in Route 53 (or your DNS provider)

#### For Route 53:
1. Go to Route 53 in AWS Console
2. Select your hosted zone for dottapps.com
3. Create the following records:

**A Record for dottapps.com:**
- Type: A
- Name: (leave blank for root domain)
- Alias: Yes
- Alias Target: Your Elastic Beanstalk environment
- Value: dualstack.DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

**CNAME Record for www.dottapps.com:**
- Type: CNAME  
- Name: www
- Value: DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

#### For Other DNS Providers:
Configure the following records:
- dottapps.com → CNAME → DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
- www.dottapps.com → CNAME → DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

### Step 3: Test Your Configuration
After DNS propagation (5-30 minutes), test:
- https://dottapps.com
- https://www.dottapps.com
- https://dottapps.com/health/
- https://dottapps.com/ssl-health/

### Step 4: Verify SSL Security
Check your SSL configuration at:
- https://www.ssllabs.com/ssltest/analyze.html?d=dottapps.com

## Health Check Endpoints
- `/health/` - Basic application health
- `/ssl-health/` - SSL-specific health information
- `/domain-health/` - Domain configuration verification
- `/db-health/` - Database connectivity check

## Security Features Enabled
✅ HTTPS redirect (HTTP → HTTPS)
✅ HSTS (HTTP Strict Transport Security)
✅ Secure cookies
✅ XSS protection
✅ Content type sniffing protection
✅ Referrer policy
✅ Frame options protection

## Troubleshooting
If you encounter issues:
1. Check DNS propagation: https://www.whatsmydns.net/
2. Verify certificate status in AWS Certificate Manager
3. Check Elastic Beanstalk environment health
4. Review application logs in EB console
