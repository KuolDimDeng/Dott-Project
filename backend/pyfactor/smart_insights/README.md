# Smart Insights Credit System Documentation

## Overview
Smart Insights is an AI-powered business intelligence feature using Claude API with a credit-based payment system.

## Free Credits (One-Time Welcome Bonus)
All users automatically receive free credits based on their subscription plan:

- **Free Plan**: 5 credits
- **Professional Plan**: 10 credits  
- **Enterprise Plan**: 20 credits

### Automatic Credit Allocation
- **New Users**: Credits granted automatically upon account creation
- **Existing Users**: Run `python manage.py grant_initial_credits`
- **Plan Changes**: Users who upgrade before using any credits will receive the higher plan's allocation

These are one-time credits that don't renew. Once consumed, users must purchase additional credits.

## Credit Calculation
- **1 credit = $0.001 (0.1 cent) of Claude API usage**
- **Minimum charge**: 1 credit per query
- **Claude 3 Sonnet costs**:
  - Input: $3 per million tokens ($0.000003/token)
  - Output: $15 per million tokens ($0.000015/token)
- **Examples**:
  - Short query (500 input + 200 output tokens): 1 credit
  - Medium query (1,000 input + 500 output tokens): 2 credits
  - Long analysis (2,000 input + 1,000 output tokens): 3 credits
- **User pays**: $0.10 per credit (100x markup for business sustainability)

## Credit Packages & Pricing
All packages include a 30% markup on the base cost ($0.10/credit):

| Package | Credits | Price | Per Credit | Est. Queries | Your Cost | Profit |
|---------|---------|-------|------------|--------------|-----------|---------|
| Starter Pack | 100 | $13.00 | $0.13 | ~10 queries | $10.00 | $3.00 |
| Growth Pack | 500 | $65.00 | $0.13 | ~50 queries | $50.00 | $15.00 |
| Professional Pack | 1000 | $130.00 | $0.13 | ~100 queries | $100.00 | $30.00 |
| Enterprise Pack | 2500 | $325.00 | $0.13 | ~250 queries | $250.00 | $75.00 |

*Note: Actual queries per package depends on query complexity (typically 5-20 credits per query)*

## Transaction Fees
- **Stripe fees** (passed to customer): 2.9% + $0.30
- **Your transaction fee** (additional profit): $0.30
- **Total customer pays**: 2.9% + $0.60 in fees

## Features
1. **Token-Based Credit System**: 1 credit = $0.001 of Claude API usage (minimum 1 credit per query)
2. **Rate Limiting**: 10 requests per minute (Redis-based)
3. **Monthly Spending Cap**: $500 per user
4. **Audit Trail**: All queries and transactions logged
5. **Stripe Integration**: Secure payment processing
6. **Auto Credit Allocation**: Credits added automatically after payment
7. **Business Data Context**: Queries include actual customer, product, and sales data

## Backend Endpoints
- `GET /api/smart-insights/credits/` - Get user credit balance
- `GET /api/smart-insights/packages/` - List available packages
- `POST /api/smart-insights/query/` - Submit AI query
- `POST /api/smart-insights/purchase/` - Create Stripe checkout session
- `GET /api/smart-insights/history/` - Transaction history
- `POST /api/stripe/webhook/` - Stripe webhook handler

## Management Commands
```bash
# Grant initial credits to existing users
python manage.py grant_initial_credits

# Set up credit packages
python manage.py setup_credit_packages
```

## Environment Variables Required
```
# Backend (Django)
REDIS_URL=redis://your-redis-url:6379
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MODE=test  # or 'live' for production

# Smart Insights specific Claude API (separate from tax API)
CLAUDE_SMART_INSIGHTS_API_KEY=sk-ant-api03-...
CLAUDE_SMART_INSIGHTS_MODEL=claude-3-sonnet-20240229
CLAUDE_SMART_INSIGHTS_MAX_TOKENS=1000

# Frontend (Next.js)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

## Security Features
- Session-based authentication
- Input validation and sanitization
- Rate limiting to prevent abuse
- Monthly spending limits
- Comprehensive audit logging
- All sensitive keys in environment variables

## Cost Analysis
For 10,000 users:
- Initial free credits cost: ~$6,500 (one-time)
- Break-even: ~1,000 credit pack purchases
- Potential annual profit: $66,000+ (moderate usage)
- Transaction fee profit: $14,000+/year

## Database Models
- `CreditPackage`: Available credit packages
- `UserCredit`: User credit balances
- `CreditTransaction`: Transaction history
- `QueryLog`: AI query audit trail
- `MonthlyUsage`: Monthly usage tracking