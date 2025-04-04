'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';

export default function SessionDebugger() {
  const { user, loading, error } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Only show in development mode
    setIsDevMode(process.env.NODE_ENV === 'development');
    
    // Check for keyboard shortcut to show/hide
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Don't render anything in production
  if (!isDevMode) return null;
  
  // Only show when visible flag is true
  if (!isVisible) {
    return null;
  }
  
  const resetSessionState = () => {
    // Clear session flags
    if (window.__tokenRefreshInProgress) {
      window.__tokenRefreshInProgress = false;
    }
    
    if (window.__tokenRefreshCooldown) {
      window.__tokenRefreshCooldown = null;
    }
    
    // Reset local storage items related to sessions
    localStorage.removeItem('tenantId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('previouslyOnboarded');
    
    // Clear session cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    logger.info('[SessionDebugger] Session state reset');
    
    // Reload the page to apply changes
    window.location.reload();
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Session Debugger</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>
      
      <div className="mb-2">
        <div className="font-semibold">Status:</div>
        <div className="text-sm">
          {loading ? (
            <span className="text-blue-500">Loading...</span>
          ) : user ? (
            <span className="text-green-500">Authenticated</span>
          ) : (
            <span className="text-red-500">Not authenticated</span>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mb-2">
          <div className="font-semibold">Error:</div>
          <div className="text-sm text-red-500">{error.message || String(error)}</div>
        </div>
      )}
      
      {user && (
        <div className="mb-2">
          <div className="font-semibold">User:</div>
          <pre className="text-xs bg-gray-100 p-1 rounded overflow-auto max-h-32">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4 border-t pt-2">
        <button
          onClick={resetSessionState}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
        >
          Reset Session State
        </button>
      </div>
    </div>
  );
} 