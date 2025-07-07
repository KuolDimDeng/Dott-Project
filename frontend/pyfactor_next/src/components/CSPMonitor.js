'use client';

import { useEffect, useState } from 'react';
import { initCSPViolationListener, getCSPViolationSummary, getCurrentCSP } from '@/utils/cspLogger';
import { logger } from '@/utils/logger';

export default function CSPMonitor() {
  const [violations, setViolations] = useState([]);
  const [cspInfo, setCSPInfo] = useState(null);
  
  useEffect(() => {
    // Initialize CSP violation listener
    initCSPViolationListener();
    
    // Check current CSP
    const currentCSP = getCurrentCSP();
    setCSPInfo(currentCSP);
    
    // Update violations every 5 seconds
    const interval = setInterval(() => {
      const summary = getCSPViolationSummary();
      setViolations(summary);
      
      if (summary.length > 0) {
        logger.warn('[CSP Monitor] Active violations detected', {
          count: summary.length,
          topViolation: summary[0]
        });
      }
    }, 5000);
    
    // Test critical endpoints
    testCriticalEndpoints();
    
    return () => clearInterval(interval);
  }, []);
  
  async function testCriticalEndpoints() {
    const tests = {
      backend: { url: 'https://api.dottapps.com/health/', result: 'pending' },
      sentry: { url: 'https://o4509614361804800.ingest.us.sentry.io/api/0/envelope/', result: 'pending' },
      cloudflare: { url: 'https://api.cloudflare.com/client/v4/user/tokens/verify', result: 'pending' }
    };
    
    for (const [name, test] of Object.entries(tests)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        await fetch(test.url, {
          method: name === 'sentry' ? 'POST' : 'GET',
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeout);
        test.result = 'allowed';
      } catch (error) {
        if (error.name === 'SecurityError' || error.message.includes('CSP')) {
          test.result = 'blocked-by-csp';
        } else if (error.name === 'AbortError') {
          test.result = 'timeout';
        } else {
          test.result = 'error';
        }
        
        logger.error(`[CSP Monitor] Test failed for ${name}`, {
          url: test.url,
          error: error.message,
          result: test.result
        });
      }
    }
    
    logger.info('[CSP Monitor] Endpoint test results', tests);
  }
  
  // Only render in development or if violations are detected
  if (process.env.NODE_ENV === 'production' && violations.length === 0) {
    return null;
  }
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        maxWidth: 400,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
        CSP Monitor {violations.length > 0 && `(${violations.length} violations)`}
      </div>
      
      {violations.length > 0 ? (
        <div>
          <div style={{ marginBottom: '10px' }}>Active Violations:</div>
          {violations.slice(0, 5).map((violation, index) => (
            <div key={index} style={{ marginBottom: '5px', opacity: 0.8 }}>
              • {violation.directive}: {violation.blockedURI} ({violation.count}x)
            </div>
          ))}
        </div>
      ) : (
        <div style={{ opacity: 0.7 }}>No CSP violations detected</div>
      )}
      
      {cspInfo && (
        <div style={{ marginTop: '10px', opacity: 0.7, fontSize: '10px' }}>
          CSP Source: {cspInfo.source}
        </div>
      )}
    </div>
  );
}