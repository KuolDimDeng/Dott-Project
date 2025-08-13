# Staging Database Setup Guide

Since the production database export link has expired and we can't connect directly from your local machine, follow these steps to set up your staging database using Render's shell.

## Option 1: Use Render's Database Recovery (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to your **production database** (dott_db_rj48)
3. Click on "Recovery" tab
4. Download the latest backup
5. Navigate to your **staging database** (dott_db_staging)
6. Click on "Recovery" tab
7. Upload the backup file
8. Select "Schema Only" import option if available

## Option 2: Manual Setup via Render Shell

### Step 1: Connect to Staging Backend Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on `dott-api-staging` service
3. Click on "Shell" tab

### Step 2: Clear Staging Database and Run Migrations

Run these commands in the Render shell:

```bash
# First, let's check current state
python manage.py showmigrations | head -20

# Clear the database completely
python manage.py dbshell << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\q
EOF

# Now run fresh migrations
python manage.py migrate

# Create a superuser for testing
python manage.py shell << 'EOF'
from custom_auth.models import CustomUser, Tenant, UserProfile
from django.utils import timezone

# Create tenant
tenant, _ = Tenant.objects.get_or_create(
    subdomain='staging-test',
    defaults={'name': 'Staging Test Company', 'is_active': True}
)

# Create user
user, created = CustomUser.objects.get_or_create(
    email='admin@staging.dottapps.com',
    defaults={
        'is_active': True,
        'is_staff': True,
        'is_superuser': True,
        'auth0_user_id': 'auth0|staging-test-user',
        'onboarding_completed': True,
        'tenant': tenant,
        'date_joined': timezone.now()
    }
)

# Create user profile
profile, _ = UserProfile.objects.get_or_create(
    user=user,
    defaults={
        'subscription_plan': 'professional',
        'subscription_status': 'active'
    }
)

print(f"User created: {user.email}")
print(f"Tenant: {tenant.subdomain}")
EOF

# Verify tables were created
python manage.py dbshell -c '\dt' | wc -l
```

### Step 3: Verify Everything Works

```bash
# Test that the API responds
curl https://dott-api-staging.onrender.com/api/health/

# Check migrations are complete
python manage.py showmigrations | grep "\[ \]" | wc -l
# Should return 0 (meaning all migrations are applied)
```

## Option 3: Copy Schema Using Production Shell

If the above doesn't work, you can export the schema from production:

### In Production Shell (dott-api service):

```bash
# Export schema only (no data)
pg_dump $DATABASE_URL \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  > /tmp/schema.sql

# View file size
ls -lh /tmp/schema.sql

# Copy the contents (you'll need to transfer this to staging somehow)
cat /tmp/schema.sql | head -100
```

### In Staging Shell (dott-api-staging service):

```bash
# Create a file with the schema (paste the content)
cat > /tmp/schema.sql << 'EOF'
[PASTE THE SCHEMA HERE]
EOF

# Import it
psql $DATABASE_URL < /tmp/schema.sql
```

## Current Status

Based on our previous attempts:
- ❌ Production export link expired
- ❌ Can't connect to production DB from local machine
- ✅ Staging database is accessible
- ✅ Django migrations are ready

## Recommended Next Steps

1. **Use Option 2** (Manual Setup via Render Shell) - This is the simplest and most reliable
2. Once the database is set up, your staging environment should work properly
3. Both frontend and backend services should deploy successfully

## Troubleshooting

If you see migration errors after setup:
```bash
# In staging shell
python manage.py migrate --fake
```

If you see "relation does not exist" errors:
```bash
# The migrations weren't applied properly
python manage.py migrate --run-syncdb
```

## Environment Variables to Verify

Make sure these are set in your staging backend:
- `DATABASE_URL` - Should point to staging database
- `REDIS_URL` - Should point to staging Redis
- `ENVIRONMENT=staging`
- All Auth0 variables
- All API keys

## Testing URLs

Once complete, test these:
- Frontend: https://staging.dottapps.com
- Backend API: https://dott-api-staging.onrender.com/api/health/
- Admin: https://dott-api-staging.onrender.com/admin/