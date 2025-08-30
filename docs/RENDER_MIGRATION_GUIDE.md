# Render Migration Guide for Marketplace Feature
*Last Updated: 2025-08-30*

## Prerequisites
- Access to Render dashboard
- Admin permissions on dott-api service
- Staging environment for testing

## Step-by-Step Migration Process

### 1. Push Code to Staging Branch
```bash
# From your local machine
git add .
git commit -m "feat: Add marketplace and chat system with payment integration"
git push origin staging
```

### 2. Access Render Shell (Staging)
1. Log into [Render Dashboard](https://dashboard.render.com)
2. Navigate to your **staging** backend service
3. Click on the **"Shell"** tab
4. Wait for shell to initialize

### 3. Create Migrations in Shell
```bash
# Navigate to app directory
cd /app

# Create migration files for new apps
python manage.py makemigrations marketplace
python manage.py makemigrations chat

# Review what will be migrated
python manage.py showmigrations marketplace
python manage.py showmigrations chat
```

### 4. Apply Migrations
```bash
# Apply all pending migrations
python manage.py migrate

# Verify migrations were applied
python manage.py showmigrations | grep marketplace
python manage.py showmigrations | grep chat
```

### 5. Create Required Indexes (Optional but Recommended)
```bash
# Create database indexes for better performance
python manage.py shell << EOF
from django.db import connection
with connection.cursor() as cursor:
    # Index for location-based searches
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_business_location ON marketplace_businesslisting(latitude, longitude);')
    # Index for order lookups
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_order_number ON marketplace_consumerorder(order_number);')
    # Index for chat messages
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chat_conversation ON chat_chatmessage(conversation_id, created_at);')
print("Indexes created successfully")
EOF
```

### 6. Verify Installation
```bash
# Check if apps are properly installed
python manage.py shell << EOF
from django.apps import apps
print("Marketplace app:", apps.is_installed('marketplace'))
print("Chat app:", apps.is_installed('chat'))

# Test model imports
try:
    from marketplace.models import BusinessListing, ConsumerOrder
    from chat.models import ChatConversation, ChatMessage
    print("✅ All models imported successfully")
except ImportError as e:
    print("❌ Import error:", e)
EOF
```

### 7. Test API Endpoints
```bash
# Test marketplace endpoint (should return 401 without auth)
curl -I https://staging-api.dottapps.com/api/marketplace/consumer/categories/

# Test chat endpoint
curl -I https://staging-api.dottapps.com/api/chat/conversations/
```

### 8. Configure Environment Variables
In Render Dashboard:
1. Go to **Environment** tab
2. Add/verify these variables:
```
REDIS_URL=redis://your-redis-url
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_EXPRESS_ACCOUNT_ID=acct_1RkYGFC77wwa4lUB
```

### 9. Restart Service
1. In Render Dashboard, click **"Manual Deploy"**
2. Select **"Clear build cache & deploy"**
3. Wait for deployment to complete (usually 3-5 minutes)

### 10. Monitor Logs
1. Go to **"Logs"** tab
2. Look for:
   - "Django ASGI application with WebSocket support initialized successfully"
   - No migration warnings
   - Successful startup messages

## Production Deployment

After successful staging testing:

### 1. Merge to Main Branch
```bash
git checkout main
git merge staging
git push origin main
```

### 2. Repeat Migration Steps on Production
1. Access production service shell
2. Run same migration commands
3. Verify with production URL: https://api.dottapps.com

## Rollback Plan (If Needed)

### Quick Rollback
```bash
# In Render shell
python manage.py migrate marketplace zero
python manage.py migrate chat zero

# Remove apps from INSTALLED_APPS
# Redeploy previous commit from Render dashboard
```

### Database Backup
Before migration, create backup:
```bash
# In Render shell
python manage.py dbbackup
```

## Common Issues & Solutions

### Issue: Migration Dependencies Error
```bash
# Solution: Check migration dependencies
python manage.py showmigrations --plan
```

### Issue: Redis Connection Failed
```bash
# Solution: Verify REDIS_URL
python manage.py shell -c "from django.conf import settings; print(settings.REDIS_URL)"
```

### Issue: WebSocket Connection Failed
```bash
# Solution: Check ASGI configuration
python manage.py shell -c "from django.conf import settings; print(settings.ASGI_APPLICATION)"
```

### Issue: Import Error for GIS
```bash
# Solution: Temporarily disabled GIS features
# No action needed - will work without GIS
```

## Verification Checklist

- [ ] Code pushed to staging branch
- [ ] Migrations created successfully
- [ ] Migrations applied without errors
- [ ] API endpoints responding
- [ ] WebSocket connections working
- [ ] Environment variables configured
- [ ] Service restarted
- [ ] No errors in logs
- [ ] Staging testing complete
- [ ] Production deployment successful

## Support Contacts

- **Technical Issues**: Check Sentry dashboard
- **Database Issues**: Check PostgreSQL logs in Render
- **Deployment Issues**: Render support or check status.render.com
- **Code Issues**: Review `/backend/pyfactor/docs/TROUBLESHOOTING.md`

## Next Steps After Migration

1. **Test Core Features**:
   - Create a test business listing
   - Search for businesses
   - Send a chat message
   - Create a test order

2. **Monitor Performance**:
   - Check response times
   - Monitor database queries
   - Watch memory usage

3. **Configure Webhooks**:
   - Set up Stripe webhooks for payment confirmations
   - Configure order notification endpoints

4. **Enable Features Gradually**:
   - Start with limited categories
   - Enable for select users first
   - Monitor and scale as needed