# Render Deployment Guide for Session Management

## Current Status: Redis is NOT running in production

The session management system is designed to work with or without Redis. Currently, your production environment on Render does NOT have Redis configured.

## Option 1: Deploy WITHOUT Redis (Recommended - Immediate)

### Why This Works
- Sessions are stored in PostgreSQL database
- Redis is only used for caching (optional)
- The code already handles missing Redis gracefully
- No additional cost or setup required

### Steps to Deploy

#### 1. Commit and Push Changes
```bash
cd /Users/kuoldeng/projectx/backend
git add .
git commit -m "Add session management system with database storage"
git push origin Dott_Main_Dev_Deploy
```

#### 2. Run Migrations on Render

**Option A: Via Render Shell**
1. Go to Render Dashboard → dott-api service
2. Click "Shell" tab
3. Run:
```bash
python manage.py migrate session_manager
```

**Option B: Add to Build Command**
1. Go to Settings → Build & Deploy
2. Update Build Command:
```bash
pip install -r requirements-render.txt && python manage.py migrate --no-input && python manage.py collectstatic --no-input
```

#### 3. Verify Deployment
```bash
# Check health
curl https://api.dottapps.com/health/

# Test session endpoint (need valid Auth0 token)
curl -X POST https://api.dottapps.com/api/sessions/create/ \
  -H "Authorization: Bearer YOUR_AUTH0_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"needs_onboarding": true}'
```

### Performance Without Redis
- ✅ **Works perfectly fine** - All features functional
- ✅ **No additional cost** - Uses existing PostgreSQL
- ⚠️ **Slightly slower** - Database queries instead of memory cache
- ⚠️ **More DB load** - Each session check hits database

### When This is Fine
- Less than 1000 concurrent users
- Session checks < 100/second
- Cost-conscious deployment
- MVP or early-stage product

## Option 2: Add Redis to Render (Better Performance)

### When You Need Redis
- High traffic (>1000 concurrent users)
- Many session checks per second
- Need sub-millisecond response times
- Want to reduce database load

### Steps to Add Redis

#### 1. Create Redis Instance on Render

**Via Dashboard:**
1. Click "New +" → "Redis"
2. Configure:
   - **Name**: `dott-redis`
   - **Region**: Oregon (same as your app)
   - **Plan**: Starter ($7/month)
   - **Maxmemory Policy**: `allkeys-lru`
3. Click "Create Redis"

**Via CLI:**
```bash
brew install render-cli
render redis create --name dott-redis --region oregon --plan starter
```

#### 2. Get Connection Details

After creation, you'll see:
- **Internal URL**: `redis://red-xxxxx:6379` (use this)
- **External URL**: `rediss://red-xxxxx.oregon-postgres.render.com:6379`

#### 3. Add to Environment Variables

In Render Dashboard → dott-api → Environment:
```
REDIS_URL=redis://red-xxxxx:6379
REDIS_HOST=red-xxxxx
REDIS_PORT=6379
```

#### 4. Verify Redis Connection

After deployment, check:
```python
# In Django shell
from session_manager.services import session_service
print(f"Redis connected: {bool(session_service.redis_client)}")
```

## Session Cleanup Strategy

### Without Redis (Database Only)

Add a cron job in Render:

1. Go to "New +" → "Cron Job"
2. Configure:
   - **Name**: `session-cleanup`
   - **Command**: `cd pyfactor && python manage.py cleanup_sessions`
   - **Schedule**: `0 */6 * * *` (every 6 hours)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements-render.txt`

### With Redis

Sessions expire automatically in Redis, but still run cleanup for database:
```python
# Add to settings.py
CELERY_BEAT_SCHEDULE = {
    'cleanup-sessions': {
        'task': 'session_manager.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour='*/6'),
    },
}
```

## Monitoring Sessions

### Add Monitoring Endpoint

```python
# In session_manager/urls.py
path('stats/', SessionStatsView.as_view(), name='session-stats'),

# In session_manager/views.py
class SessionStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.db.models import Count
        from datetime import timedelta
        
        now = timezone.now()
        stats = {
            'total_sessions': UserSession.objects.count(),
            'active_sessions': UserSession.objects.filter(
                is_active=True,
                expires_at__gt=now
            ).count(),
            'sessions_24h': UserSession.objects.filter(
                created_at__gte=now - timedelta(hours=24)
            ).count(),
            'redis_available': bool(session_service.redis_client),
            'using_cache': 'Redis' if session_service.redis_client else 'Database'
        }
        return Response(stats)
```

### Check Stats
```bash
curl https://api.dottapps.com/api/sessions/stats/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Decision Matrix

| Metric | Without Redis | With Redis |
|--------|--------------|------------|
| **Setup Time** | 5 minutes | 15 minutes |
| **Monthly Cost** | $0 | $7 |
| **Session Lookup** | ~5-10ms | <1ms |
| **Concurrent Users** | <1000 | Unlimited |
| **Complexity** | Low | Medium |
| **Maintenance** | None | Minimal |

## Recommended Path

1. **Deploy without Redis first** ✅
2. **Monitor performance for 1-2 weeks**
3. **Add Redis if you see:**
   - Slow session lookups (>50ms)
   - High database CPU usage
   - Many concurrent users (>500)

## Quick Rollback

If issues arise:

```python
# In settings.py, comment out:
# 'session_manager',  # in INSTALLED_APPS
# 'session_manager.authentication.SessionAuthentication',  # in REST_FRAMEWORK
# 'session_manager.middleware.SessionMiddleware',  # in MIDDLEWARE
```

Then redeploy. The session tables remain for debugging.

## Support & Debugging

```python
# Check if sessions are working
python manage.py shell
>>> from session_manager.models import UserSession
>>> UserSession.objects.count()
>>> UserSession.objects.filter(is_active=True).count()

# Check Redis status
>>> from session_manager.services import session_service
>>> session_service.redis_client  # None if no Redis
```

The system is production-ready and will work great without Redis for most use cases!