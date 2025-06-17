# Session Management with Redis - Complete Documentation

## Overview

Our session management system uses a hybrid approach with Redis to solve cookie propagation timing issues that occur when users clear their browser cache and sign in. This ensures seamless authentication without failed redirects or errors.

## Architecture

### Components

1. **Bridge Tokens** - Temporary tokens for immediate session availability
2. **Redis Cache** - Distributed storage for bridge tokens and session data
3. **Session Cookies** - Encrypted httpOnly cookies for session persistence
4. **Fallback System** - In-memory storage when Redis is unavailable

### Flow Diagram

```
User Signs In
    ↓
Backend Creates Session
    ↓
Session Cookie Set (may have propagation delay)
    ↓
Bridge Token Created → Stored in Redis
    ↓
Redirect with ?bridge=token
    ↓
SessionInitializer Component
    ├── Retrieves from Redis
    ├── Polls for cookies
    └── Establishes session
    ↓
Dashboard Renders
```

## Implementation Details

### 1. Redis Configuration

#### Environment Variables
```bash
# Production (Render)
REDIS_URL=redis://red-abc123def456:6379

# Development (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password
```

#### Redis Client (`/src/lib/redis.js`)
```javascript
// Automatic connection with fallback
const redis = await getRedisWrapper();

// Operations
await redis.setex(key, ttl, value);  // Set with expiration
await redis.get(key);                // Get value
await redis.del(key);                // Delete key
await redis.incr(key);               // Increment counter
```

### 2. Bridge Token System

#### Token Creation (`/api/auth/bridge-session`)
- **Lifetime**: 60 seconds
- **Format**: 32 bytes (256-bit) random hex string
- **Storage**: Redis with automatic expiration
- **Usage**: Single-use only

#### Security Features
- Rate limiting: 10 creations per IP per 5 minutes
- Failed attempt tracking: Max 3 retrieval attempts
- IP-based blocking for suspicious activity

### 3. Session Flow

#### After Authentication
```javascript
// 1. Create backend session
const sessionResponse = await fetch('/api/auth/session', {
  method: 'POST',
  body: JSON.stringify({ user, accessToken })
});

// 2. Create bridge token
const bridgeResponse = await fetch('/api/auth/bridge-session', {
  method: 'POST',
  body: JSON.stringify({ sessionToken, userId, tenantId })
});

// 3. Redirect with token
router.push(`/dashboard?bridge=${bridgeToken}`);
```

#### Session Establishment
```javascript
// SessionInitializer handles:
1. Bridge token validation
2. Cookie propagation wait (exponential backoff)
3. Session verification
4. URL cleanup
```

## Redis Storage Schema

### Keys and TTLs

| Key Pattern | Description | TTL | Example |
|------------|-------------|-----|---------|
| `bridge:{token}` | Bridge token data | 60s | `bridge:a1b2c3...` |
| `rate_limit:create_{ip}` | Creation rate limit | 5m | `rate_limit:create_192.168.1.1` |
| `failed_attempts:{ip}_{token}` | Failed retrieval attempts | 5m | `failed_attempts:192.168.1.1_a1b2` |

### Data Structure

```json
{
  "sessionToken": "auth0_access_token",
  "userId": "auth0|123456",
  "tenantId": "tenant_uuid",
  "email": "user@example.com",
  "createdAt": 1234567890,
  "expiresAt": 1234567950
}
```

## Fallback Behavior

When Redis is unavailable, the system automatically falls back to in-memory storage:

### In-Memory Implementation
```javascript
// Automatic fallback
if (!redis.client) {
  // Use Map-based storage
  bridgeCache.set(token, data);
  
  // Manual expiration
  setTimeout(() => bridgeCache.delete(token), 60000);
}
```

### Limitations of In-Memory
- Not shared across server instances
- Lost on server restart
- No persistence
- Single-instance only

## Production Setup (Render)

### 1. Create Redis Instance
```bash
1. Render Dashboard → New → Redis
2. Name: dott-redis
3. Region: Same as services (Oregon)
4. Plan: Starter (256MB)
5. Maxmemory Policy: allkeys-lru
```

### 2. Configure Services
```bash
# Backend (dott-api)
REDIS_URL=redis://red-abc123def456:6379

# Frontend (dott-front)
REDIS_URL=redis://red-abc123def456:6379
```

### 3. Verify Connection
Check logs for:
- `[Redis] Redis client connected`
- `[BridgeSession] Cache type: redis`
- `[SessionService] Redis client connected`

## Development Setup

### Using Docker
```bash
docker run -d --name dott-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Using Homebrew (macOS)
```bash
brew install redis
brew services start redis
```

### Test Connection
```javascript
// test-redis.js
import { getRedisWrapper } from './src/lib/redis.js';

