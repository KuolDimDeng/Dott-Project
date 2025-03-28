'use client';

import { useEffect, useState } from 'react';

/**
 * GlobalEventDebugger - Uses Tailwind CSS approach without direct DOM manipulation
 */
export default function GlobalEventDebugger() {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!isEnabled) return;
    
    // Log initialization
    console.log('[GlobalEventDebugger] Initialized with Tailwind CSS approach');

    // Helper to check if we're on the dashboard page
    const isDashboardPage = () => {
      return window.location.pathname.includes('/dashboard');
    };
    
    console.log(`[GlobalEventDebugger] Current page: ${window.location.pathname}`);
    
    // Create toggle button using Tailwind styling approach
    const createToggleButton = () => {
      const existingButton = document.getElementById('global-event-debugger-toggle');
      if (existingButton) {
        existingButton.remove();
      }
      
      const button = document.createElement('button');
      button.id = 'global-event-debugger-toggle';
      button.textContent = isEnabled ? 'Disable Input Fix' : 'Enable Input Fix';
      button.style.cssText = `
        position: fixed; 
        bottom: 10px; 
        right: 10px; 
        z-index: 100000; 
        padding: 8px; 
        background: ${isEnabled ? '#dc2626' : '#16a34a'}; 
        color: white; 
        border: none; 
        border-radius: 4px;
      `;
      
      button.addEventListener('click', () => {
        setIsEnabled(prev => !prev);
      });
      
      document.body.appendChild(button);
      return button;
    };
    
    // Create toggle button
    const button = createToggleButton();
    
    // Add global stylesheet to fix common input issues
    const addGlobalStyle = () => {
      const id = 'input-fix-styles';
      if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.innerHTML = `
          /* Input Fix Styles */
          
          /* Ensure inputs are interactive */
          input, textarea, select {
            position: relative !important;
            z-index: 10 !important;
          }
          
          /* Ensure text is visible */
          input, textarea, select {
            color: currentColor !important;
            caret-color: currentColor !important;
          }
          
          /* Fix for Safari and some browsers */
          input[type="text"], input[type="email"], input[type="password"], textarea {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }
        `;
        document.head.appendChild(style);
      }
    };
    
    // Add the global styles
    if (isEnabled) {
      addGlobalStyle();
    }
    
    // Cleanup function
    return () => {
      if (button && button.parentNode) {
        button.parentNode.removeChild(button);
      }
      
      const style = document.getElementById('input-fix-styles');
      if (style) {
        style.parentNode.removeChild(style);
      }
    };
  }, [isEnabled]);
  
  // With Tailwind, we don't need a theme provider wrapper
  return null;
} 