# Fix Onboarding Redirect Issue on Production

## Steps to run on Render backend shell:

1. SSH into the Render backend shell
2. Run the following commands:

```bash
# Fix admin@dottapps.com specifically
python scripts/fix_onboarding_redirect_loop.py --email admin@dottapps.com

# Or fix ALL users who completed onboarding but are stuck
python scripts/fix_onboarding_redirect_loop.py --all

# Verify the fix worked
python scripts/fix_onboarding_redirect_loop.py --verify admin@dottapps.com
```

## What this does:
- Updates OnboardingProgress status to 'complete'
- Sets setup_completed = True
- Updates all active sessions to needs_onboarding = False
- Ensures users won't be redirected to onboarding

## To check affected users first:
```bash
python scripts/fix_onboarding_redirect_loop.py --all --dry-run
```