# Password Login Frontend Integration Guide

## Quick Start

### 1. Basic Login Function
```javascript
async function loginWithPassword(email, password, rememberMe = false) {
  try {
    const response = await fetch('/api/auth/password-login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookie handling
      body: JSON.stringify({
        email,
        password,
        remember_me: rememberMe
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### 2. React Hook Example
```javascript
import { useState } from 'react';
import { useRouter } from 'next/router';

export function usePasswordLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/password-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          remember_me: rememberMe
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store session token if needed (though cookie is automatically set)
      localStorage.setItem('session_token', data.session_token);
      
      // Check if user needs onboarding
      if (data.needs_onboarding) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
```

### 3. Login Form Component
```jsx
import { useState } from 'react';
import { usePasswordLogin } from './usePasswordLogin';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, loading, error } = usePasswordLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
    } catch (err) {
      // Error is already set in the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        disabled={loading}
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        disabled={loading}
      />
      
      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={loading}
        />
        Remember me for 7 days
      </label>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
```

## Response Handling

### Success Response Structure
```javascript
{
  success: true,
  session_token: "uuid-string",
  expires_at: "2025-01-12T10:30:00Z",
  user: {
    id: 123,
    email: "user@example.com",
    name: "John Doe",
    picture: "https://...",
    role: "USER"
  },
  tenant: {
    id: "uuid-string",
    name: "Company Name"
  },
  needs_onboarding: false,
  onboarding_completed: true,
  current_step: "complete",
  subscription_plan: "professional"
}
```

### Error Handling
```javascript
// Handle different error types
switch (response.status) {
  case 400:
    // Bad request - missing fields
    showError('Please enter both email and password');
    break;
  case 401:
    // Invalid credentials
    showError('Invalid email or password');
    break;
  case 403:
    // Account closed
    showError('This account has been closed. Please contact support.');
    break;
  case 503:
  case 504:
    // Service unavailable
    showError('Login service is temporarily unavailable. Please try again.');
    break;
  default:
    // Generic error
    showError('An error occurred. Please try again.');
}
```

## Session Management

### Check Session Status
```javascript
async function checkSession() {
  try {
    const response = await fetch('/api/sessions/current/', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const session = await response.json();
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
}
```

### Logout
```javascript
async function logout() {
  try {
    const response = await fetch('/api/sessions/current/', {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      // Clear local storage
      localStorage.removeItem('session_token');
      // Redirect to login
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

## Best Practices

1. **Always use HTTPS** in production
2. **Include credentials** in fetch requests for cookie handling
3. **Handle loading states** to prevent multiple submissions
4. **Clear error messages** when user starts typing again
5. **Validate email format** on the frontend before submission
6. **Show password strength** indicators for better UX
7. **Implement rate limiting** on login attempts
8. **Store minimal data** in localStorage - rely on server session

## TypeScript Types

```typescript
interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface LoginResponse {
  success: boolean;
  session_token: string;
  expires_at: string;
  user: {
    id: number;
    email: string;
    name: string;
    picture: string;
    role: string;
  };
  tenant?: {
    id: string;
    name: string;
  };
  tenantId?: string;
  needs_onboarding: boolean;
  onboarding_completed: boolean;
  current_step: string;
  subscription_plan: string;
}

interface LoginError {
  error: string;
}
```