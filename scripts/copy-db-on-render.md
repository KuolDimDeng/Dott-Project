# Copy Production Database to Staging on Render

Since direct connection from local machine is blocked, here's how to copy the database using Render's tools:

## Option 1: Use Render Dashboard (Easiest)

1. Go to Render Dashboard
2. Click on `dott-db` (production database)
3. Go to "Backups" tab
4. Create a manual backup
5. Once backup is complete, click on `dott-db-staging`
6. Go to "Backups" tab
7. Click "Restore from backup"
8. Select the production backup you just created

## Option 2: Use Render Shell (More Control)

1. Open Render Dashboard
2. Click on `dott-api` (production backend)
3. Click "Shell" tab to open terminal
4. Run these commands:

```bash
# Create backup from production
pg_dump $DATABASE_URL > /tmp/prod_backup.sql

# Connect to staging database and restore
psql $STAGING_DATABASE_URL < /tmp/prod_backup.sql

# Clean up
rm /tmp/prod_backup.sql
```

## Option 3: Use pg_dump with Render's Internal Network

1. SSH into staging backend service:
```bash
render shell dott-api-staging
```

2. Run this script:
```bash
# Set database URLs
PROD_URL="postgresql://dott_db_rj48_user:HYKEMGJSmHazfxTJF1SdOy4n7VnxpKjf@dpg-d14numtmpk0c73fcss30-a:5432/dott_db_rj48"
STAGING_URL="postgresql://dott_db_staging_user:K1k1wll1XM4uv9eZeAB3QAYaZ7BP4ehe@dpg-d20897vfte5s738ismk0-a:5432/dott_db_staging"

# Create backup (using internal hostname - note the -a instead of full domain)
pg_dump "$PROD_URL" --no-owner --no-privileges --no-acl > /tmp/backup.sql

# Clear staging and restore
psql "$STAGING_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$STAGING_URL" < /tmp/backup.sql

# Anonymize data for staging
psql "$STAGING_URL" << 'EOF'
BEGIN;
-- Anonymize emails except beta user
UPDATE custom_auth_customuser 
SET email = CONCAT('user_', id, '@staging.dottapps.com')
WHERE email != 'kuoldimdeng@outlook.com' 
  AND email NOT LIKE '%@dottapps.com';

-- Clear sessions
DELETE FROM django_session;
DELETE FROM session_manager_usersession;
COMMIT;
EOF

# Clean up
rm /tmp/backup.sql

echo "Database copy complete!"
```

## Option 4: Create Database Snapshot (Render Pro feature)

If you have Render Pro:
1. Go to `dott-db` 
2. Click "Snapshots"
3. Create snapshot
4. Restore snapshot to `dott-db-staging`

## Verification

After copying, verify the data:

1. SSH into staging backend:
```bash
render shell dott-api-staging
```

2. Check data:
```bash
python manage.py dbshell
SELECT COUNT(*) FROM custom_auth_customuser;
SELECT email FROM custom_auth_customuser WHERE email = 'kuoldimdeng@outlook.com';
\q
```

## Important Notes

- The production database uses internal Render hostnames ending in `-a` when accessed from within Render
- External connections may be blocked for security
- Always anonymize sensitive data in staging
- Keep beta user email (kuoldimdeng@outlook.com) for testing