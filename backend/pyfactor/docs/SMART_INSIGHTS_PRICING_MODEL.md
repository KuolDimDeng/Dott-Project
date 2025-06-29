# Smart Insights Pricing Model Documentation

## Overview
Smart Insights uses a token-based credit system where users purchase credits to make AI-powered business intelligence queries. The system provides fair, transparent pricing based on actual Claude API usage.

## Credit System
- **1 credit = $0.001 of Claude API usage**
- **User pays: $0.10 per credit**
- **Minimum charge: 1 credit per query**

## Claude API Costs (Anthropic Pricing)
- **Model**: Claude 3 Sonnet
- **Input tokens**: $3 per million tokens ($0.000003/token)
- **Output tokens**: $15 per million tokens ($0.000015/token)

## Credit Packages

| Package | Credits | Price | Per Credit | Est. Queries | API Cost | Gross Profit |
|---------|---------|-------|------------|--------------|----------|--------------|
| **Starter** | 100 | $13.00 | $0.13 | ~10 | $0.10 | $12.90 |
| **Growth** | 500 | $65.00 | $0.13 | ~50 | $0.50 | $64.50 |
| **Professional** | 1000 | $130.00 | $0.13 | ~100 | $1.00 | $129.00 |
| **Enterprise** | 2500 | $325.00 | $0.13 | ~250 | $2.50 | $322.50 |

## Query Types & Credit Usage

### Short Queries (5 credits)
- **Token usage**: ~500 input + 200 output = 700 total
- **Examples**: 
  - "How many customers do I have?"
  - "What's my total revenue today?"
  - "Show me my top products"
- **User cost**: $0.50 per query
- **API cost**: $0.005 per query

### Medium Queries (10 credits)
- **Token usage**: ~1,000 input + 500 output = 1,500 total
- **Examples**:
  - "Show me sales trends this month"
  - "Which customers haven't ordered recently?"
  - "Compare my product performance"
- **User cost**: $1.00 per query
- **API cost**: $0.010 per query

### Long Queries (20 credits)
- **Token usage**: ~2,000 input + 1,000 output = 3,000 total
- **Examples**:
  - "Analyze customer segments and suggest strategies"
  - "Provide detailed quarterly comparison"
  - "Create a comprehensive business health report"
- **User cost**: $2.00 per query
- **API cost**: $0.020 per query

## Queries Per Package

| Package | Short Queries | Medium Queries | Long Queries | Mixed Usage* |
|---------|---------------|----------------|--------------|--------------|
| Starter | 20 | 10 | 5 | ~10 |
| Growth | 100 | 50 | 25 | ~50 |
| Professional | 200 | 100 | 50 | ~100 |
| Enterprise | 500 | 250 | 125 | ~250 |

*Mixed usage assumes: 50% short, 30% medium, 20% long queries

## Profit Margins

### Base Markup
- **Credit markup**: 9,900% (99x) on Claude API costs
- **Package markup**: Additional 30% on bundled credits
- **Effective markup**: ~12,900% (129x) when buying packages

### Transaction Fees
- **Stripe fees**: 2.9% + $0.30 (passed to customer)
- **Additional fee**: $0.30 (pure profit)
- **Total customer pays**: 2.9% + $0.60 in fees

## Business Context Integration
Each query includes:
- Customer data (count, names, recent activity)
- Product catalog (inventory, pricing)
- Supplier information
- Sales metrics (last 30 days)
- Business profile (name, subscription plan)

This context ensures Claude provides specific, actionable insights rather than generic advice.

## Usage Recommendations

### User Profiles
- **Light User** (10-20 queries/month): Starter Pack
- **Regular User** (50-100 queries/month): Growth Pack
- **Power User** (100-200 queries/month): Professional Pack
- **Enterprise User** (250+ queries/month): Enterprise Pack

### Cost Comparison
- **ChatGPT Plus**: $20/month (no business data)
- **Claude Pro**: $20/month (no business data)
- **Smart Insights Growth**: $65 (~50 business-specific queries)

## Implementation Details

### Credit Calculation Formula
```python
# Calculate actual API cost
input_cost = input_tokens * 0.000003
output_cost = output_tokens * 0.000015
total_api_cost = input_cost + output_cost

# Convert to credits (1 credit = $0.001)
credits_used = max(1, math.ceil(total_api_cost / 0.001))
```

### Free Credits Allocation
- **Free Plan**: 5 credits (one-time)
- **Professional Plan**: 10 credits (one-time)
- **Enterprise Plan**: 20 credits (one-time)

### Rate Limiting
- 10 requests per minute per user
- Redis-based distributed rate limiting
- Prevents abuse while allowing reasonable usage

### Monthly Spending Cap
- $500 per user per month
- Protects against runaway costs
- Configurable per user if needed

## Revenue Projections

### Per 1,000 Active Users (Mixed Usage)
- **Starter users** (40%): 400 × $13 = $5,200/month
- **Growth users** (35%): 350 × $65 = $22,750/month
- **Professional** (20%): 200 × $130 = $26,000/month
- **Enterprise** (5%): 50 × $325 = $16,250/month
- **Total Revenue**: $70,200/month
- **API Costs**: ~$543/month
- **Gross Profit**: ~$69,657/month (99.2% margin)

## Future Enhancements
1. Volume discounts for enterprise customers
2. Subscription plans with monthly credit allocations
3. Custom models for specific industries
4. API access for programmatic queries
5. Team/organization credit pools