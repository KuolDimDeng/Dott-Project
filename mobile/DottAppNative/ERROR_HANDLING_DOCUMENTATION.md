# 📚 Error Handling System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Migration Guide](#migration-guide)
5. [API Reference](#api-reference)
6. [Error Types & Handling](#error-types--handling)
7. [Development Tools](#development-tools)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [What's Next](#whats-next)

---

## Overview

This production-ready error handling system provides:
- ✅ Automatic error recovery
- ✅ User-friendly feedback
- ✅ Developer debugging tools
- ✅ Zero external dependencies
- ✅ Backward compatibility

### Key Features
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Retry Strategies**: Smart retry with exponential backoff
- **Correlation IDs**: Track requests end-to-end
- **Cache Fallbacks**: Show stale data when offline
- **Error Tracking**: Local error storage and pattern detection

---

## Quick Start

### 1. Basic Setup (5 minutes)

Add to your `App.js`:

```javascript
import { ErrorHandlingProvider } from './src/setup/ErrorHandlingSetup';
import Toast from 'react-native-toast-message';

function App() {
  return (
    <ErrorHandlingProvider>
      <NavigationContainer>
        {/* Your app */}
      </NavigationContainer>
    </ErrorHandlingProvider>
  );
}
```

### 2. Install Required Dependencies

```bash
npm install react-native-toast-message react-native-sqlite-storage @react-native-community/netinfo react-native-device-info
# OR
yarn add react-native-toast-message react-native-sqlite-storage @react-native-community/netinfo react-native-device-info

# iOS only
cd ios && pod install
```

### 3. Use Enhanced API

```javascript
// Instead of this:
import api from './services/api';
const user = await api.get('/users/me/');

// Use this:
import enhancedAPI from './services/api/enhancedApi';
const user = await enhancedAPI.get('/users/me/', {
  fallbackData: null,    // Return null on 404
  retryOnFailure: true,  // Auto-retry on network errors
  showErrorToast: true   // Show user feedback
});
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                 App Component                │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │         Enhanced API Client          │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │   Correlation Manager        │    │    │
│  │  ├─────────────────────────────┤    │    │
│  │  │   Circuit Breaker           │    │    │
│  │  ├─────────────────────────────┤    │    │
│  │  │   Retry Strategy            │    │    │
│  │  ├─────────────────────────────┤    │    │
│  │  │   Cache Manager             │    │    │
│  │  ├─────────────────────────────┤    │    │
│  │  │   Error Tracker             │    │    │
│  │  └─────────────────────────────┘    │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │      User Feedback (Toasts)         │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Purpose | When It Activates |
|-----------|---------|-------------------|
| **Circuit Breaker** | Prevents hammering failed services | After 5 consecutive failures |
| **Retry Strategy** | Automatically retries failed requests | Network errors, 500s, timeouts |
| **Cache Manager** | Provides offline support | When network unavailable |
| **Error Tracker** | Records and analyzes errors | Every error occurrence |
| **Correlation Manager** | Links related requests | Every API call |
| **Logger** | Development debugging | Only in `__DEV__` mode |

---

## Migration Guide

### Step-by-Step Migration

#### Phase 1: Non-Breaking Setup (Day 1)
```javascript
// 1. Add ErrorHandlingProvider to App.js
// 2. Keep using existing api.js - nothing breaks
```

#### Phase 2: Critical Paths (Week 1)
```javascript
// Migrate authentication first
import enhancedAPI from './services/api/enhancedApi';

// Old code still works
const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// New code with error handling
const loginEnhanced = async (email, password) => {
  const response = await enhancedAPI.post('/auth/login',
    { email, password },
    {
      showErrorToast: true,
      retryOnFailure: false, // Don't retry auth
    }
  );

  if (response.data) {
    return response.data;
  }

  // Automatically handles 401, 422, network errors
  return null;
};
```

#### Phase 3: Read Operations (Week 2)
```javascript
// Migrate GET endpoints with caching
const getProducts = async () => {
  return await enhancedAPI.get('/products', {
    cacheKey: 'products:list',
    cacheTTL: 300000, // 5 minutes
    fallbackData: [],  // Return empty array on error
    showErrorToast: false // Silent background fetch
  });
};
```

#### Phase 4: Write Operations (Week 3)
```javascript
// Migrate POST/PUT/DELETE with validation
const updateProfile = async (data) => {
  try {
    return await enhancedAPI.put('/users/profile', data, {
      showErrorToast: true,
      retryOnFailure: true
    });
  } catch (error) {
    // Validation errors are shown as toast
    // Re-throw for form to handle
    if (error.response?.status === 422) {
      return { errors: error.response.data.errors };
    }
    throw error;
  }
};
```

---

## API Reference

### Enhanced API Methods

#### `enhancedAPI.get(url, options)`
```javascript
const response = await enhancedAPI.get('/endpoint', {
  // Caching
  cacheKey: 'unique:key',     // Cache identifier
  cacheTTL: 300000,           // Cache duration (ms)
  skipCache: false,           // Force fresh fetch

  // Error Handling
  fallbackData: null,         // Data to return on error
  showErrorToast: true,       // Show user feedback
  retryOnFailure: true,       // Auto-retry on failure

  // Advanced
  queueIfOffline: true,       // Queue for later if offline
});
```

#### `enhancedAPI.post(url, data, options)`
```javascript
const response = await enhancedAPI.post('/endpoint', data, {
  showErrorToast: true,
  retryOnFailure: false,      // Usually don't retry POSTs
  timeout: 30000,             // Custom timeout
});
```

### Error Response Format

All errors follow this structure:
```javascript
{
  data: null,           // Actual data (if any)
  notFound: true,       // For 404 errors
  offline: true,        // For network errors
  serverError: true,    // For 500+ errors
  stale: true,          // If using cached data
  circuitOpen: true,    // If circuit breaker triggered
}
```

---

## Error Types & Handling

### Error Classification

| HTTP Status | Error Type | Default Behavior | User Sees |
|------------|------------|------------------|-----------|
| **404** | NOT_FOUND | Return `null` or fallback | "Item not found" toast |
| **401** | UNAUTHORIZED | Try token refresh → logout | "Please sign in" toast |
| **403** | FORBIDDEN | Throw error | "Access denied" toast |
| **422** | VALIDATION | Show field errors | Specific error message |
| **429** | RATE_LIMITED | Retry with backoff | "Too many requests" toast |
| **500+** | SERVER_ERROR | Retry 2x → use cache | "Server error" toast |
| **Network** | NETWORK_ERROR | Retry 3x → use cache | "Check connection" toast |

### Customizing Error Behavior

```javascript
// Disable specific toasts
enhancedAPI.setErrorHandling({
  show404Toast: false,      // Silent 404s
  show401Toast: true,       // Always show auth errors
  showNetworkToast: true,   // Show offline status
  autoRetry: false          // Disable auto-retry
});

// Custom error handling for specific endpoint
const response = await enhancedAPI.get('/special-endpoint', {
  showErrorToast: false,
  fallbackData: { custom: 'default' },
  retryOnFailure: false
});
```

---

## Development Tools

### Debug Commands

```javascript
// In your debug menu or console:

// Show API statistics
import apiClient from './services/api/apiClient';
apiClient.showStatistics();

// Show error patterns
import ErrorTracker from './services/errorTracking/errorTracker';
ErrorTracker.showSummary();

// Show active requests
import CorrelationManager from './services/correlation/correlationManager';
CorrelationManager.showActiveRequests();

// Show circuit breakers
import CircuitBreakerManager from './services/resilience/circuitBreaker';
CircuitBreakerManager.showStatus();

// Show cache statistics
import CacheManager from './services/cache/cacheManager';
CacheManager.showStatistics();
```

### Debug Output Examples

```
📊 Error Tracking Summary
├─ Total Errors: 23
├─ Unique Patterns: 3
└─ Detected Patterns:
   ├─ NETWORK_ERROR:/api/users/me: 5 times
   └─ NOT_FOUND:/api/products/123: 3 times

⚡ Circuit Breakers Status
├─ GET:/api/marketplace: CLOSED ✅
├─ POST:/api/payments: OPEN ❌ (retry in 45s)
└─ GET:/api/notifications: HALF_OPEN ⚠️

💾 Cache Statistics
├─ Hit Rate: 67.5%
├─ Memory Cache: 42 items
└─ Storage Cache: 128 items
```

---

## Best Practices

### ✅ DO's

1. **Always provide fallback data for GET requests**
```javascript
await enhancedAPI.get('/data', {
  fallbackData: []  // Empty array better than null
});
```

2. **Cache frequently accessed data**
```javascript
await enhancedAPI.get('/user/settings', {
  cacheKey: 'user:settings',
  cacheTTL: 600000  // 10 minutes
});
```

3. **Disable retry for non-idempotent operations**
```javascript
await enhancedAPI.post('/payments/charge', data, {
  retryOnFailure: false  // Never retry payments
});
```

4. **Use correlation IDs for debugging**
```javascript
// Correlation IDs are added automatically
// Find them in logs: "correlation: abc123-def456"
```

### ❌ DON'Ts

1. **Don't catch errors unless handling specifically**
```javascript
// Bad - swallows errors
try {
  await enhancedAPI.get('/data');
} catch (error) {
  // Error disappears
}

// Good - handles specific case
try {
  await enhancedAPI.get('/data');
} catch (error) {
  if (error.response?.status === 422) {
    // Handle validation
  }
  throw error; // Re-throw others
}
```

2. **Don't retry sensitive operations**
```javascript
// Bad
await enhancedAPI.post('/users/delete', {}, {
  retryOnFailure: true  // Could delete multiple times!
});
```

3. **Don't ignore offline state**
```javascript
// Always check for offline
const response = await enhancedAPI.get('/data');
if (response.offline) {
  // Show appropriate UI
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Circuit breaker is OPEN"
**Cause**: Service failed 5+ times
**Solution**: Wait 60 seconds or manually reset
```javascript
CircuitBreakerManager.reset('GET:/api/endpoint');
```

#### 2. Stale cache data
**Cause**: Cache TTL too long
**Solution**: Reduce cache time or force refresh
```javascript
await enhancedAPI.get('/data', {
  skipCache: true  // Force fresh fetch
});
```

#### 3. Too many retries
**Cause**: Aggressive retry strategy
**Solution**: Customize retry for endpoint
```javascript
await enhancedAPI.get('/flaky-endpoint', {
  retryOnFailure: false  // Disable retry
});
```

#### 4. Console logs in production
**Cause**: Not using Logger class
**Solution**: Replace `console.log` with `Logger`
```javascript
// Bad
console.log('Debug info');

// Good
Logger.debug('category', 'Debug info');
```

---

## What's Next

### 🎯 Immediate Next Steps (This Week)

1. **Test Error Scenarios**
```javascript
// Add to your test suite
it('handles 404 gracefully', async () => {
  const result = await enhancedAPI.get('/non-existent', {
    fallbackData: null
  });
  expect(result.data).toBeNull();
  expect(result.notFound).toBeTruthy();
});
```

2. **Add Error Boundaries to Key Screens**
```javascript
import { ErrorBoundary } from './src/setup/ErrorHandlingSetup';

<ErrorBoundary>
  <MarketplaceScreen />
</ErrorBoundary>
```

3. **Monitor Error Patterns**
   - Check ErrorTracker daily
   - Look for repeated failures
   - Adjust circuit breaker thresholds

### 📈 Short Term Improvements (Next 2 Weeks)

1. **Implement Offline Queue**
```javascript
// Queue failed mutations when offline
class OfflineQueue {
  async add(request) {
    // Store in AsyncStorage
    // Retry when online
  }
}
```

2. **Add Performance Monitoring**
```javascript
// Track API response times
class PerformanceMonitor {
  trackAPICall(endpoint, duration) {
    // Store metrics
    // Alert if slow
  }
}
```

3. **Create Error Dashboard Screen**
```javascript
// Admin-only screen showing:
- Error statistics
- Circuit breaker status
- Cache hit rates
- Performance metrics
```

### 🚀 Long Term Enhancements (Next Month)

1. **Backend Integration**
   - Add correlation ID support in Django
   - Standardize error responses
   - Implement rate limiting

2. **Advanced Caching**
   - Implement cache warming
   - Add cache invalidation strategies
   - Background refresh for stale data

3. **Analytics Integration**
   - Send error metrics to analytics
   - Track recovery success rates
   - Monitor user impact

4. **Testing Suite**
   - Unit tests for error handlers
   - Integration tests for retry logic
   - E2E tests for error scenarios

### 📊 Metrics to Track

Start tracking these KPIs:

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| **Error Recovery Rate** | Unknown | >80% | `ErrorTracker.getStatistics()` |
| **Cache Hit Rate** | Unknown | >60% | `CacheManager.getStatistics()` |
| **API Success Rate** | Unknown | >95% | `apiClient.showStatistics()` |
| **User-Visible Errors** | Many | <2% | Track toast shows |
| **Avg Response Time** | Unknown | <2s | Correlation Manager |

### 🔧 Configuration Tuning

Based on your app's behavior, tune these settings:

```javascript
// In circuitBreaker.js
failureThreshold: 5,    // Adjust based on service reliability
timeout: 60000,         // Reduce for critical services

// In retryStrategies.js
maxRetries: 3,          // Increase for critical operations
baseDelay: 1000,        // Reduce for better UX

// In cacheManager.js
defaultTTL: 300000,     // Adjust based on data freshness needs
maxMemoryCacheSize: 100 // Increase if you have memory
```

### 🏗️ Backend Changes Needed

Create these Django changes for full integration:

1. **Correlation ID Middleware**
```python
class CorrelationIDMiddleware:
    def process_request(self, request):
        request.correlation_id = request.META.get(
            'HTTP_X_CORRELATION_ID',
            generate_uuid()
        )
```

2. **Standardized Error Responses**
```python
def error_response(status, code, message):
    return JsonResponse({
        'error': {
            'status': status,
            'code': code,
            'message': message,
            'timestamp': timezone.now()
        }
    }, status=status)
```

3. **Rate Limiting**
```python
from django_ratelimit.decorators import ratelimit

@ratelimit(key='user', rate='100/h')
def api_view(request):
    pass
```

---

## Support & Maintenance

### Weekly Checklist
- [ ] Review error patterns in ErrorTracker
- [ ] Check circuit breaker triggers
- [ ] Analyze cache hit rates
- [ ] Clear old error logs
- [ ] Update retry strategies based on failures

### Monthly Tasks
- [ ] Analyze error trends
- [ ] Optimize cache TTLs
- [ ] Review and adjust circuit breaker thresholds
- [ ] Update documentation with new patterns
- [ ] Share error insights with team

### Debug Commands Reference
```bash
# In React Native Debugger console:

# Clear all errors
ErrorTracker.clearErrors()

# Reset circuit breakers
CircuitBreakerManager.resetAll()

# Clear cache
CacheManager.clear()

# Show everything
apiClient.showStatistics()
```

---

## Conclusion

You now have enterprise-grade error handling that:
- ✅ Prevents user frustration
- ✅ Reduces support tickets
- ✅ Improves app reliability
- ✅ Helps debugging in development
- ✅ Works offline

The system is designed to grow with your app. Start with basic integration, then gradually enable more features as you gain confidence.

**Remember**: Good error handling is invisible to users - they just experience a app that "always works"!