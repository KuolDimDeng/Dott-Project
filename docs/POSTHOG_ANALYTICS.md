# PostHog Analytics Implementation Guide

## Overview

This document describes the PostHog analytics implementation for the Dott application, including both frontend (Next.js) and backend (Django) tracking.

## Frontend Implementation (Next.js)

### Installation

```bash
pnpm add posthog-js
```

### Configuration

#### Environment Variables
Add the following to your `.env` file:

```env
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### PostHog Initialization
Location: `/src/lib/posthog.js`

The PostHog client is initialized with:
- Automatic page view capture disabled (we handle it manually)
- Page leave tracking enabled
- Local storage persistence
- Autocapture for specific elements (buttons, inputs, etc.)

#### Provider Setup
Location: `/src/components/providers/PostHogProvider.js`

The PostHog provider:
- Wraps the entire application
- Handles user identification when authenticated
- Tracks page views automatically
- Provides PostHog context to child components

### Frontend Events Tracked

#### Authentication & Onboarding
- `signup_page_viewed` - When user visits signup page
- `signup_attempted` - When user submits signup form
- `onboarding_page_viewed` - When user enters onboarding
- `onboarding_flow_initialized` - When onboarding starts
- `onboarding_business_info_submitted` - Business info step completed
- `onboarding_subscription_selected` - Plan selected
- `onboarding_completed` - Full onboarding completed

#### Dashboard Navigation
- `$pageview` - Automatic page tracking with custom properties
- `dashboard_feature_accessed` - When user accesses a feature

#### Product Management
- `product_creation_attempted` - When user tries to create product
- `product_created` - Successful product creation
- `product_updated` - Product edited
- `product_deleted` - Product removed

### Usage in Components

```javascript
import { captureEvent } from '@/lib/posthog';

// Track an event
captureEvent('event_name', {
  property1: 'value1',
  property2: 'value2'
});
```

## Backend Implementation (Django)

### Installation

```bash
pip install posthog==6.0.0
```

Add to `requirements.txt`:
```
posthog==6.0.0
```

### Configuration

#### Settings
Location: `/backend/pyfactor/pyfactor/settings.py`

```python
POSTHOG_API_KEY = os.getenv('POSTHOG_API_KEY', '')
POSTHOG_HOST = os.getenv('POSTHOG_HOST', 'https://app.posthog.com')
```

#### Analytics Module
Location: `/backend/pyfactor/pyfactor/analytics.py`

Provides helper functions:
- `init_posthog()` - Initialize PostHog client
- `track_event()` - Track custom events
- `identify_user()` - Identify users
- `track_api_call()` - Track API metrics
- `track_business_metric()` - Track business KPIs

#### Middleware
Location: `/backend/pyfactor/pyfactor/middleware/analytics_middleware.py`

Automatically tracks:
- API endpoint usage
- Request methods
- Response status codes
- Request duration

### Backend Events Tracked

#### Authentication
- `user_logged_in` - User login with method and subscription info

#### Product Management (Backend)
- `product_created_backend` - Product created via API
- `product_updated_backend` - Product updated via API
- `product_deleted_backend` - Product deleted via API

#### Business Metrics
- `inventory_value_added` - When products are added
- `inventory_value_change` - When product prices/stock change
- `inventory_value_removed` - When products are deleted

#### API Metrics
- `api_call` - All API calls with endpoint, method, status, duration

### Usage in Views

```python
from pyfactor.analytics import track_event, track_business_metric

# Track an event
track_event(
    user_id=str(request.user.id),
    event_name='custom_event',
    properties={'key': 'value'}
)

# Track a business metric
track_business_metric(
    user_id=str(request.user.id),
    metric_name='revenue',
    value=100.00,
    metadata={'order_id': '123'}
)
```

## User Properties

Both frontend and backend identify users with:
- `email` - User email
- `name` - User full name
- `tenant_id` - Associated tenant
- `role` - User role (OWNER, ADMIN, USER)
- `created_at` - Account creation date
- `subscription_plan` - Current plan

## Best Practices

1. **Event Naming Convention**
   - Use snake_case for event names
   - Be descriptive but concise
   - Use past tense for completed actions (e.g., `product_created`)
   - Use present tense for attempts (e.g., `product_creation_attempted`)

2. **Property Guidelines**
   - Include relevant context in properties
   - Use boolean flags for binary states
   - Include IDs for entity tracking
   - Avoid sensitive information (passwords, tokens, etc.)

3. **Performance Considerations**
   - Events are sent asynchronously
   - Batch similar events when possible
   - Use sampling for high-frequency events

4. **Privacy & Security**
   - Never track sensitive user data
   - Respect user privacy settings
   - Follow GDPR/CCPA guidelines
   - Use PostHog's built-in privacy features

## Testing

### Frontend Testing
```javascript
// Check if PostHog is initialized
if (window.posthog) {
  console.log('PostHog initialized');
  window.posthog.debug(); // Enable debug mode
}
```

### Backend Testing
```python
# Check PostHog configuration
from django.conf import settings
print(f"PostHog configured: {bool(settings.POSTHOG_API_KEY)}")

# Test event tracking
from pyfactor.analytics import track_event
track_event('test_user', 'test_event', {'test': True})
```

## Monitoring & Debugging

1. **PostHog Dashboard**
   - View real-time events
   - Check user identification
   - Monitor API performance
   - Analyze user flows

2. **Debug Mode**
   - Frontend: `posthog.debug()`
   - Backend: Check Django logs

3. **Common Issues**
   - Missing API key: Check environment variables
   - Events not appearing: Verify network connectivity
   - User not identified: Check authentication flow
   - Duplicate events: Review tracking logic

## Future Enhancements

1. **Additional Events**
   - Invoice creation/payment tracking
   - Customer interaction tracking
   - Inventory movement tracking
   - Financial reporting usage

2. **Advanced Features**
   - Feature flags integration
   - A/B testing setup
   - Session recordings
   - Heatmap analysis

3. **Custom Dashboards**
   - Business metrics dashboard
   - User behavior insights
   - API performance monitoring
   - Conversion funnel analysis