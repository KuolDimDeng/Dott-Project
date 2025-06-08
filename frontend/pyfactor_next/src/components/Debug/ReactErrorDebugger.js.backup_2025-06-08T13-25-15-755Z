'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

/**
 * ReactErrorDebugger - A component that helps debug React rendering errors
 * This component can be placed anywhere in your application to monitor for errors
 * and provide detailed debugging information.
 */
const ReactErrorDebugger = ({ enabled = true }) => {
  const [errors, setErrors] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    logger.debug('[ReactErrorDebugger] Initializing error monitoring');

    // Store original error handler
    const originalErrorHandler = window.onerror;
    
    // Create enhanced error handler
    const enhancedErrorHandler = (message, source, lineno, colno, error) => {
      // Check if this is a React error
      const isReactError = 
        (message && message.includes('render is not a function')) ||
        (error && error.message && error.message.includes('render is not a function')) ||
        (source && source.includes('react')) ||
        (error && error.stack && (
          error.stack.includes('react-dom') || 
          error.stack.includes('React')
        ));
      
      if (isReactError) {
        logger.error('[ReactErrorDebugger] Caught React error:', {
          message,
          source,
          lineno,
          colno,
          error
        });
        
        // Add to our errors list
        setErrors(prev => [
          ...prev, 
          {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message,
            source,
            lineno,
            colno,
            stack: error?.stack || 'No stack trace available',
            componentStack: error?.componentStack || 'No component stack available'
          }
        ]);
      }
      
      // Call original handler if it exists
      if (typeof originalErrorHandler === 'function') {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      
      // Return false to allow default browser error handling
      return false;
    };
    
    // Install our error handler
    window.onerror = enhancedErrorHandler;
    
    // Try to find React internals through window
    if (window.ReactDOM && window.ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      try {
        const internals = window.ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        
        // Store original showErrorDialog if it exists
        const originalShowErrorDialog = internals.showErrorDialog;
        
        if (typeof originalShowErrorDialog === 'function') {
          // Replace with our enhanced version
          internals.showErrorDialog = (boundary, error) => {
            logger.error('[ReactErrorDebugger] React internal error:', {
              boundary,
              error
            });
            
            // Add to our errors list
            setErrors(prev => [
              ...prev, 
              {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                message: error?.message || 'Unknown React error',
                source: 'React internal',
                stack: error?.stack || 'No stack trace available',
                componentStack: error?.componentStack || 'No component stack available',
                boundary: boundary?.type?.name || 'Unknown boundary'
              }
            ]);
            
            // Call original handler
            return originalShowErrorDialog(boundary, error);
          };
          
          logger.debug('[ReactErrorDebugger] Successfully patched React error handler');
        }
      } catch (error) {
        logger.error('[ReactErrorDebugger] Failed to patch React error handler:', error);
      }
    }
    
    // Add global access to errors
    window.__REACT_ERROR_DEBUGGER = {
      errors,
      clearErrors: () => setErrors([])
    };
    
    // Cleanup function
    return () => {
      window.onerror = originalErrorHandler;
      logger.debug('[ReactErrorDebugger] Error monitoring cleaned up');
    };
  }, [enabled]);

  // Don't render anything in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  if (!enabled) {
    return null;
  }
  
  if (isMinimized) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
          backgroundColor: errors.length > 0 ? '#f44336' : '#2196f3',
          color: 'white',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        }}
        onClick={() => setIsMinimized(false)}
      >
        {errors.length > 0 ? errors.length : 'D'}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 9999,
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: isExpanded ? '80%' : '300px',
        maxHeight: isExpanded ? '80%' : '300px',
        overflow: 'auto',
        transition: 'all 0.3s ease',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: errors.length > 0 ? '#f44336' : '#2196f3',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0
        }}
      >
        <div>React Error Debugger {errors.length > 0 ? `(${errors.length})` : ''}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isExpanded ? '↓' : '↑'}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            _
          </button>
          <button
            onClick={() => setErrors([])}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        {errors.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>
            No React errors detected
          </div>
        ) : (
          errors.map((error, index) => (
            <div
              key={error.id}
              style={{
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {new Date(error.timestamp).toLocaleTimeString()} - {error.message || 'Unknown error'}
              </div>
              {error.source && (
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                  Source: {error.source} {error.lineno ? `(${error.lineno}:${error.colno})` : ''}
                </div>
              )}
              {error.stack && (
                <pre
                  style={{
                    margin: '8px 0',
                    padding: '8px',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #eee',
                    borderRadius: '2px',
                    overflow: 'auto',
                    fontSize: '10px',
                    maxHeight: '100px'
                  }}
                >
                  {error.stack}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
      
      <div style={{ padding: '8px 12px', borderTop: '1px solid #ddd', backgroundColor: '#f0f0f0' }}>
        <button
          onClick={() => {
            // Attempt to trigger a render check
            try {
              logger.debug('[ReactErrorDebugger] Running render check');
              
              // Force update all components
              if (typeof window !== 'undefined') {
                const event = new Event('react-debug-force-update');
                window.dispatchEvent(event);
              }
            } catch (error) {
              logger.error('[ReactErrorDebugger] Error in render check:', error);
            }
          }}
          style={{
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginRight: '8px'
          }}
        >
          Run Render Check
        </button>
        
        <button
          onClick={() => {
            // Log debug info to console
            logger.debug('[ReactErrorDebugger] Debug info:', {
              errors,
              react: window.React ? window.React.version : 'Not available',
              reactDOM: window.ReactDOM ? window.ReactDOM.version : 'Not available',
              dynamicImports: window.__DYNAMIC_IMPORT_TRACKER || 'Not available',
              debugState: window.__DEBUG_STATE || 'Not available'
            });
          }}
          style={{
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Log Debug Info
        </button>
      </div>
    </div>
  );
};

export default ReactErrorDebugger;