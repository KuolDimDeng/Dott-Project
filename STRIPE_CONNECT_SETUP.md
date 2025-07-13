# Stripe Connect Platform Setup Guide

## Current Status
Your Stripe SSN storage implementation is using a simplified approach with Stripe Customers until your Connect platform profile is set up.

## To Enable Full Stripe Connect Integration:

### 1. Complete Your Platform Profile
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect** → **Platform profile**
3. Complete all required sections:
   - Platform details
   - Business verification
   - Loss liability acceptance
   - Requirements collection agreement

### 2. Accept Platform Responsibilities
You'll need to acknowledge:
- Managing losses from connected accounts
- Collecting requirements from connected accounts
- Platform terms of service

### 3. Switch Back to Full Implementation
Once your platform profile is approved:

```python
# In backend/pyfactor/hr/models.py
# Change this:
from .stripe_ssn_service_simple import StripeSSNService

# Back to this:
from .stripe_ssn_service import StripeSSNService
```

## Current Simplified Implementation
The simplified version:
- Uses Stripe Customers instead of Connect accounts
- Stores SSN metadata securely
- Provides the same API interface
- Works without platform profile setup

## Benefits of Full Connect Implementation
- Enhanced security with Connect account isolation
- Better compliance for payroll processing
- Ability to process payments on behalf of employees
- More detailed employee verification

## Testing Current Implementation
The simplified version works immediately:
```bash
python scripts/test_stripe_ssn.py
```

This will create a Stripe Customer with SSN metadata stored securely.