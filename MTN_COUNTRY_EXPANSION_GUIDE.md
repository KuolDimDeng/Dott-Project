# MTN MoMo Country Expansion Guide

## Current Status: Sandbox Only ✅
- **Testing**: Works with any MTN sandbox number
- **Production**: Requires country-by-country setup

## MTN MoMo Countries (12 Total)

### 🌍 Available Countries:

| Country | Currency | Status | Business Required |
|---------|----------|---------|-------------------|
| 🇺🇬 Uganda | UGX | ⚠️ Pending | Local business registration |
| 🇬🇭 Ghana | GHS | ⚠️ Pending | Local business registration |
| 🇿🇦 South Africa | ZAR | ⚠️ Pending | Local business registration |
| 🇨🇲 Cameroon | XAF | ⚠️ Pending | Local business registration |
| 🇨🇮 Ivory Coast | XOF | ⚠️ Pending | Local business registration |
| 🇷🇼 Rwanda | RWF | ⚠️ Pending | Local business registration |
| 🇿🇲 Zambia | ZMW | ⚠️ Pending | Local business registration |
| 🇳🇬 Nigeria | NGN | ⚠️ Pending | Local business registration |
| 🇧🇯 Benin | XOF | ⚠️ Pending | Local business registration |
| 🇬🇳 Guinea | GNF | ⚠️ Pending | Local business registration |
| 🇨🇬 Congo | XAF | ⚠️ Pending | Local business registration |
| 🇱🇷 Liberia | LRD | ⚠️ Pending | Local business registration |

### 🧪 Currently Working:
- **Sandbox**: All test phone numbers work globally
- **Phone Pattern**: `467331234XX` (sandbox numbers)

## How to Enable a Country

### Step 1: Business Registration
Each country requires local business registration:

```bash
# Example for Uganda:
1. Register business with Uganda Registration Services Bureau
2. Get Tax Identification Number (TIN)
3. Open local bank account
4. Get trading license
```

### Step 2: MTN MoMo Application
1. **Go to**: https://momodeveloper.mtn.com
2. **Select Country**: Choose the specific country
3. **Submit Documents**:
   - Business registration certificate
   - Tax registration
   - Bank account details
   - Director identification
   - Proof of address

### Step 3: Wait for Approval (5-15 business days)
You'll receive:
- Production Subscription Key
- API User ID
- API Key
- Target Environment settings

### Step 4: Configure in Your System

1. **Add to Environment Variables**:
```bash
# Example for Uganda
MOMO_UGANDA_SUBSCRIPTION_KEY=your_uganda_key
MOMO_UGANDA_API_USER=your_uganda_user
MOMO_UGANDA_API_KEY=your_uganda_api_key
```

2. **Enable in Config**:
```python
# In mtn_country_config.py
'256': {
    'country': 'Uganda',
    'enabled': True  # Change to True
}
```

### Step 5: Test and Go Live
```bash
# Test with real Uganda number
curl -X POST https://api.dottapps.com/api/payments/mobile-money/initialize/ \
  -d '{
    "phone_number": "256701234567",
    "amount": "5000",
    "currency": "UGX",
    "provider": "mtn_momo"
  }'
```

## Revenue by Country

### High Volume Countries (Good ROI):
1. **🇺🇬 Uganda**: 45M people, 60% MoMo adoption
2. **🇬🇭 Ghana**: 30M people, 70% MoMo adoption  
3. **🇳🇬 Nigeria**: 200M people, 40% MoMo adoption
4. **🇿🇦 South Africa**: 58M people, 50% MoMo adoption

### Medium Volume:
1. **🇨🇲 Cameroon**: 26M people
2. **🇷🇼 Rwanda**: 13M people
3. **🇿🇲 Zambia**: 18M people

### Lower Volume:
1. **🇨🇮 Ivory Coast**: 26M people
2. **🇧🇯 Benin**: 12M people
3. **🇬🇳 Guinea**: 13M people
4. **🇨🇬 Congo**: 5M people
5. **🇱🇷 Liberia**: 5M people

## Cost Analysis

### Per Country Setup:
- **Business Registration**: $500-2,000
- **Legal/Compliance**: $1,000-3,000
- **Bank Account**: $100-500
- **Time Investment**: 2-6 months

### Revenue Potential:
- **Platform Fee**: 2% per transaction
- **Average Transaction**: $10-50 USD equivalent
- **Break Even**: ~5,000 transactions per country

## Recommended Expansion Order:

### Phase 1 (High Priority):
1. **🇺🇬 Uganda** - Largest MTN market, English speaking
2. **🇬🇭 Ghana** - High adoption, stable economy

### Phase 2 (Medium Priority):
3. **🇳🇬 Nigeria** - Huge market, competitive
4. **🇿🇦 South Africa** - High value transactions

### Phase 3 (Long Term):
5. **🇨🇲 Cameroon** - Growing market
6. **🇷🇼 Rwanda** - Tech-forward country

## Alternative: Partner Approach

Instead of registering in each country individually:

### Option 1: Use MTN Global Partner
- Partner with existing MTN aggregator
- Share revenue split
- Faster to market
- Lower setup costs

### Option 2: White-label Solution
- Partner with local fintech companies
- They handle compliance
- You provide technology
- Revenue sharing model

## Current Testing (What Works Now):

```javascript
// This works globally in sandbox mode
const testPayment = {
    phone_number: "46733123450",  // Works from anywhere
    amount: "10.00",
    currency: "EUR",
    provider: "mtn_momo"
};
```

## Next Steps:

1. **✅ Test current sandbox integration**
2. **🔄 Choose first country for expansion** 
3. **📋 Start business registration process**
4. **🏦 Apply for MTN MoMo partnership**
5. **🚀 Go live in first country**
6. **📈 Scale to other countries**

---

**Bottom Line**: The code is ready for all MTN countries, but each requires separate business registration and approval. Start with Uganda or Ghana for best ROI.