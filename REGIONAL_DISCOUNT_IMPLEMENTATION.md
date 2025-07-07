# Regional Discount Implementation Guide

## Overview
This implementation provides a 50% discount for businesses in developing countries with abuse prevention mechanisms.

## 1. Database Setup

### Run Migration
```bash
cd backend/pyfactor
python manage.py migrate users
```

This creates:
- `developing_countries` table with 44 pre-populated countries
- `discount_verifications` table for tracking and abuse prevention
- Additional fields on `Business` model for discount tracking

## 2. Stripe Setup

### Create Discounted Prices in Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Create these prices:

#### Professional Plan
- **Monthly Discounted**: $7.50/month
  - Price ID: `price_professional_monthly_discounted`
- **Yearly Discounted**: $72.00/year
  - Price ID: `price_professional_yearly_discounted`

#### Enterprise Plan
- **Monthly Discounted**: $22.50/month
  - Price ID: `price_enterprise_monthly_discounted`
- **Yearly Discounted**: $216.00/year
  - Price ID: `price_enterprise_yearly_discounted`

### Update Environment Variables
```bash
# .env file
STRIPE_PRICE_PRO_MONTHLY_DISCOUNTED=price_professional_monthly_discounted
STRIPE_PRICE_PRO_YEARLY_DISCOUNTED=price_professional_yearly_discounted
STRIPE_PRICE_ENT_MONTHLY_DISCOUNTED=price_enterprise_monthly_discounted
STRIPE_PRICE_ENT_YEARLY_DISCOUNTED=price_enterprise_yearly_discounted
```

## 3. Frontend Integration

### During Onboarding
After business details are saved, check discount eligibility:

```javascript
// In your business details save function
const checkDiscountEligibility = async (businessId, countryCode) => {
  try {
    const response = await fetch('/api/discount/check-eligibility', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: businessId,
        country: countryCode
      })
    });
    
    const data = await response.json();
    
    if (data.eligible) {
      // Show success message
      toast.success(`Congratulations! You qualify for a ${data.discount_percentage}% discount!`);
      
      // Update UI to show discounted prices
      setDiscountApplied(true);
      setDiscountPercentage(data.discount_percentage);
    }
  } catch (error) {
    console.error('Error checking discount:', error);
  }
};
```

### On Landing Page
Use the GeoPricing component:

```javascript
import GeoPricing from '@/components/pricing/GeoPricing';

export default function PricingPage() {
  return (
    <div>
      <h1>Choose Your Plan</h1>
      <GeoPricing />
    </div>
  );
}
```

### During Checkout
Update your checkout to use v2 endpoint:

```javascript
const createCheckout = async (planType, billingCycle) => {
  const response = await fetch('/api/checkout/create-v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_type: planType,
      billing_cycle: billingCycle
    })
  });
  
  const data = await response.json();
  
  // Redirect to Stripe
  if (data.sessionId) {
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    await stripe.redirectToCheckout({ sessionId: data.sessionId });
  }
};
```

## 4. Abuse Prevention

### Automatic Monitoring
Set up a daily cron job:

```bash
# Add to crontab
0 9 * * * cd /path/to/backend && python manage.py check_discount_abuse
```

### Manual Review
Admin staff can review flagged accounts at:
`https://dottapps.com/admin/discount-verifications`

### Verification Triggers
Accounts are flagged when:
- IP country doesn't match claimed country
- Payment method from different country
- Multiple login countries (>3)
- Risk score >= 70

## 5. Testing

### Test Discount Eligibility
```python
# Django shell
from users.discount_service import DiscountVerificationService

# Check if Kenya is eligible
eligible, discount, needs_verification = DiscountVerificationService.check_discount_eligibility('KE')
print(f"Eligible: {eligible}, Discount: {discount}%")
```

### Test Different Countries
- **Eligible**: KE, NG, IN, BD, PK, MX, BR, etc.
- **Not Eligible**: US, UK, CA, AU, DE, FR, etc.

## 6. Monitoring

### Track Metrics
```sql
-- Discount usage by country
SELECT 
    claimed_country,
    COUNT(*) as businesses,
    AVG(risk_score) as avg_risk_score,
    SUM(CASE WHEN verification_status = 'flagged' THEN 1 ELSE 0 END) as flagged
FROM discount_verifications
GROUP BY claimed_country
ORDER BY businesses DESC;

-- Revenue impact
SELECT 
    SUM(CASE WHEN regional_discount_eligible THEN 1 ELSE 0 END) as discounted,
    SUM(CASE WHEN NOT regional_discount_eligible THEN 1 ELSE 0 END) as full_price
FROM users_business;
```

## 7. Customer Communication

### Success Message
When discount is applied:
> "🎉 Congratulations! As a business in [Country], you qualify for our 50% regional pricing discount. We're committed to making business tools accessible globally."

### Verification Request
If flagged for review:
> "Your regional discount has been applied provisionally. We may contact you within 30 days to verify your business location. This helps us maintain fair pricing for businesses in developing markets."

## 8. Future Enhancements

1. **Tiered Discounts**: Different percentages by income level
2. **Partner Verification**: Integration with local business registries
3. **Mobile Money Discounts**: Extra 5% off for mobile money users
4. **Referral Bonuses**: Additional months free for referring other local businesses

## 9. Support

For issues or questions about regional pricing:
- Email: support@dottapps.com
- Subject: "Regional Pricing Inquiry"
- Include: Business name, country, and issue description