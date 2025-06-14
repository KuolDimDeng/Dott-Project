# Session Management Architecture

## Overview
This document outlines a robust, secure, and scalable session management system for the Dott application.

## Current Problems
1. Session data stored in cookies (size limitations, security concerns)
2. Multiple session formats (base64, encrypted)
3. Race conditions between frontend and backend updates
4. No single source of truth for session state
5. Complex synchronization logic spread across multiple endpoints

## Proposed Solution

### 1. Session Token Architecture
- Replace data-heavy cookies with lightweight session tokens
- Store session data server-side (Redis/PostgreSQL)
- Use secure, httpOnly cookies for token storage only

### 2. Backend Session Service

#### Session Model
```python
# backend/pyfactor/sessions/models.py
class UserSession(models.Model):
    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    
    # Auth tokens
    access_token = models.TextField()  # Encrypted
    refresh_token = models.TextField(null=True, blank=True)  # Encrypted
    
    # Session data
    data = models.JSONField(default=dict)  # Flexible session storage
    
    # User state
    needs_onboarding = models.BooleanField(default=True)
    onboarding_completed = models.BooleanField(default=False)
    subscription_plan = models.CharField(max_length=50, default='free')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now=True)
    
    # Security
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['user', 'expires_at']),
            models.Index(fields=['session_id', 'expires_at']),
        ]
```

#### Session Service
```python
# backend/pyfactor/sessions/services.py
import redis
from django.conf import settings
from django.core.cache import cache
from datetime import datetime, timedelta
import json

class SessionService:
    def __init__(self):
        self.redis_client = redis.StrictRedis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_SESSION_DB,
            decode_responses=True
        )
        self.session_ttl = 86400  # 24 hours
        
    def create_session(self, user, tenant, access_token, **kwargs):
        """Create a new session"""
        session = UserSession.objects.create(
            user=user,
            tenant=tenant,
            access_token=self.encrypt_token(access_token),
            expires_at=datetime.now() + timedelta(seconds=self.session_ttl),
            **kwargs
        )
        
        # Cache in Redis for fast access
        self._cache_session(session)
        
        return session
        
    def get_session(self, session_id):
        """Get session by ID with Redis caching"""
        # Try Redis first
        cached = self._get_cached_session(session_id)
        if cached:
            return cached
            
        # Fallback to database
        try:
            session = UserSession.objects.get(
                session_id=session_id,
                expires_at__gt=datetime.now()
            )
            self._cache_session(session)
            return session
        except UserSession.DoesNotExist:
            return None
            
    def update_session(self, session_id, **updates):
        """Atomic session update"""
        with transaction.atomic():
            session = UserSession.objects.select_for_update().get(
                session_id=session_id
            )
            
            for key, value in updates.items():
                if hasattr(session, key):
                    setattr(session, key, value)
                else:
                    session.data[key] = value
                    
            session.updated_at = datetime.now()
            session.save()
            
            # Update cache
            self._cache_session(session)
            
        return session
        
    def delete_session(self, session_id):
        """Delete session and clear cache"""
        UserSession.objects.filter(session_id=session_id).delete()
        self._delete_cached_session(session_id)
        
    def _cache_session(self, session):
        """Cache session in Redis"""
        key = f"session:{session.session_id}"
        data = {
            'user_id': session.user_id,
            'tenant_id': str(session.tenant_id),
            'needs_onboarding': session.needs_onboarding,
            'onboarding_completed': session.onboarding_completed,
            'subscription_plan': session.subscription_plan,
            'data': session.data,
            'expires_at': session.expires_at.isoformat()
        }
        self.redis_client.setex(
            key,
            self.session_ttl,
            json.dumps(data)
        )
        
    def _get_cached_session(self, session_id):
        """Get session from Redis cache"""
        key = f"session:{session_id}"
        data = self.redis_client.get(key)
        if data:
            return json.loads(data)
        return None
```

### 3. Frontend Session Management

