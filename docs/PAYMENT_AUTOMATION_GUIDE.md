# Complete Payment Automation Implementation Guide

## Overview
This guide shows how to implement the complete Stripe → Wise payment flow for automatic merchant settlements.

---

## 1. Wise Integration - Connect Merchant Bank Accounts

### Step 1: Create Wise Bank Settings Page

```javascript
// frontend/pyfactor_next/src/app/Settings/banking/WiseIntegration.js

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function WiseIntegration() {
  const [recipientData, setRecipientData] = useState({
    accountHolderName: '',
    currency: 'USD',
    type: 'personal', // or 'business'
    details: {
      // Bank details vary by country
      accountNumber: '',
      routingNumber: '', // US
      swiftCode: '', // International
      iban: '', // Europe
      sortCode: '', // UK
    }
  });

  const handleCreateWiseRecipient = async () => {
    const response = await fetch('/api/banking/wise/create-recipient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipientData)
    });
    
    if (response.ok) {
      const data = await response.json();
      toast.success('Wise recipient created successfully');
      // Save recipient ID for future transfers
      localStorage.setItem('wise_recipient_id', data.recipient_id);
    }
  };

  return (
    // UI for entering bank details
  );
}
```

### Step 2: Backend Wise Service

```python
# backend/pyfactor/banking/services/wise_service.py

import requests
from django.conf import settings

class WiseService:
    BASE_URL = "https://api.wise.com"
    API_KEY = settings.WISE_API_KEY
    
    @classmethod
    def create_recipient(cls, user, bank_details):
        """Create a Wise recipient for the merchant"""
        headers = {
            "Authorization": f"Bearer {cls.API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Get user's Wise profile
        profile_id = cls.get_profile_id()
        
        # Create recipient
        payload = {
            "profile": profile_id,
            "accountHolderName": bank_details['account_holder_name'],
            "currency": bank_details['currency'],
            "type": bank_details['type'],
            "details": bank_details['details']
        }
        
        response = requests.post(
            f"{cls.BASE_URL}/v1/accounts",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            recipient = response.json()
            
            # Save to database
            from banking.models import WiseRecipient
            WiseRecipient.objects.create(
                user=user,
                wise_recipient_id=recipient['id'],
                account_holder_name=bank_details['account_holder_name'],
                currency=bank_details['currency'],
                bank_details=bank_details['details']
            )
            
            return recipient
        
        raise Exception(f"Failed to create Wise recipient: {response.text}")
    
    @classmethod
    def create_transfer(cls, settlement):
        """Create a transfer for a settlement"""
        # Implementation shown in next section
        pass
```

---

## 2. Webhook Handler - Process Stripe Payout Events

### Step 1: Stripe Webhook Endpoint

```python
# backend/pyfactor/payments/webhook_handlers.py

import stripe
import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from banking.models import PaymentSettlement
from banking.services.wise_service import WiseService

@csrf_exempt
def stripe_payout_webhook(request):
    """Handle Stripe payout events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        
        # Handle different event types
        if event.type == 'payout.paid':
            # Stripe has sent money to your bank
            payout = event.data.object
            handle_payout_paid(payout)
            
        elif event.type == 'payment_intent.succeeded':
            # Payment from customer succeeded
            payment_intent = event.data.object
            handle_payment_success(payment_intent)
            
        return JsonResponse({'status': 'success'})
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

def handle_payout_paid(payout):
    """Process when Stripe sends money to your bank"""
    # Find all settlements for this payout period
    settlements = PaymentSettlement.objects.filter(
        stripe_payout_status='pending',
        created_at__gte=payout['arrival_date'] - timedelta(days=3),
        created_at__lte=payout['arrival_date']
    )
    
    for settlement in settlements:
        # Mark as ready for Wise transfer
        settlement.stripe_payout_status = 'paid'
        settlement.stripe_payout_id = payout['id']
        settlement.save()
        
        # Trigger Wise transfer
        initiate_wise_transfer(settlement)

def initiate_wise_transfer(settlement):
    """Start the Wise transfer process"""
    try:
        # Get merchant's Wise recipient
        recipient = WiseRecipient.objects.get(user=settlement.user)
        
        # Create Wise transfer
        transfer = WiseService.create_transfer({
            'recipient_id': recipient.wise_recipient_id,
            'amount': settlement.settlement_amount,
            'currency': settlement.currency,
            'reference': f"Settlement {settlement.id}"
        })
        
        # Update settlement
        settlement.wise_transfer_id = transfer['id']
        settlement.wise_transfer_status = 'processing'
        settlement.save()
        
    except Exception as e:
        logger.error(f"Wise transfer failed: {str(e)}")
        settlement.wise_transfer_status = 'failed'
        settlement.save()
```

