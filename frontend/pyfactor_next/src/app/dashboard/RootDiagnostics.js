'use client';

import React, { useEffect } from 'react';
import { findEventAbsorbers, createDirectTestInput, createClickDetector } from '@/utils/eventsDebugger';

/**
 * Root-level diagnostics component that will help diagnose input field issues
 */
export default function RootDiagnostics() {
  useEffect(() => {
    // Wait a bit for the DOM to render completely
    setTimeout(() => {
      // Find elements that may be blocking events
      findEventAbsorbers();
      
      // Create a clickable area to show which element is clicked
      if (typeof window !== 'undefined') {
        window.createDirectTestInput = createDirectTestInput;
        window.findEventAbsorbers = findEventAbsorbers;
        window.createClickDetector = createClickDetector;
      }
      
      // Add keyboard shortcut for direct test input
      const handleKeyDown = (e) => {
        // Ctrl+Shift+D shows direct test input
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          createDirectTestInput();
        }
        // Ctrl+Shift+F finds event absorbers
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
          findEventAbsorbers();
        }
        // Ctrl+Shift+C creates click detector
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          createClickDetector();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, 2000);
  }, []);
  
  // This component doesn't render anything
  return null;
}