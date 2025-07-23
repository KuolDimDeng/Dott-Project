# Staging Environment Setup Guide

## Overview
The staging environment is a complete isolated copy of production for testing before deployment.

## Architecture
- **Frontend**: https://dott-staging.onrender.com
- **Backend**: https://dott-api-staging.onrender.com
- **Database**: Separate PostgreSQL instance (no production data)
- **Redis**: Disabled (uses database for sessions)
- **Branch**: `staging`

## Key Differences from Production
1. **Separate Database**: No access to production user data
2. **No Redis**: Sessions stored in database for complete isolation
3. **Test Data Only**: Uses synthetic test accounts
4. **Debug Logging**: More verbose logging for troubleshooting

## Deployment Workflow
```bash
# 1. Switch to staging branch
git checkout staging

# 2. Make changes
# ... edit files ...

# 3. Commit and push
git add .
git commit -m "Your changes"
git push origin staging

# 4. Render auto-deploys to staging
```

## Test Accounts
After setting up the database, these accounts are available:
- **Owner**: owner@staging.com / StageTest123!
- **Admin**: admin@staging.com / StageTest123!
- **User**: user@staging.com / StageTest123!

## Database Setup (First Time Only)
1. Access Render backend shell
2. Run migrations: `python manage.py migrate`
3. Create test data: `python manage.py shell < scripts/create_staging_test_data.py`

## Verification
Run this to verify staging is properly configured:
```bash
python scripts/verify_staging_db.py
```

## Merging to Production
```bash
# 1. Test thoroughly in staging
# 2. Switch to main branch
git checkout main

# 3. Merge staging changes
git merge staging

# 4. Push to production
git push origin main
```

## Security Notes
- Staging has NO access to production data
- Different session cookies prevent cross-environment access
- Redis disabled to prevent any data leakage
- Use only test credit cards in staging

## Troubleshooting
- **Can't login**: Clear cookies for staging domain
- **Database errors**: Check if migrations need to run
- **Missing data**: Run create_staging_test_data.py script