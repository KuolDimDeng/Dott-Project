# Session Load Testing & Performance Optimization Guide

## Overview

This guide covers the comprehensive load testing and performance optimization system implemented for the new server-side session management. The system includes Redis caching, performance monitoring, and automated load testing to ensure scalability.

## Architecture Components

### 1. Enhanced Session Manager (`sessionManager-v2-enhanced.js`)
- **Multi-tier caching**: Local cache → Redis → Database
- **Circuit breaker pattern**: Automatic fallback when services fail
- **Performance monitoring**: Real-time metrics collection
- **Request deduplication**: Prevents duplicate session requests
- **Cache warming**: Preloads frequently accessed sessions

### 2. Redis Caching Layer (`/api/cache/session`)
- **Memory fallback**: Works without Redis for development
- **TTL management**: Configurable session expiry times
- **Connection pooling**: Optimized Redis connections
- **Error resilience**: Graceful degradation when Redis unavailable

### 3. Performance Monitoring (`/api/metrics/session`)
- **Real-time metrics**: Response times, error rates, cache efficiency
- **Health scoring**: Automated performance assessment
- **Prometheus compatibility**: Industry-standard metrics format
- **Historical data**: Trend analysis and capacity planning

### 4. Load Testing Framework (`scripts/load-test-sessions.js`)
- **Multiple scenarios**: Authentication, session management, mixed workloads
- **Configurable profiles**: Smoke, load, stress, spike, endurance tests
- **Performance assessment**: Automated grading with recommendations
- **Detailed reporting**: Comprehensive analysis and insights

## Quick Start

### 1. Environment Setup

```bash
# Install dependencies
npm install ioredis node-fetch

# Set environment variables
export REDIS_URL="redis://localhost:6379"
export NEXT_PUBLIC_API_URL="https://api.dottapps.com"

# Start Redis (if running locally)
redis-server
```

### 2. Run Load Tests

```bash
# Smoke test (quick validation)
node scripts/load-test-sessions.js --users=5 --duration=30 --target=local --scenarios=auth

# Load test (normal capacity)
node scripts/load-test-sessions.js --users=50 --duration=300 --target=staging --scenarios=mixed

# Stress test (peak capacity)
node scripts/load-test-sessions.js --users=200 --duration=600 --target=staging --scenarios=stress

# Production monitoring
node scripts/load-test-sessions.js --users=100 --duration=3600 --target=prod --scenarios=mixed
```

### 3. Monitor Performance

```bash
# View session dashboard
open https://dottapps.com/api/admin/session-dashboard

# Get metrics via API
curl https://dottapps.com/api/metrics/session?detailed=true

# Check cache status
curl https://dottapps.com/api/cache/session
```

## Load Testing Scenarios

### Authentication Flow Test
```javascript
// Basic login/logout cycle
const authScenario = {
  actions: ['login', 'session_check', 'logout'],
  weight: 1.0,
  expected_response_time: 300 // ms
};
```

### Session Management Stress Test
```javascript
// Heavy session validation and refresh
const sessionStressScenario = {
  actions: [
    'login',
    'session_check',
    'session_refresh', 
    'api_call',
    'cache_test',
    'logout'
  ],
  weight: 2.0,
  expected_response_time: 500 // ms
};
```

### Cache Performance Test
```javascript
// Test Redis cache efficiency
const cacheScenario = {
  actions: ['login', 'cache_burst_test', 'logout'],
  expected_cache_hit_rate: 0.8, // 80%
  expected_redis_latency: 10 // ms
};
```

## Performance Thresholds

### Response Times
- **Average**: < 500ms
- **95th percentile**: < 1000ms  
- **99th percentile**: < 2000ms

### Success Rates
- **Overall**: > 99.0%
- **Session creation**: > 99.5%
- **Cache operations**: > 99.9%

### Cache Performance
- **Hit rate**: > 80%
- **Redis latency**: < 10ms
- **Memory usage**: < 2GB

### Resource Usage
- **CPU**: < 80%
- **Memory**: < 2GB
- **Network**: < 100Mbps

## Redis Configuration

### Production Settings
```yaml
# Redis configuration for production
maxmemory: 2gb
maxmemory-policy: allkeys-lru
save: 900 1 300 10 60 10000
timeout: 300
tcp-keepalive: 60
```

