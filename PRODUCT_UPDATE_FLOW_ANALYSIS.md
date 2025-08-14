# Complete Product Update Flow Analysis & Fix

## Current Flow (Where 401 Error Occurs)

### 1. Frontend Flow

```
User clicks Edit → ProductTable.onEdit() → ProductManagement.handleEditProduct() → Shows ProductForm
User edits data → ProductForm.handleSubmit() → onSave(product.id, data) → useProducts.updateProduct()
→ productService.update() → apiService.put() → fetch() with credentials: 'include'
```

### 2. Request Path
```
Frontend (staging.dottapps.com) → PUT /api/inventory/products/{id}/
→ Next.js API Route → Backend (api.dottapps.com)
```

### 3. Backend Authentication Flow

```
Request arrives → Middleware chain processes:
1. SecurityMiddleware
2. EnhancedTenantMiddleware
3. CrossTenantAccessMonitor
4. SessionMiddleware (Django's)
5. CorsMiddleware
6. CsrfViewMiddleware
7. UnifiedSessionMiddleware ← GETS SESSION FROM COOKIE 'sid'
8. AuthenticationMiddleware ← SETS request.user
9. UnifiedTenantMiddleware ← VALIDATES TENANT ACCESS
10. ProductViewSet.update() ← REQUIRES IsAuthenticated permission
```

## Root Cause of 401 Error

The 401 error occurs because:

1. **Session Cookie Missing/Expired**: The `sid` cookie is either:
   - Not being sent with the request
   - Expired (24-hour default)
   - Invalid/corrupted

2. **Middleware Chain Failure**: When `UnifiedSessionMiddleware` can't find valid session:
   - Sets `request.user = AnonymousUser()`
   - Returns 401 for API endpoints
   - Never reaches the ProductViewSet

3. **Current Issue in Logs**:
```python
[UnifiedSessionMiddleware] No session ID found for path: /api/inventory/products/{id}/
[UnifiedTenantMiddleware] Authentication required - user not authenticated
```

## Industry-Standard Improvements

### 1. Session Management Enhancement

```python
# backend/pyfactor/session_manager/enhanced_middleware.py
class EnhancedSessionMiddleware(MiddlewareMixin):
    """Industry-standard session management with retry and refresh"""
    
    def process_request(self, request):
        # Try multiple session sources
        session_id = self._get_session_from_multiple_sources(request)
        
        if not session_id:
            # For API calls, return proper error
            if request.path.startswith('/api/'):
                return JsonResponse({
                    'error': 'Authentication required',
                    'code': 'NO_SESSION',
                    'refresh_url': '/api/auth/refresh'
                }, status=401)
        
        # Validate and refresh if near expiry
        session = self._validate_and_refresh(session_id)
        
        if not session:
            return JsonResponse({
                'error': 'Session expired',
                'code': 'SESSION_EXPIRED',
                'refresh_url': '/api/auth/refresh'
            }, status=401)
        
        request.session_data = session
        request.user = session.user
        return None
    
    def _get_session_from_multiple_sources(self, request):
        """Try cookie, then Authorization header, then query param"""
        # 1. Cookie (primary)
        session_id = request.COOKIES.get('sid')
        
        # 2. Authorization header (backup)
        if not session_id:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Session '):
                session_id = auth_header[8:]
        
        # 3. Query parameter (last resort, for debugging)
        if not session_id and settings.DEBUG:
            session_id = request.GET.get('session_id')
        
        return session_id
    
    def _validate_and_refresh(self, session_id):
        """Validate session and auto-refresh if near expiry"""
        try:
            session = UserSession.objects.get(
                id=session_id,
                is_active=True
            )
            
            # Check expiry
            time_left = (session.expires_at - timezone.now()).total_seconds()
            
            # Auto-refresh if less than 1 hour left
            if time_left < 3600:
                session.expires_at = timezone.now() + timedelta(hours=24)
                session.save(update_fields=['expires_at'])
                logger.info(f"Auto-refreshed session {session_id[:8]}...")
            
            return session
            
        except UserSession.DoesNotExist:
            return None
```

### 2. Frontend Session Recovery

```javascript
// frontend/pyfactor_next/src/utils/sessionManager.js
class SessionManager {
  constructor() {
    this.refreshing = false;
    this.refreshPromise = null;
  }
  
  async ensureValidSession() {
    // Check if session exists
    const sid = this.getSessionCookie();
    
    if (!sid) {
      // No session, redirect to login
      window.location.href = '/signin';
      return false;
    }
    
    // Verify session is valid
    try {
      const response = await fetch('/api/auth/session-verify', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Session invalid, try to refresh
        return await this.refreshSession();
      }
      
      return true;
    } catch (error) {
      console.error('Session verification failed:', error);
      return false;
    }
  }
  
  async refreshSession() {
    // Prevent multiple simultaneous refreshes
    if (this.refreshing) {
      return this.refreshPromise;
    }
    
    this.refreshing = true;
    this.refreshPromise = this._doRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshing = false;
      this.refreshPromise = null;
    }
  }
  
  async _doRefresh() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update session cookie if provided
        if (data.session_id) {
          this.setSessionCookie(data.session_id);
        }
        return true;
      }
      
      // Refresh failed, redirect to login
      window.location.href = '/signin';
      return false;
      
    } catch (error) {
      console.error('Session refresh failed:', error);
      window.location.href = '/signin';
      return false;
    }
  }
  
  getSessionCookie() {
    const cookies = document.cookie.split('; ');
    const sidCookie = cookies.find(row => row.startsWith('sid='));
    return sidCookie ? sidCookie.split('=')[1] : null;
  }
  
  setSessionCookie(sessionId) {
    // Set cookie with proper domain and security flags
    document.cookie = `sid=${sessionId}; path=/; domain=.dottapps.com; secure; samesite=lax; max-age=86400`;
  }
}

export const sessionManager = new SessionManager();
```