#### Session Hook
```javascript
// frontend/pyfactor_next/src/hooks/useSession.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useSession() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    const fetchSession = useCallback(async () => {
        try {
            const response = await fetch('/api/session', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setSession(data);
            } else {
                setSession(null);
            }
        } catch (error) {
            console.error('Session fetch error:', error);
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const updateSession = useCallback(async (updates) => {
        try {
            const response = await fetch('/api/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                const data = await response.json();
                setSession(data);
                return data;
            }
            
            throw new Error('Failed to update session');
        } catch (error) {
            console.error('Session update error:', error);
            throw error;
        }
    }, []);
    
    const destroySession = useCallback(async () => {
        try {
            await fetch('/api/session', {
                method: 'DELETE',
                credentials: 'include'
            });
            
            setSession(null);
            router.push('/auth/signin');
        } catch (error) {
            console.error('Session destroy error:', error);
        }
    }, [router]);
    
    useEffect(() => {
        fetchSession();
        
        // Set up session refresh interval
        const interval = setInterval(fetchSession, 5 * 60 * 1000); // 5 minutes
        
        return () => clearInterval(interval);
    }, [fetchSession]);
    
    return {
        session,
        loading,
        updateSession,
        destroySession,
        refetch: fetchSession
    };
}
```

#### Session API Route
```javascript
// frontend/pyfactor_next/src/app/api/session/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        
        if (!sessionToken) {
            return NextResponse.json(null, { status: 401 });
        }
        
        // Get session from backend
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
            headers: {
                'Authorization': `Session ${sessionToken.value}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            return NextResponse.json(null, { status: response.status });
        }
        
        const sessionData = await response.json();
        
        return NextResponse.json(sessionData);
        
    } catch (error) {
        console.error('[Session API] GET error:', error);
        return NextResponse.json({ error: 'Session error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        
        if (!sessionToken) {
            return NextResponse.json(null, { status: 401 });
        }
        
        const updates = await request.json();
        
        // Update session in backend
        const response = await fetch(`${API_URL}/api/sessions/current/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Session ${sessionToken.value}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update session');
        }
        
        const sessionData = await response.json();
        
        return NextResponse.json(sessionData);
        
    } catch (error) {
        console.error('[Session API] PATCH error:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session_token');
        
        if (sessionToken) {
            // Delete session in backend
            await fetch(`${API_URL}/api/sessions/current/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Session ${sessionToken.value}`
                }
            });
        }
        
        // Clear session cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set('session_token', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 0,
            path: '/'
        });
        
        return response;
        
    } catch (error) {
        console.error('[Session API] DELETE error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
```

### 4. Migration Strategy

#### Phase 1: Backend Implementation (Week 1)
1. Create session models and service
2. Set up Redis for session caching
3. Implement session API endpoints
4. Add session authentication middleware

#### Phase 2: Frontend Integration (Week 2)
1. Create session hook and context
2. Update auth flow to use sessions
3. Replace cookie-based logic with session API calls
4. Update all components using session data

#### Phase 3: Migration & Testing (Week 3)
1. Create migration scripts for existing users
2. Implement backwards compatibility layer
3. Comprehensive testing of all flows
4. Monitor and fix edge cases

#### Phase 4: Cleanup & Optimization (Week 4)
1. Remove old cookie-based code
2. Optimize session queries
3. Add monitoring and analytics
4. Documentation and training

### 5. Security Considerations

1. **Session Tokens**
   - Use cryptographically secure random tokens
   - Rotate tokens on privilege escalation
   - Implement token binding to prevent hijacking

2. **Data Protection**
   - Encrypt sensitive data at rest
   - Use TLS for all communications
   - Implement rate limiting

3. **Session Lifecycle**
   - Automatic expiration after inactivity
   - Forced logout on security events
   - Session history tracking

### 6. Performance Optimizations

1. **Caching Strategy**
   - Redis for hot sessions
   - Database for persistent storage
   - CDN for static session data

2. **Load Balancing**
   - Sticky sessions not required
   - Horizontal scaling ready
   - Geographic distribution support

### 7. Monitoring & Debugging

1. **Metrics**
   - Active sessions count
   - Session creation/destruction rate
   - Average session duration
   - Failed authentication attempts

2. **Debugging Tools**
   - Session inspector dashboard
   - Real-time session monitoring
   - Audit logs for all session events

## Benefits

1. **Security**: No sensitive data in cookies
2. **Scalability**: Centralized session management
3. **Reliability**: Single source of truth
4. **Performance**: Redis caching for speed
5. **Flexibility**: Easy to extend session data
6. **Debugging**: Better visibility into session state

## Implementation Timeline

- **Week 1**: Backend implementation
- **Week 2**: Frontend integration
- **Week 3**: Migration and testing
- **Week 4**: Optimization and launch

This architecture provides a solid foundation for growth while solving all current session management issues.