const redis = await getRedisWrapper();
console.log('Cache type:', redis.getCacheType());

await redis.setex('test:key', 10, 'Hello Redis');
const value = await redis.get('test:key');
console.log('Test value:', value);
```

## Monitoring and Debugging

### Key Metrics
- Bridge token creation rate
- Cache hit/miss ratio
- Average session establishment time
- Failed authentication attempts

### Debug Logs
```javascript
// Enable detailed logging
[SessionPropagation] Cookie propagation delay detected
[BridgeSession] Created bridge token for user: email@example.com
[SessionInitializer] Session established after 3 attempts
[Redis] Cache type: redis
```

### Common Issues

#### 1. Redis Connection Failed
```
[Redis] Failed to initialize Redis: ECONNREFUSED
```
**Solution**: Check Redis URL and network connectivity

#### 2. Bridge Token Expired
```
[BridgeSession] Bridge token not found or expired
```
**Solution**: Token expired after 60s, user needs to re-authenticate

#### 3. Cookie Not Propagating
```
[SessionCheck] NO SESSION COOKIE FOUND after wait
```
**Solution**: Check domain settings and cookie attributes

## Performance Optimization

### Redis Settings
```redis
# Recommended production settings
maxmemory 256mb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

### Connection Pooling
```javascript
CONNECTION_POOL_KWARGS: {
  max_connections: 50,
  retry_on_timeout: true
}
```

## Security Considerations

### 1. Token Security
- ✅ Cryptographically secure generation (256-bit)
- ✅ Short TTL (60 seconds)
- ✅ Single-use enforcement
- ✅ No sensitive data in tokens

### 2. Redis Security
- ✅ Internal network only (no external access)
- ✅ Optional password authentication
- ✅ SSL/TLS in production
- ✅ Access control lists (ACLs)

### 3. Cookie Security
```javascript
{
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  domain: '.dottapps.com',
  maxAge: 24 * 60 * 60
}
```

## Migration from In-Memory

### Before (In-Memory Only)
```javascript
const bridgeCache = new Map();
bridgeCache.set(token, data);
```

### After (Redis with Fallback)
```javascript
const redis = await getRedisWrapper();
await redis.setex(`bridge:${token}`, 60, JSON.stringify(data));
```

### Benefits
- ✅ Survives server restarts
- ✅ Works across multiple instances
- ✅ Better performance at scale
- ✅ Built-in expiration
- ✅ Atomic operations

## Testing

### Unit Tests
```javascript
describe('Bridge Token System', () => {
  it('should create and retrieve token', async () => {
    const token = await createBridgeToken(userData);
    const data = await getBridgeToken(token);
    expect(data.userId).toBe(userData.userId);
  });
  
  it('should expire after 60 seconds', async () => {
    const token = await createBridgeToken(userData);
    await new Promise(resolve => setTimeout(resolve, 61000));
    const data = await getBridgeToken(token);
    expect(data).toBeNull();
  });
});
```

### Integration Tests
1. Clear browser cache
2. Sign in with email/password
3. Verify bridge token in URL
4. Check session establishment
5. Confirm Redis storage

## Troubleshooting Guide

### Problem: Session not establishing
1. Check Redis connection
2. Verify cookie domain settings
3. Review browser console for errors
4. Check network tab for failed requests

### Problem: High latency
1. Ensure Redis in same region as services
2. Check Redis memory usage
3. Review connection pool settings
4. Monitor network latency

### Problem: Tokens expiring too quickly
1. Verify server time synchronization
2. Check Redis TTL settings
3. Review token creation timestamps
4. Monitor Redis eviction policy

## Best Practices

### 1. Always Use Internal URLs
```javascript
// ✅ Good - Internal URL
REDIS_URL=redis://red-abc123:6379

// ❌ Bad - External URL
REDIS_URL=rediss://external-redis.com:6380
```

### 2. Handle Failures Gracefully
```javascript
try {
  await redis.setex(key, ttl, value);
} catch (error) {
  // Fallback to in-memory
  fallbackCache.set(key, value);
}
```

### 3. Monitor Redis Health
```javascript
// Health check endpoint
app.get('/health/redis', async (req, res) => {
  const redis = await getRedisWrapper();
  res.json({
    status: redis.client ? 'connected' : 'fallback',
    type: redis.getCacheType()
  });
});
```

## Conclusion

The Redis-based session management system provides:
- **Reliability**: Handles cookie propagation delays
- **Performance**: Fast distributed caching
- **Scalability**: Works across multiple instances
- **Security**: Multiple layers of protection
- **Resilience**: Automatic fallback to in-memory

This solution ensures users never experience authentication failures due to timing issues, providing a seamless experience even after clearing browser cache.