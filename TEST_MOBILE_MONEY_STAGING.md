# Testing Mobile Money on Staging

## Quick Test Guide

### Option 1: Test via Mobile App (Recommended)

1. **Open the Dott Mobile App**
2. **Go to POS (Point of Sale)**
3. **Add items to cart**
4. **At checkout, select "MTN MoMo"**
5. **Enter test phone number**: `46733123450`
6. **Complete the payment**

### Option 2: Test via Browser Console

1. **Go to**: https://staging.dottapps.com
2. **Login to your account**
3. **Open Browser Console** (F12 or right-click → Inspect → Console)
4. **Paste this code**:

```javascript
// Test MTN MoMo Payment
async function testMoMoPayment() {
    const testData = {
        phone_number: "46733123450",  // Sandbox success number
        amount: "10.00",
        provider: "mtn_momo",
        currency: "EUR",
        message: "Test payment from staging"
    };
    
    console.log("🚀 Initiating MTN MoMo test payment...", testData);
    
    try {
        const response = await fetch("/api/payments/mobile-money/initialize/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("sessionToken")
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        console.log("✅ Payment initiated:", result);
        
        if (result.reference_id) {
            console.log("🔍 Checking status for reference:", result.reference_id);
            setTimeout(() => checkPaymentStatus(result.reference_id), 3000);
        }
    } catch (error) {
        console.error("❌ Payment failed:", error);
    }
}

async function checkPaymentStatus(referenceId) {
    try {
        const response = await fetch("/api/payments/mobile-money/status/" + referenceId + "/", {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("sessionToken")
            }
        });
        
        const result = await response.json();
        console.log("📊 Payment status:", result);
        
        if (result.status === "PENDING") {
            console.log("⏳ Still processing... checking again in 3 seconds");
            setTimeout(() => checkPaymentStatus(referenceId), 3000);
        } else if (result.status === "SUCCESSFUL") {
            console.log("🎉 Payment successful!");
        } else if (result.status === "FAILED") {
            console.log("❌ Payment failed");
        }
    } catch (error) {
        console.error("❌ Status check failed:", error);
    }
}

// Run the test
testMoMoPayment();
```

### Option 3: Test via cURL

```bash
# Get your session token first (login to staging.dottapps.com and check localStorage.sessionToken in console)
SESSION_TOKEN="your_session_token_here"

# Initialize payment
curl -X POST https://staging.dottapps.com/api/payments/mobile-money/initialize/ \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "46733123450",
    "amount": "10.00",
    "provider": "mtn_momo",
    "currency": "EUR",
    "message": "Test payment"
  }'

# Check status (use reference_id from above response)
curl -X GET https://staging.dottapps.com/api/payments/mobile-money/status/REFERENCE_ID/ \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Test Phone Numbers (MTN MoMo Sandbox)

| Phone Number | Result | Use Case |
|--------------|--------|----------|
| `46733123450` | ✅ Success | Test successful payments |
| `46733123451` | ❌ Failed | Test failed payments |
| `46733123452` | ⏳ Pending | Test timeout scenarios |

## Test Scenarios

### 1. Successful Payment
- Use phone: `46733123450`
- Expected: Payment completes successfully
- Status: `SUCCESSFUL`

### 2. Failed Payment
- Use phone: `46733123451`
- Expected: Payment is rejected
- Status: `FAILED`

### 3. Different Amounts
Test with various amounts:
- Minimum: `1.00`
- Small: `10.00`
- Medium: `100.00`
- Large: `1000.00`

### 4. Auto-Provider Detection
Test provider auto-detection:
```javascript
// Don't specify provider - let system detect
const testData = {
    phone_number: "254712345678",  // Kenya number
    amount: "100.00",
    provider: "auto",  // Auto-detect M-Pesa
    currency: "KES"
};
```

## Expected Responses

### Successful Initialization
```json
{
    "success": true,
    "reference_id": "abc-123-def-456",
    "message": "Payment request sent successfully",
    "provider": "mtn_momo"
}
```

### Status Check Response
```json
{
    "success": true,
    "status": "SUCCESSFUL",
    "transaction_id": "abc-123-def-456",
    "amount": "10.00",
    "currency": "EUR",
    "phone_number": "46733123450",
    "completed_at": "2024-01-20T10:30:00Z"
}
```

## Troubleshooting

### Issue: "Authentication failed"
**Solution**: Make sure you're logged in and have a valid session token

### Issue: "Provider not configured"
**Solution**: Check that environment variables are set on Render:
- `PAYMENT_TEST_MODE=True`
- `MOMO_SANDBOX_SUBSCRIPTION_KEY=326d22e6674c4d0e93831b138f4d6407`

### Issue: "Invalid phone number"
**Solution**: Use the sandbox test numbers listed above

### Issue: "Amount too small"
**Solution**: Minimum amount is 1.00 EUR for sandbox

## Monitoring

### Check Logs
1. Go to Render Dashboard
2. Select `dott-api-staging`
3. Click on "Logs" tab
4. Look for entries with `[MoMo]` or `[Payment]`

### Database Check
```sql
-- Check recent transactions
SELECT * FROM payments_mobilemoneytransaction 
ORDER BY created_at DESC 
LIMIT 10;

-- Check by reference
SELECT * FROM payments_mobilemoneytransaction 
WHERE reference_id = 'your-reference-id';
```

## Next Steps After Testing

1. ✅ Verify payments appear in database
2. ✅ Confirm webhook handling works
3. ✅ Test error scenarios
4. ✅ Check platform fee calculation (2%)
5. ⬜ Test with real mobile app
6. ⬜ Run load testing
7. ⬜ Prepare for production

## Mobile App Testing

To test in the mobile app:

1. **Build the app** with latest changes:
   ```bash
   cd frontend/pyfactor_next
   npm run build
   ./copy-mobile-files.sh
   npx cap sync
   ```

2. **Run on iOS**:
   ```bash
   npx cap run ios
   ```

3. **Run on Android**:
   ```bash
   npx cap run android
   ```

4. **Test POS checkout** with MTN MoMo option

---

**Ready to test?** Start with Option 1 (Mobile App) or Option 2 (Browser Console) above!