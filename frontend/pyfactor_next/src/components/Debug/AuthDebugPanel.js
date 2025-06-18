'use client';


import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth';
import { useSession } from '@/hooks/useSession-v2';

export default function AuthDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const { isAuthenticated, authError } = useAuth();
  const { refreshSession } = useSession();

  // Debug panel styling
  const panelStyle = {
    position: 'fixed',
    bottom: isVisible ? '10px' : '-500px',
    right: '10px',
    width: '400px',
    maxHeight: '80vh',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
    fontFamily: 'monospace',
    fontSize: '12px',
    transition: 'bottom 0.3s ease-in-out',
    zIndex: 9999,
    overflowY: 'auto',
    border: '1px solid #334155'
  };
  
  const headerStyle = {
    padding: '10px 15px',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold',
    borderBottom: '1px solid #334155'
  };
  
  const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold'
  };
  
  const sectionStyle = {
    padding: '10px 15px',
    borderBottom: '1px solid #334155'
  };
  
  const infoRowStyle = {
    display: 'flex',
    margin: '5px 0',
    justifyContent: 'space-between'
  };
  
  const labelStyle = {
    color: '#94a3b8'
  };
  
  const valueStyleSuccess = {
    color: '#4ade80',
    fontWeight: 'bold'
  };
  
  const valueStyleError = {
    color: '#f87171',
    fontWeight: 'bold'
  };
  
  const valueStyleNeutral = {
    color: '#e2e8f0'
  };
  
  const togglerStyle = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    zIndex: 10000,
    border: 'none',
    fontSize: '18px',
    fontFamily: 'monospace'
  };

  // Fetch session info on first load and when refreshed
  const refreshInfo = async () => {
    try {
      // Get auth debug session info from global
      if (typeof window !== 'undefined' && window.authDebug) {
        const info = await window.authDebug.getSessionInfo();
        setSessionInfo(info);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error('Error refreshing debug info:', error);
    }
  };

  // Initialize and set up keyboard shortcut
  useEffect(() => {
    // Initial fetch
    refreshInfo();
    
    // Set up keyboard shortcut (Ctrl+Shift+D)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      setIsVisible(false);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Actions
  const handleForceAuth = () => {
    if (window.authDebug) {
      window.authDebug.forceAuth();
      refreshInfo();
    }
  };
  
  const handleClearAuth = () => {
    if (window.authDebug) {
      window.authDebug.clearAuth();
      refreshInfo();
    }
  };
  
  const handleBypassSignIn = () => {
    if (window.authDebug) {
      window.authDebug.bypassSignIn();
    }
  };
  
  const handleRefreshSession = async () => {
    try {
      await refreshSession();
      refreshInfo();
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {!isVisible && (
        <button 
          onClick={() => setIsVisible(true)}
          style={togglerStyle}
          title="Toggle Auth Debug Panel (Ctrl+Shift+D)"
        >
          🔐
        </button>
      )}
      
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span>🔐 Auth Debug Panel</span>
          <div>
            <button 
              onClick={refreshInfo} 
              style={{...buttonStyle, marginRight: '5px', backgroundColor: '#6366f1'}}
            >
              Refresh
            </button>
            <button 
              onClick={() => setIsVisible(false)} 
              style={{...buttonStyle, backgroundColor: '#f87171'}}
            >
              Close
            </button>
          </div>
        </div>
        
        <div style={sectionStyle}>
          <div style={infoRowStyle}>
            <span style={labelStyle}>Authentication Status:</span>
            <span style={isAuthenticated ? valueStyleSuccess : valueStyleError}>
              {isAuthenticated ? 'AUTHENTICATED ✓' : 'NOT AUTHENTICATED ✗'}
            </span>
          </div>
          
          {authError && (
            <div style={infoRowStyle}>
              <span style={labelStyle}>Auth Error:</span>
              <span style={valueStyleError}>{authError}</span>
            </div>
          )}
          
          <div style={infoRowStyle}>
            <span style={labelStyle}>Last Refreshed:</span>
            <span style={valueStyleNeutral}>
              {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
        
        {sessionInfo && (
          <>
            <div style={sectionStyle}>
              <h4 style={{margin: '0 0 10px 0', color: '#94a3b8'}}>Session Information</h4>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Session Valid:</span>
                <span style={sessionInfo.isValid ? valueStyleSuccess : valueStyleError}>
                  {sessionInfo.isValid ? 'VALID ✓' : 'INVALID ✗'}
                </span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Token Expiration:</span>
                <span style={valueStyleNeutral}>{sessionInfo.expiration}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>User Sub:</span>
                <span style={valueStyleNeutral}>
                  {sessionInfo.userSub ? sessionInfo.userSub.substring(0, 10) + '...' : 'Not found'}
                </span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Cookies:</span>
                <span style={
                  sessionInfo.cookieStatus.includes('found') 
                    ? valueStyleSuccess 
                    : valueStyleError
                }>
                  {sessionInfo.cookieStatus}
                </span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>LocalStorage:</span>
                <span style={
                  sessionInfo.localStorageAuth.includes('Set') 
                    ? valueStyleSuccess 
                    : valueStyleError
                }>
                  {sessionInfo.localStorageAuth}
                </span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Validation Bypass:</span>
                <span style={
                  sessionInfo.bypassStatus.includes('Active') 
                    ? valueStyleSuccess 
                    : valueStyleNeutral
                }>
                  {sessionInfo.bypassStatus}
                </span>
              </div>
            </div>
            
            <div style={sectionStyle}>
              <h4 style={{margin: '0 0 10px 0', color: '#94a3b8'}}>Local Storage Data</h4>
              
              {[
                'authSuccess', 
                'bypassAuthValidation', 
                'verifiedEmail', 
                'justVerified',
                'authTimestamp'
              ].map(key => (
                <div key={key} style={infoRowStyle}>
                  <span style={labelStyle}>{key}:</span>
                  <span style={valueStyleNeutral}>
                    {localStorage.getItem(key) || 'Not set'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        
        <div style={{...sectionStyle, display: 'flex', flexWrap: 'wrap', gap: '5px'}}>
          <button 
            onClick={handleForceAuth} 
            style={{...buttonStyle, backgroundColor: '#22c55e'}}
          >
            Force Auth State
          </button>
          
          <button 
            onClick={handleClearAuth} 
            style={{...buttonStyle, backgroundColor: '#ef4444'}}
          >
            Clear Auth State
          </button>
          
          <button 
            onClick={handleBypassSignIn} 
            style={{...buttonStyle, backgroundColor: '#3b82f6'}}
          >
            Bypass & Redirect
          </button>
          
          <button 
            onClick={handleRefreshSession} 
            style={{...buttonStyle, backgroundColor: '#6366f1'}}
          >
            Refresh Session
          </button>
          
          <button 
            onClick={() => window.location.href = '/app/onboarding'} 
            style={{...buttonStyle, backgroundColor: '#0ea5e9'}}
          >
            Go to Onboarding
          </button>
          
          <button 
            onClick={() => window.location.href = '/auth/signin'} 
            style={{...buttonStyle, backgroundColor: '#8b5cf6'}}
          >
            Go to Sign In
          </button>
        </div>
        
        <div style={{...sectionStyle, fontSize: '10px', textAlign: 'center', color: '#94a3b8'}}>
          Press Ctrl+Shift+D to toggle this panel
        </div>
      </div>
    </>
  );
} 