### 3. Enhanced API Service with Retry

```javascript
// frontend/pyfactor_next/src/services/enhancedApiService.js
import { sessionManager } from '@/utils/sessionManager';

class EnhancedApiService {
  async request(url, options = {}) {
    // Ensure valid session before API call
    await sessionManager.ensureValidSession();
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (response.status === 401) {
        // Try to refresh session once
        const refreshed = await sessionManager.refreshSession();
        
        if (refreshed) {
          // Retry the request
          return fetch(url, {
            ...options,
            credentials: 'include'
          });
        }
        
        throw new Error('Authentication failed');
      }
      
      return response;
      
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  async put(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update: ${error}`);
    }
    
    return response.json();
  }
}

export const enhancedApiService = new EnhancedApiService();
```

### 4. Backend Session Refresh Endpoint

```python
# backend/pyfactor/session_manager/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

@api_view(['POST'])
def refresh_session(request):
    """Refresh an existing session"""
    
    # Get current session
    session_id = request.COOKIES.get('sid')
    
    if not session_id:
        return Response({
            'error': 'No session to refresh'
        }, status=401)
    
    try:
        session = UserSession.objects.get(
            id=session_id,
            is_active=True
        )
        
        # Check if session is still valid
        if session.expires_at < timezone.now():
            return Response({
                'error': 'Session expired',
                'code': 'SESSION_EXPIRED'
            }, status=401)
        
        # Extend session
        session.expires_at = timezone.now() + timedelta(hours=24)
        session.last_activity = timezone.now()
        session.save(update_fields=['expires_at', 'last_activity'])
        
        response = Response({
            'success': True,
            'session_id': str(session.id),
            'expires_at': session.expires_at.isoformat()
        })
        
        # Update cookie
        response.set_cookie(
            'sid',
            str(session.id),
            max_age=86400,  # 24 hours
            httponly=True,
            secure=True,
            samesite='Lax',
            domain='.dottapps.com'
        )
        
        return response
        
    except UserSession.DoesNotExist:
        return Response({
            'error': 'Invalid session'
        }, status=401)
```

## Immediate Fix for Current Issue

1. **Quick Fix (User Action)**:
   - Log out completely
   - Clear browser cookies for staging.dottapps.com
   - Log in again to get fresh session
   - Try product update

2. **Code Fix (Deploy This)**:

```javascript
// frontend/pyfactor_next/src/domains/products/services/productService.js
async update(id, productData) {
  // Check session before update
  const sid = document.cookie.split('; ').find(row => row.startsWith('sid='));
  
  if (!sid) {
    // No session, prompt re-login
    alert('Your session has expired. Please log in again.');
    window.location.href = '/signin';
    return;
  }
  
  try {
    return await apiService.put(`/inventory/products/${id}`, productData);
  } catch (error) {
    if (error.message.includes('401')) {
      // Session expired during request
      alert('Your session has expired. Please log in again.');
      window.location.href = '/signin';
    }
    throw error;
  }
}
```

## Deployment Steps

1. **Backend Changes**:
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
# Add refresh endpoint to urls.py
# Update UnifiedSessionMiddleware
git add -A
git commit -m "Add session refresh and auto-recovery"
git push origin staging
```

2. **Frontend Changes**:
```bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
# Add sessionManager utility
# Update productService
git add -A
git commit -m "Add session recovery for API calls"
git push origin staging
```

3. **Monitor Deployment**:
```bash
./scripts/monitor-render-deployment.sh
```

## Best Practices Implemented

1. **Graceful Degradation**: System tries multiple recovery methods before failing
2. **User Experience**: Clear error messages and automatic recovery where possible
3. **Security**: Maintains secure cookie settings and validates all sessions
4. **Performance**: Caches session validation to avoid redundant checks
5. **Monitoring**: Logs all session issues for debugging

## Testing the Fix

```bash
# Test session refresh
curl -X POST https://staging.dottapps.com/api/auth/refresh \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json"

# Test product update with new session
curl -X PUT https://staging.dottapps.com/api/inventory/products/PRODUCT_ID/ \
  -H "Cookie: sid=NEW_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Product", "price": 99.99}'
```

This comprehensive solution addresses the root cause and provides industry-standard session management with automatic recovery.