### Session Cache Settings
```javascript
const redisConfig = {
  session_ttl: 1800, // 30 minutes
  max_connections: 100,
  connection_timeout: 5000,
  command_timeout: 1000,
  retry_attempts: 3
};
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Session Performance**
   - Active sessions count
   - Session creation rate
   - Session validation latency
   - Session expiry rate

2. **Cache Efficiency**
   - Cache hit ratio
   - Redis response time
   - Memory usage
   - Eviction rate

3. **Error Rates**
   - 4xx errors (< 1%)
   - 5xx errors (< 0.5%)
   - Timeout errors (< 0.1%)

4. **System Health**
   - CPU utilization
   - Memory consumption
   - Network throughput
   - Database connections

### Alert Thresholds

```yaml
alerts:
  critical:
    - response_time > 2000ms for 2 minutes
    - error_rate > 5% for 1 minute
    - cache_hit_rate < 50% for 5 minutes
    
  warning:
    - response_time > 1000ms for 5 minutes
    - error_rate > 1% for 2 minutes
    - cache_hit_rate < 70% for 10 minutes
```

## Performance Optimization Tips

### 1. Cache Strategy
```javascript
// Optimize cache keys for better distribution
const cacheKey = `session:${tenantId}:${sessionId}`;

// Use appropriate TTL based on user activity
const ttl = userActivity === 'high' ? 3600 : 1800;

// Implement cache warming for popular sessions
await sessionManager.warmCache(popularSessionIds);
```

### 2. Database Optimization
```sql
-- Create indexes for session queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Partition sessions table by date
CREATE TABLE sessions_2025_01 PARTITION OF sessions
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3. Connection Pooling
```javascript
// Configure database connection pool
const poolConfig = {
  min: 10,
  max: 50,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 600000
};

// Configure Redis connection pool
const redisPoolConfig = {
  maxTotal: 100,
  maxIdle: 50,
  minIdle: 10,
  testOnBorrow: true
};
```

## Load Testing Best Practices

### 1. Test Environment Preparation
- Use production-like data volumes
- Configure realistic network latency
- Set up monitoring before testing
- Prepare rollback procedures

### 2. Test Execution
- Start with smoke tests
- Gradually increase load
- Monitor key metrics continuously
- Document any issues immediately

### 3. Results Analysis
- Compare against baseline metrics
- Identify performance bottlenecks
- Calculate capacity limits
- Plan optimization strategies

## Troubleshooting Guide

### Common Issues

**High Response Times**
```bash
# Check database slow queries
curl /api/metrics/session | grep slow_queries

# Monitor cache hit rates
curl /api/cache/session | grep hit_rate

# Analyze query patterns
grep "slow query" logs/application.log
```

**Cache Misses**
```bash
# Check Redis connection
redis-cli ping

# Monitor cache size
redis-cli info memory

# Verify TTL settings
redis-cli ttl session:example_key
```

**Memory Leaks**
```bash
# Monitor Node.js memory usage
curl /api/metrics/session | grep memory

# Check for connection leaks
lsof -p $(pgrep node) | grep TCP

# Analyze heap dumps
node --inspect app.js
```

## Capacity Planning

### Scaling Guidelines

**Horizontal Scaling**
- Add Redis replicas for read scaling
- Use multiple backend instances
- Implement session affinity if needed

**Vertical Scaling**
- Increase Redis memory for more cache
- Add CPU cores for better throughput
- Optimize database connection limits

### Load Estimates

```javascript
// Calculate expected load
const dailyActiveUsers = 10000;
const avgSessionDuration = 30; // minutes
const requestsPerSession = 50;
const peakMultiplier = 3;

const avgLoad = (dailyActiveUsers * requestsPerSession) / (24 * 60 * 60);
const peakLoad = avgLoad * peakMultiplier;
console.log(`Average: ${avgLoad.toFixed(2)} req/s, Peak: ${peakLoad.toFixed(2)} req/s`);
```

## Production Deployment on Render

### Prerequisites

1. **Add Redis to Render**
   - Go to your Render dashboard
   - Click "New +" → "Redis"
   - Choose the same region as your app
   - Select appropriate plan (Starter for <1000 users)
   - Copy the Redis connection string

2. **Environment Variables**
   ```env
   # Add to Render environment variables
   REDIS_URL=redis://red-xxxxx.oregon-postgres.render.com:6379
   REDIS_MAX_RETRIES=3
   REDIS_RETRY_DELAY=1000
   SESSION_CACHE_TTL=1800000      # 30 minutes
   SESSION_LOCAL_CACHE_TTL=300000  # 5 minutes
   ENABLE_SESSION_METRICS=true
   METRICS_RETENTION_DAYS=7
   ```

