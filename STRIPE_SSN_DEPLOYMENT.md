# Stripe SSN Storage Implementation - Deployment Instructions

## Overview
We've implemented secure SSN storage using Stripe Connect to ensure PCI compliance. SSNs are now stored in Stripe's secure infrastructure, with only the last 4 digits kept in our database.

## What's Been Done
1. Created `StripeSSNService` class for Stripe Connect integration
2. Updated Employee model to use the new service
3. Modified API endpoints to handle SSN storage through Stripe
4. Created database migration scripts

## Required Steps to Complete Deployment

### 1. Run Database Migration on Production
SSH into your production server and run:
```bash
cd /app
python scripts/add_stripe_ssn_fields_prod.py
```

Or through Django management:
```bash
python manage.py shell < scripts/add_stripe_ssn_fields.py
```

### 2. Verify Stripe Configuration
Ensure these environment variables are set in production:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (if needed)

### 3. Test the Implementation
1. Create a new employee with SSN
2. Verify in Stripe Dashboard that a Connect account was created
3. Check that only last 4 digits are stored in database

## Key Features
- Full SSN stored securely in Stripe Connect
- Only last 4 digits stored locally for display
- Automatic Stripe account creation for each employee
- SSN validation before storage
- Support for international ID numbers

## Database Changes
The migration adds these fields to `hr_employee` table:
- `stripe_account_id` - Stripe Connect account ID
- `stripe_person_id` - Stripe Person ID (future use)
- `ssn_stored_in_stripe` - Boolean flag indicating SSN is in Stripe

## Security Notes
- SSNs are never logged or stored in plain text
- Stripe handles all PCI compliance requirements
- Delete operations clean up Stripe data automatically
- Failed SSN storage doesn't block employee creation

## Monitoring
Check logs for:
- `[StripeSSN]` prefix for all Stripe SSN operations
- Success: "✅ SSN stored successfully"
- Failures: Detailed error messages for troubleshooting