'use client';


import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { SessionProvider } from 'next-auth/react';
import { CookiesProvider } from 'react-cookie';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

// Import auth initializer to ensure Amplify is configured correctly
import '@/lib/authInitializer';

// Create a more robust error boundary component
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ComponentErrorBoundary] Caught error:', error);
    console.error('[ComponentErrorBoundary] Error info:', errorInfo);
    
    // Log specific details about the I(...) is undefined error
    if (error.message && error.message.includes('I(...) is undefined')) {
      console.error('[ComponentErrorBoundary] Detected I(...) is undefined error - likely a React component import issue');
      console.error('[ComponentErrorBoundary] Stack trace:', error.stack);
    }
    
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '2px solid #ff6b6b', 
          borderRadius: '8px',
          backgroundColor: '#ffe0e0',
          color: '#d63031'
        }}>
          <h2>Component Error Detected</h2>
          <p><strong>Error:</strong> {this.state.error?.message}</p>
          <p><strong>Component:</strong> {this.props.componentName || 'Unknown'}</p>
          <details style={{ marginTop: '10px' }}>
            <summary>Error Details</summary>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '10px',
              padding: '8px 16px', 
              backgroundColor: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simplified Providers component that wraps the application with necessary context providers
 */
export default function Providers({ children }) {
  // Add error handling for the whole provider tree
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // Only render on client-side to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Add error boundary using useEffect
  useEffect(() => {
    const handleError = (event) => {
      const errorMessage = event.error?.message || '';
      const errorName = event.error?.name || '';
      
      // Log all errors for debugging
      console.error('[Providers] Caught unhandled error:', event.error);
      
      // Specifically catch and log the I(...) is undefined error
      if (errorMessage.includes('I(...) is undefined')) {
        console.error('[Providers] DETECTED: I(...) is undefined error - this is likely a React component import issue');
        console.error('[Providers] Error stack:', event.error.stack);
        console.error('[Providers] This error typically occurs when:');
        console.error('1. A React component is imported but the export is undefined');
        console.error('2. A circular import dependency exists');
        console.error('3. A dynamic import fails to resolve');
        
        // Don't set error state for this specific error to prevent breaking the app
        event.preventDefault();
        return;
      }
      
      // Only set error state for critical errors that should break the app
      // Don't break the app for Hub-related warnings or non-critical errors
      const isCriticalError = 
        !errorMessage.includes('Hub') && 
        !errorMessage.includes('not available') &&
        !errorMessage.includes('fallback') &&
        !errorName.includes('Warning') &&
        errorMessage !== 'ResizeObserver loop limit exceeded';
      
      if (isCriticalError) {
        console.error('[Providers] Critical error detected, setting error state:', event.error);
        setError(event.error);
      } else {
        console.warn('[Providers] Non-critical error ignored:', errorMessage);
      }
      
      // Prevent the error from propagating further
      event.preventDefault();
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError({ error: event.reason });
    });
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);
  
  // If there's a severe error, render a simple error message
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Something went wrong</h2>
        <p>Please refresh the page to try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Refresh
        </button>
      </div>
    );
  }
  
  // Render immediately to avoid blank page - hydration issues are handled by error boundaries
  // if (!mounted) {
  //   return null;
  // }
  
  return (
    <ComponentErrorBoundary componentName="CookiesProvider">
      <CookiesProvider>
        <ComponentErrorBoundary componentName="SessionProvider">
          <SessionProvider>
            <ComponentErrorBoundary componentName="AuthProvider">
              <AuthProvider>
                <ComponentErrorBoundary componentName="TenantProvider">
                  <TenantProvider>
                    <ComponentErrorBoundary componentName="UserProfileProvider">
                      <UserProfileProvider>
                        <ComponentErrorBoundary componentName="Children">
                          {children}
                        </ComponentErrorBoundary>
                      </UserProfileProvider>
                    </ComponentErrorBoundary>
                  </TenantProvider>
                </ComponentErrorBoundary>
              </AuthProvider>
            </ComponentErrorBoundary>
          </SessionProvider>
        </ComponentErrorBoundary>
      </CookiesProvider>
    </ComponentErrorBoundary>
  );
} 