### Step 2: Register Webhook in Stripe Dashboard

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.dottapps.com/api/payments/webhooks/stripe/payouts/`
3. Select events:
   - `payout.paid`
   - `payout.failed`
   - `payment_intent.succeeded`

---

## 3. Settlement Dashboard - Show Merchants Their Pending Payouts

### Frontend Settlement Dashboard

```javascript
// frontend/pyfactor_next/src/app/dashboard/settlements/page.js

'use client';

import { useState, useEffect } from 'react';
import { CurrencyDollarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SettlementDashboard() {
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    total: 0
  });

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    const response = await fetch('/api/settlements');
    const data = await response.json();
    setSettlements(data.settlements);
    setStats(data.stats);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payment Settlements</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending"
          value={`$${stats.pending.toFixed(2)}`}
          icon={ClockIcon}
          color="yellow"
        />
        <StatCard
          title="Processing"
          value={`$${stats.processing.toFixed(2)}`}
          icon={CurrencyDollarIcon}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={`$${stats.completed.toFixed(2)}`}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Total This Month"
          value={`$${stats.total.toFixed(2)}`}
          icon={CurrencyDollarIcon}
          color="purple"
        />
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Transaction</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Fees</th>
              <th className="px-6 py-3 text-left">Net Amount</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Est. Arrival</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map(settlement => (
              <tr key={settlement.id} className="border-t">
                <td className="px-6 py-4">
                  {new Date(settlement.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {settlement.transaction_reference}
                </td>
                <td className="px-6 py-4">
                  ${settlement.original_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-red-600">
                  -${(settlement.stripe_fee + settlement.platform_fee).toFixed(2)}
                </td>
                <td className="px-6 py-4 font-semibold">
                  ${settlement.settlement_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={settlement.status} />
                </td>
                <td className="px-6 py-4">
                  {settlement.estimated_arrival_date || 'Processing...'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payout Schedule Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Payout Schedule</h3>
        <p className="text-blue-700">
          Settlements are processed daily. Funds typically arrive in your bank account within 3-5 business days.
        </p>
      </div>
    </div>
  );
}
```

### Backend Settlement API

```python
# backend/pyfactor/banking/views/settlement_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from banking.models import PaymentSettlement
from django.db.models import Sum, Q
from datetime import datetime, timedelta

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_settlements(request):
    """Get user's settlements with stats"""
    
    # Get settlements for the user
    settlements = PaymentSettlement.objects.filter(
        user=request.user
    ).order_by('-created_at')[:50]
    
    # Calculate stats
    today = datetime.now()
    month_start = today.replace(day=1)
    
    stats = {
        'pending': PaymentSettlement.objects.filter(
            user=request.user,
            status='pending'
        ).aggregate(Sum('settlement_amount'))['settlement_amount__sum'] or 0,
        
        'processing': PaymentSettlement.objects.filter(
            user=request.user,
            status__in=['paid', 'processing']
        ).aggregate(Sum('settlement_amount'))['settlement_amount__sum'] or 0,
        
        'completed': PaymentSettlement.objects.filter(
            user=request.user,
            status='settled',
            created_at__gte=month_start
        ).aggregate(Sum('settlement_amount'))['settlement_amount__sum'] or 0,
        
        'total': PaymentSettlement.objects.filter(
            user=request.user,
            created_at__gte=month_start
        ).aggregate(Sum('settlement_amount'))['settlement_amount__sum'] or 0
    }
    
    # Serialize settlements
    settlement_data = []
    for settlement in settlements:
        settlement_data.append({
            'id': str(settlement.id),
            'created_at': settlement.created_at,
            'transaction_reference': settlement.transaction_id,
            'original_amount': float(settlement.original_amount),
            'stripe_fee': float(settlement.stripe_fee),
            'platform_fee': float(settlement.platform_fee),
            'settlement_amount': float(settlement.settlement_amount),
            'status': settlement.status,
            'estimated_arrival_date': calculate_arrival_date(settlement)
        })
    
    return Response({
        'settlements': settlement_data,
        'stats': stats
    })

def calculate_arrival_date(settlement):
    """Calculate estimated arrival date based on status"""
    if settlement.status == 'settled':
        return settlement.settled_at.strftime('%Y-%m-%d') if settlement.settled_at else None
    elif settlement.status in ['paid', 'processing']:
        # Add 3-5 business days
        return (settlement.created_at + timedelta(days=5)).strftime('%Y-%m-%d')
    return None
```

---

## 4. Multi-Currency Support

### Currency Conversion Service

```python
# backend/pyfactor/banking/services/currency_service.py

import requests
from decimal import Decimal
from django.core.cache import cache

class CurrencyService:
    """Handle multi-currency conversions"""
    
    @classmethod
    def get_exchange_rate(cls, from_currency, to_currency):
        """Get current exchange rate with caching"""
        cache_key = f"exchange_rate_{from_currency}_{to_currency}"
        rate = cache.get(cache_key)
        
        if not rate:
            # Fetch from API (using exchangerate-api.com as example)
            response = requests.get(
                f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
            )
            data = response.json()
            rate = data['rates'].get(to_currency)
            
            # Cache for 1 hour
            cache.set(cache_key, rate, 3600)
        
        return Decimal(str(rate))
    
    @classmethod
    def convert_amount(cls, amount, from_currency, to_currency):
        """Convert amount between currencies"""
        if from_currency == to_currency:
            return amount
        
        rate = cls.get_exchange_rate(from_currency, to_currency)
        return amount * rate
    
    @classmethod
    def process_multi_currency_settlement(cls, settlement):
        """Handle settlement with currency conversion"""
        user_currency = settlement.user.preferred_currency or 'USD'
        
        if settlement.currency != user_currency:
            # Convert to user's preferred currency
            converted_amount = cls.convert_amount(
                settlement.settlement_amount,
                settlement.currency,
                user_currency
            )
            
            settlement.converted_amount = converted_amount
            settlement.converted_currency = user_currency
            settlement.exchange_rate = cls.get_exchange_rate(
                settlement.currency,
                user_currency
            )
            settlement.save()
        
        return settlement
```

### Multi-Currency POS Updates

```javascript
// frontend/pyfactor_next/src/components/pos/MultiCurrencySelector.js

import { useState, useEffect } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function MultiCurrencySelector({ onCurrencyChange }) {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    const response = await fetch('/api/currencies/available');
    const data = await response.json();
    setCurrencies(data.currencies);
  };

  const handleCurrencyChange = async (currency) => {
    setSelectedCurrency(currency);
    
    // Get exchange rate
    const response = await fetch(`/api/currencies/rate?from=USD&to=${currency}`);
    const data = await response.json();
    setExchangeRate(data.rate);
    
    onCurrencyChange({
      currency,
      rate: data.rate
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
      <select
        value={selectedCurrency}
        onChange={(e) => handleCurrencyChange(e.target.value)}
        className="border rounded px-3 py-1"
      >
        {currencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
      {exchangeRate !== 1 && (
        <span className="text-sm text-gray-500">
          Rate: {exchangeRate.toFixed(4)}
        </span>
      )}
    </div>
  );
}
```

---

## Implementation Timeline

### Phase 1: Basic Setup (Week 1)
- [ ] Install Wise SDK/API integration
- [ ] Create bank account connection UI
- [ ] Set up Stripe webhook endpoints
- [ ] Create settlement database models

### Phase 2: Core Features (Week 2)
- [ ] Implement Wise recipient creation
- [ ] Build settlement dashboard
- [ ] Add webhook processing
- [ ] Test payment flow end-to-end

### Phase 3: Advanced Features (Week 3)
- [ ] Add multi-currency support
- [ ] Implement exchange rate caching
- [ ] Create settlement reports
- [ ] Add email notifications

### Phase 4: Testing & Launch (Week 4)
- [ ] Test with sandbox accounts
- [ ] Handle edge cases
- [ ] Add monitoring and logging
- [ ] Deploy to production

---

## Environment Variables Needed

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_EXPRESS_ACCOUNT_ID=acct_...

# Wise
WISE_API_KEY=...
WISE_PROFILE_ID=...
WISE_WEBHOOK_SECRET=...

# Currency API
CURRENCY_API_KEY=...
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/

# Email (Resend)
RESEND_API_KEY=re_...

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
```

---

## Testing the Complete Flow

1. **Test Credit Card Payment**:
   ```bash
   # Use Stripe test card
   Card: 4242 4242 4242 4242
   Exp: Any future date
   CVC: Any 3 digits
   ```

2. **Trigger Test Webhook**:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

3. **Check Settlement Creation**:
   - Verify settlement record created
   - Check dashboard shows pending settlement

4. **Test Wise Transfer**:
   - Use Wise sandbox environment
   - Verify recipient creation
   - Test transfer initiation

5. **Monitor Complete Flow**:
   - Payment → Settlement → Payout → Transfer → Arrival

---

## Support & Documentation

- **Stripe Docs**: https://stripe.com/docs/payouts
- **Wise API**: https://api-docs.wise.com/
- **Resend Docs**: https://resend.com/docs
- **WhatsApp Business**: https://developers.facebook.com/docs/whatsapp

---

This implementation provides a complete, production-ready payment automation system that handles the entire flow from customer payment to merchant bank account.