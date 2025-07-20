'use client';

import { useEffect } from 'react';

export default function DebugGlobals() {
  useEffect(() => {
    console.log('🔍 [DebugGlobals] === CHECKING GLOBAL VARIABLES ===');
    
    // Check window object for any 't' variable
    if (typeof window !== 'undefined') {
      console.log('🔍 [DebugGlobals] window.t =', window.t);
      console.log('🔍 [DebugGlobals] globalThis.t =', globalThis.t);
      
      // Check all global variables
      const globalVars = Object.keys(window);
      const tVariables = globalVars.filter(key => key === 't' || key.includes('t'));
      console.log('🔍 [DebugGlobals] Global variables containing "t":', tVariables);
      
      // Check for common library globals that might define 't'
      console.log('🔍 [DebugGlobals] Checking for library globals:');
      console.log('  - window.i18n:', typeof window.i18n);
      console.log('  - window.i18next:', typeof window.i18next);
      console.log('  - window.translate:', typeof window.translate);
      console.log('  - window._:', typeof window._);
      console.log('  - window.moment:', typeof window.moment);
      
      // Add a global error handler specifically for 't is not defined'
      const originalError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        if (message && message.includes('t is not defined')) {
          console.error('🎯 [DebugGlobals] CAUGHT "t is not defined" in onerror!');
          console.error('  Source:', source);
          console.error('  Line:', lineno);
          console.error('  Column:', colno);
          console.error('  Error:', error);
          console.error('  Stack:', error?.stack);
          
          // Try to parse the source to identify the component
          if (source) {
            const match = source.match(/\/([^\/]+)\.js/);
            if (match) {
              console.error('  Likely component:', match[1]);
            }
          }
        }
        
        // Call original handler if exists
        if (originalError) {
          return originalError(message, source, lineno, colno, error);
        }
      };
    }
    
    console.log('🔍 [DebugGlobals] === GLOBALS CHECK COMPLETE ===');
  }, []);
  
  return null; // This component doesn't render anything
}