3. **Django Backend Updates**
   ```python
   # settings.py
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': os.environ.get('REDIS_URL'),
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
               'PARSER_CLASS': 'redis.connection.HiredisParser',
               'CONNECTION_POOL_CLASS': 'redis.BlockingConnectionPool',
               'CONNECTION_POOL_CLASS_KWARGS': {
                   'max_connections': 50,
                   'timeout': 20,
               },
               'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
           }
       }
   }
   
   # Session backend configuration
   SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
   SESSION_CACHE_ALIAS = 'default'
   ```

### Deployment Steps

1. **Push Enhanced Code**
   ```bash
   git add .
   git commit -m "Add session management v2 with Redis caching"
   git push origin Dott_Main_Dev_Deploy
   ```

2. **Monitor Deployment**
   - Watch Render build logs
   - Check for Redis connection success
   - Verify metrics endpoint is accessible

3. **Post-Deployment Validation**
   ```bash
   # Test session creation
   curl -X POST https://api.dottapps.com/api/auth/session-v2 \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   
   # Check metrics
   curl https://api.dottapps.com/api/metrics/session
   
   # Verify cache is working
   curl https://api.dottapps.com/api/cache/session/health
   ```

### Production Monitoring

1. **Set Up Alerts**
   - Cache hit rate < 70%
   - Response time > 200ms (95th percentile)
   - Error rate > 2%
   - Redis memory usage > 80%

2. **Dashboard Access**
   ```bash
   # Production dashboard (requires auth)
   https://dottapps.com/api/admin/session-dashboard
   ```

3. **Key Metrics to Watch**
   - Session creation rate
   - Cache hit/miss ratio
   - Average response time
   - Redis connection failures
   - Circuit breaker state changes

### Scaling Recommendations

1. **For 1,000-10,000 users**
   - Redis: Starter plan (0.5GB)
   - Backend: 2 instances
   - Cache TTL: 30 minutes

2. **For 10,000-50,000 users**
   - Redis: Standard plan (2GB)
   - Backend: 4-6 instances
   - Cache TTL: 60 minutes
   - Enable read replicas

3. **For 50,000+ users**
   - Redis: Pro plan with clustering
   - Backend: Auto-scaling group
   - Geographic distribution
   - Consider CDN for static assets

### Troubleshooting Production Issues

1. **High Redis Memory Usage**
   ```bash
   # Check memory stats
   redis-cli --stat
   
   # Analyze key patterns
   redis-cli --scan --pattern "session:*" | head -20
   
   # Adjust eviction policy
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

2. **Session Creation Failures**
   - Check Django logs for database issues
   - Verify Redis connectivity
   - Monitor circuit breaker state
   - Check rate limiting configuration

3. **Performance Degradation**
   - Enable slow query logging
   - Check network latency to Redis
   - Verify database indexes
   - Monitor connection pool usage

### Cost Optimization

1. **Redis Usage**
   - Use appropriate TTL values
   - Implement session cleanup jobs
   - Monitor memory fragmentation
   - Consider data compression

2. **Backend Optimization**
   - Enable connection pooling
   - Use database read replicas
   - Implement request batching
   - Cache static queries

### Security Considerations

1. **Redis Security**
   - Use TLS connections
   - Enable AUTH password
   - Restrict network access
   - Regular security updates

2. **Session Security**
   - Rotate encryption keys
   - Implement session fixation protection
   - Monitor for anomalous patterns
   - Regular security audits

---

*Documentation Updated: January 18, 2025*
*Version: 2.0.0 - Enhanced with Production Deployment Guide*

## Deployment Checklist

- [ ] Redis instance configured and running
- [ ] Database indexes created
- [ ] Monitoring endpoints accessible
- [ ] Load testing scripts verified
- [ ] Alert thresholds configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented
- [ ] Team training completed

## Additional Resources

- [Redis Best Practices](https://redis.io/docs/manual/clients-guide/)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Database Connection Pooling](https://node-postgres.com/features/pooling)
- [Load Testing with Artillery](https://artillery.io/docs/guides/getting-started/installing-artillery.html)

---

**Note**: This system is designed to handle 10x the current load with proper Redis caching and optimization. Regular load testing ensures continued performance under growth.