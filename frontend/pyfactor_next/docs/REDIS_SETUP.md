# Redis Setup for Session Management

## Overview
Redis is used to store bridge tokens for session management, providing a distributed cache that works across multiple server instances.

## Environment Variables

Add these to your `.env.local` file:

### Option 1: Redis URL (Recommended for cloud services)
```env
REDIS_URL=redis://username:password@host:port/database
```

Example for Redis Cloud:
```env
REDIS_URL=redis://default:your-password@redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com:12345
```

### Option 2: Individual Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## Local Development Setup

### Using Docker
```bash
# Start Redis container
docker run -d --name dott-redis -p 6379:6379 redis:7-alpine

# With password
docker run -d --name dott-redis -p 6379:6379 redis:7-alpine redis-server --requirepass yourpassword
```

### Using Homebrew (macOS)
```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Or run in foreground
redis-server
```

### Using apt (Ubuntu/Debian)
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Production Setup

### Render Redis
1. Create a new Redis instance in Render dashboard
2. Copy the Internal Redis URL
3. Add to your environment variables:
```env
REDIS_URL=redis://red-abc123:6379
```

### Redis Cloud (Free Tier Available)
1. Sign up at https://redis.com/try-free/
2. Create a new database
3. Copy the connection string
4. Add to environment variables

### AWS ElastiCache
1. Create ElastiCache Redis cluster
2. Configure security groups
3. Use the cluster endpoint:
```env
REDIS_HOST=your-cluster.abc123.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
```

## Fallback Behavior

If Redis is not configured or unavailable, the system automatically falls back to in-memory storage:

- Bridge tokens stored in Node.js memory
- Works for single-instance deployments
- Tokens lost on server restart
- Not suitable for multi-instance production deployments

## Testing Redis Connection

Create a test script `test-redis.js`:

```javascript
import { getRedisWrapper } from './src/lib/redis.js';

async function testRedis() {
  console.log('Testing Redis connection...');
  
  const redis = await getRedisWrapper();
  console.log('Cache type:', redis.getCacheType());
  
  if (redis.getCacheType() === 'redis') {
    // Test operations
    await redis.setex('test:key', 10, 'Hello Redis');
    const value = await redis.get('test:key');
    console.log('Test value:', value);
    
    await redis.del('test:key');
    console.log('Redis test successful!');
  } else {
    console.log('Using in-memory fallback');
  }
  
  await redis.close();
}

testRedis().catch(console.error);
```

Run with:
```bash
node test-redis.js
```

## Monitoring

### Redis CLI
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# With password
redis-cli -h localhost -p 6379 -a yourpassword

# Monitor all commands
MONITOR

# Check bridge tokens
KEYS bridge:*

# Get info
INFO
```

### Application Logs
The application logs Redis connection status:
- `[Redis] Redis client connected` - Successful connection
- `[Redis] No Redis configuration found, using in-memory fallback` - No config
- `[Redis] Failed to initialize Redis` - Connection error

## Security Considerations

1. **Always use password authentication in production**
2. **Use SSL/TLS for Redis connections**
3. **Restrict network access with security groups/firewalls**
4. **Monitor for unusual access patterns**
5. **Set up Redis ACLs for fine-grained permissions**

## Performance Tuning

### Redis Configuration
```conf
# /etc/redis/redis.conf or redis.conf

# Max memory usage
maxmemory 256mb

# Eviction policy
maxmemory-policy allkeys-lru

# Persistence (disable for cache-only usage)
save ""
appendonly no
```

### Connection Pooling
The Redis client automatically manages connection pooling. Default settings:
- Min connections: 1
- Max connections: 10
- Connection timeout: 5 seconds
- Reconnect strategy: Exponential backoff

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
- Check Redis is running: `redis-cli ping`
- Verify host/port configuration
- Check firewall rules

### Authentication Failed
```
Error: NOAUTH Authentication required
```
- Add REDIS_PASSWORD to environment variables
- Verify password is correct

### Memory Issues
```
Error: OOM command not allowed when used memory > 'maxmemory'
```
- Increase maxmemory setting
- Configure eviction policy
- Monitor memory usage

### Network Timeouts
- Check network connectivity
- Increase connection timeout
- Verify security group rules

## Best Practices

1. **Use Redis for**:
   - Session bridge tokens
   - Short-lived cache data
   - Rate limiting counters
   - Distributed locks

2. **Don't use Redis for**:
   - Primary data storage
   - Large binary data
   - Long-term persistent data

3. **Monitor these metrics**:
   - Connection count
   - Memory usage
   - Command latency
   - Eviction rate

4. **Set appropriate TTLs**:
   - Bridge tokens: 60 seconds
   - Rate limit counters: 5 minutes
   - Session cache: 5 minutes