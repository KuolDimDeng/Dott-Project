# Pricing Calculations

## Subscription Plans

### Basic (Free)
- Monthly: $0
- Yearly: $0

### Professional
- Monthly: $15/month
- Yearly calculation:
  - Full price: $15 × 12 = $180/year
  - 20% discount: $180 × 0.20 = $36
  - **Final yearly price: $180 - $36 = $144/year**
  - Monthly equivalent when paid yearly: $144 ÷ 12 = $12/month

### Enterprise
- Monthly: $45/month
- Yearly calculation:
  - Full price: $45 × 12 = $540/year
  - 20% discount: $540 × 0.20 = $108
  - **Final yearly price: $540 - $108 = $432/year**
  - Monthly equivalent when paid yearly: $432 ÷ 12 = $36/month

## Regional Pricing (50% discount for developing countries)

### Professional (Developing Countries)
- Monthly: $7.50/month
- Yearly: $72/year (20% off from $90)

### Enterprise (Developing Countries)
- Monthly: $22.50/month
- Yearly: $216/year (20% off from $270)

## Implementation Notes

1. The yearly prices are hardcoded in the PLANS array with the discount already applied
2. When displaying yearly pricing, we show:
   - The discounted price as the main price
   - The original price (monthly × 12) with strikethrough
   - "Save 20%" text to highlight the discount

3. For developing countries, the 50% discount is applied first, then the 20% annual discount is applied on top