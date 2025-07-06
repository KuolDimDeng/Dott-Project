# Grace Period System Implementation

## Overview
The grace period system provides a customer-friendly approach to handling subscription payment failures. Instead of immediately suspending accounts, users are given a grace period to resolve payment issues while maintaining access to their subscription features.

## Architecture

### Database Schema
The grace period system extends the existing `Subscription` model with new fields:

```python
class Subscription(models.Model):
    # Existing fields...
    
    # Grace period fields
    status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='active'
    )
    grace_period_ends = models.DateTimeField(null=True, blank=True)
    failed_payment_count = models.IntegerField(default=0)
    last_payment_attempt = models.DateTimeField(null=True, blank=True)
```

### Status Flow
```
Payment Succeeds ─┐
                  ├─► ACTIVE ──Payment Fails──► GRACE_PERIOD ──Expires──► SUSPENDED
Payment Succeeds ─┘                                    │
                                                       └──Payment Succeeds──► ACTIVE
```

## Implementation Details

### 1. Subscription Status Management

#### Status Types:
- **`active`**: Subscription is current and active
- **`past_due`**: Payment failed, entering grace period  
- **`grace_period`**: In grace period, user retains access
- **`suspended`**: Grace period expired, limited access
- **`canceled`**: User cancelled subscription

#### Helper Methods:
```python
subscription.start_grace_period(days=7)    # Start grace period
subscription.suspend_subscription()        # Suspend after grace expires
subscription.reactivate_subscription()     # Reactivate on payment success
```

#### Properties:
```python
subscription.is_in_grace_period           # Boolean: currently in grace period
subscription.grace_period_expired         # Boolean: grace period has expired
subscription.should_have_access           # Boolean: should have paid features
```

### 2. Stripe Webhook Integration

#### Payment Failed Webhook (`invoice.payment_failed`):
```python
# Automatic grace period initiation
if subscription.failed_payment_count >= 2:
    grace_period_days = 3  # Shorter for repeated failures
else:
    grace_period_days = 7  # Standard grace period

subscription.start_grace_period(days=grace_period_days)
```

#### Payment Succeeded Webhook (`invoice.payment_succeeded`):
```python
# Automatic reactivation
subscription.reactivate_subscription()
```

### 3. Management Commands

#### Process Grace Periods
```bash
# Check what would be processed (dry run)
python manage.py process_grace_periods --dry-run

# Process expired grace periods
python manage.py process_grace_periods
```

**Recommended**: Set up as daily cron job:
```bash
# Add to crontab
0 9 * * * cd /path/to/backend && python manage.py process_grace_periods
```

### 4. API Endpoints

#### Grace Period Status
```http
GET /api/users/api/subscription/grace-status/
```

Response:
```json
{
  "plan": "professional",
  "status": "grace_period",
  "has_access": true,
  "in_grace_period": true,
  "grace_period_ends": "2025-07-13T10:30:00Z",
  "failed_payment_count": 1,
  "grace_period_message": {
    "type": "warning",
    "title": "Payment Required",
    "message": "Your payment failed. Please update your payment method within 5 days to avoid suspension.",
    "days_remaining": 5,
    "action_required": true
  }
}
```

#### Retry Payment
```http
POST /api/users/api/subscription/retry-payment/
```

### 5. Utility Functions

#### Get Subscription Status
```python
from users.utils import get_user_subscription_status

status = get_user_subscription_status(user)
# Returns comprehensive subscription data including grace period info
```

#### Check Feature Access
```python
from users.utils import check_subscription_access

has_access = check_subscription_access(user, feature='advanced_reports')
# Returns True if user should have access to paid features
```

## Configuration

### Grace Period Duration
- **First failure**: 7 days
- **Subsequent failures**: 3 days
- **Configurable** in webhook handler

### Industry Standards
- **7-15 days**: Industry standard grace period
- **Progressive reduction**: Shorter periods for repeat failures
- **Customer communication**: Email notifications recommended

## Integration Guide

### Frontend Integration
```javascript
// Check subscription status
const response = await fetch('/api/users/api/subscription/grace-status/');
const status = await response.json();

if (status.in_grace_period) {
    showGracePeriodWarning(status.grace_period_message);
}
```

### Middleware Integration
```python
from users.utils import check_subscription_access

def subscription_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not check_subscription_access(request.user):
            return redirect('/billing/suspended')
        return view_func(request, *args, **kwargs)
    return wrapper
```

## Monitoring & Alerts

### Logging
The system logs all grace period events:
- Grace period start/end
- Payment retry attempts
- Subscription suspensions
- Reactivations

### Metrics to Track
- Grace period conversion rate (users who pay vs. churn)
- Average time to payment resolution
- Suspension rates by plan type
- Payment failure patterns

## Error Handling

### Webhook Failures
- Returns 200 status to prevent Stripe retries
- Comprehensive error logging
- Graceful fallbacks to prevent service disruption

### Database Failures
- Atomic transactions for status updates
- Retry logic with exponential backoff
- Safe defaults to free plan on errors

## Security Considerations

### Data Protection
- Grace period data is tenant-isolated
- No sensitive payment data stored
- Stripe handles all payment processing

### Access Control
- Grace period users retain paid features temporarily
- Suspended users get read-only access
- Proper authentication required for all endpoints

## Testing

### Unit Tests
```python
def test_grace_period_flow():
    subscription = create_test_subscription()
    subscription.start_grace_period(days=7)
    
    assert subscription.status == 'grace_period'
    assert subscription.is_in_grace_period
    assert subscription.should_have_access
```

### Integration Tests
- Stripe webhook simulation
- End-to-end payment failure scenarios
- Grace period expiration handling

## Deployment Checklist

- [ ] Database migration applied
- [ ] Stripe webhooks configured
- [ ] Cron job scheduled
- [ ] Monitoring dashboards updated
- [ ] Customer communication templates ready
- [ ] Support team trained on new flow

## Troubleshooting

### Common Issues
1. **Grace period not starting**: Check Stripe webhook delivery
2. **User still suspended**: Verify webhook processing logs
3. **Incorrect grace period length**: Check failed_payment_count logic

### Debug Commands
```bash
# Check subscription status
python manage.py shell
>>> from users.utils import get_user_subscription_status
>>> get_user_subscription_status(user)

# Manual grace period processing
python manage.py process_grace_periods --dry-run
```

## Future Enhancements

### Phase 2 Features
- Email notification system
- Progressive feature restrictions
- Payment dunning sequences
- Customer self-service billing portal

### Advanced Features
- Plan-specific grace periods
- Usage-based billing support
- Advanced analytics dashboard
- Automated customer communication