'use client';


import { useEffect } from 'react';

/**
 * KeyboardEventMonitor
 * 
 * This component monitors keyboard events globally and attempts to automatically
 * fix issues with input fields not receiving keyboard events.
 */
export default function KeyboardEventMonitor() {
  useEffect(() => {
    console.log('[KeyboardEventMonitor] Initializing keyboard event monitoring');
    
    // Store the last focused input element
    let lastFocusedInput = null;
    
    // Flag to track if GlobalEventDebugger redirected the event
    let globalRedirectorHandled = false;
    
    // Check if GlobalEventDebugger is active
    const isGlobalEventDebuggerActive = () => {
      return !!window.__DASHBOARD_EVENT_REDIRECTOR;
    };
    
    // Handle input focus
    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT') {
        console.log('[KeyboardEventMonitor] Input focused:', e.target);
        lastFocusedInput = e.target;
      }
    };
    
    // Handle input blur
    const handleBlur = (e) => {
      if (lastFocusedInput === e.target) {
        console.log('[KeyboardEventMonitor] Input blurred:', e.target);
        // Keep track of it for a short time in case we need to refocus
        setTimeout(() => {
          if (lastFocusedInput === e.target) {
            lastFocusedInput = null;
          }
        }, 100);
      }
    };
    
    // Handle GlobalEventDebugger redirector
    const handleGlobalRedirectorStart = () => {
      globalRedirectorHandled = true;
      // Reset after a short time
      setTimeout(() => {
        globalRedirectorHandled = false;
      }, 50);
    };
    
    // Listen for a custom event that GlobalEventDebugger might emit
    document.addEventListener('globalEventRedirectorHandled', handleGlobalRedirectorStart);
    
    // Handle keyboard events
    const handleKeyEvent = (e) => {
      // Skip if GlobalEventDebugger handled it
      if (globalRedirectorHandled || isGlobalEventDebuggerActive()) {
        return;
      }
      
      // Only proceed if this isn't a modifier key press
      if (e.key && 
          e.key !== 'Shift' && 
          e.key !== 'Control' && 
          e.key !== 'Alt' && 
          e.key !== 'Meta') {
        
        // If the target isn't an input and we have a lastFocusedInput, try to refocus it
        if (e.target.tagName !== 'INPUT' && 
            e.target.tagName !== 'TEXTAREA' && 
            e.target.tagName !== 'SELECT' && 
            lastFocusedInput) {
          
          console.log('[KeyboardEventMonitor] Redirecting keyboard event to last focused input:', lastFocusedInput);
          
          // Make sure the input reference is still valid
          if (!document.body.contains(lastFocusedInput)) {
            console.log('[KeyboardEventMonitor] Last focused input is no longer in the document');
            lastFocusedInput = null;
            return;
          }
          
          try {
            // Focus the input
            lastFocusedInput.focus();
            
            // Try to modify the input's value directly based on the key
            if (e.key.length === 1) { // Character key
              const originalValue = lastFocusedInput.value || '';
              const cursorPosition = lastFocusedInput.selectionStart || originalValue.length;
              const newValue = originalValue.substring(0, cursorPosition) + 
                               e.key + 
                               originalValue.substring(cursorPosition);
              
              lastFocusedInput.value = newValue;
              lastFocusedInput.selectionStart = cursorPosition + 1;
              lastFocusedInput.selectionEnd = cursorPosition + 1;
              
              // Trigger input events
              lastFocusedInput.dispatchEvent(new Event('input', { bubbles: true }));
              lastFocusedInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Prevent the original event
              e.preventDefault();
              e.stopPropagation();
            } else if (e.key === 'Backspace') {
              const originalValue = lastFocusedInput.value || '';
              const cursorPosition = lastFocusedInput.selectionStart || originalValue.length;
              
              if (cursorPosition > 0) {
                const newValue = originalValue.substring(0, cursorPosition - 1) + 
                               originalValue.substring(cursorPosition);
                
                lastFocusedInput.value = newValue;
                lastFocusedInput.selectionStart = cursorPosition - 1;
                lastFocusedInput.selectionEnd = cursorPosition - 1;
                
                // Trigger input events
                lastFocusedInput.dispatchEvent(new Event('input', { bubbles: true }));
                lastFocusedInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Prevent the original event
                e.preventDefault();
                e.stopPropagation();
              }
            }
          } catch (error) {
            console.error('[KeyboardEventMonitor] Error redirecting keyboard event:', error.message);
          }
        }
      }
    };
    
    // Find all inputs and enhance them
    const enhanceInputs = () => {
      const inputElements = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      console.log(`[KeyboardEventMonitor] Enhancing ${inputElements.length} input elements`);
      
      inputElements.forEach(input => {
        // Skip inputs that are already enhanced or have very high z-index
        if (input.hasAttribute('data-enhanced') || 
            (input.style.zIndex && parseInt(input.style.zIndex) >= 99999)) {
          return;
        }
        
        // Apply critical styles
        input.style.pointerEvents = 'auto';
        input.style.position = 'relative';
        input.style.zIndex = '99999';
        input.setAttribute('data-enhanced', 'KeyboardEventMonitor');
        
        // Add special event listeners for monitoring
        input.addEventListener('focus', handleFocus);
        input.addEventListener('blur', handleBlur);
      });
    };
    
    // Set up global event listeners
    document.addEventListener('keydown', handleKeyEvent, true);
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);
    
    // Add debug button
    const debugButton = document.createElement('button');
    debugButton.textContent = 'Fix Keyboard Input';
    debugButton.setAttribute('data-debug-component', 'KeyboardEventMonitor');
    debugButton.style.position = 'fixed';
    debugButton.style.bottom = '10px';
    debugButton.style.left = '10px';
    debugButton.style.zIndex = '999999';
    debugButton.style.padding = '10px';
    debugButton.style.background = '#4caf50';
    debugButton.style.color = 'white';
    debugButton.style.border = 'none';
    debugButton.style.borderRadius = '4px';
    debugButton.addEventListener('click', enhanceInputs);
    document.body.appendChild(debugButton);
    
    // Enhance inputs immediately and periodically
    enhanceInputs();
    const intervalId = setInterval(enhanceInputs, 5000);
    
    // Cleanup function
    return () => {
      console.log('[KeyboardEventMonitor] Cleaning up event listeners');
      document.removeEventListener('keydown', handleKeyEvent, true);
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleBlur, true);
      document.removeEventListener('globalEventRedirectorHandled', handleGlobalRedirectorStart);
      
      clearInterval(intervalId);
      
      if (document.body.contains(debugButton)) {
        document.body.removeChild(debugButton);
      }
      
      // Reset enhanced attributes
      document.querySelectorAll('[data-enhanced="KeyboardEventMonitor"]').forEach(el => {
        if (el.hasAttribute('style') && el.style.zIndex === '99999') {
          el.style.zIndex = '';
        }
        el.removeAttribute('data-enhanced');
      });
      
      // Clear references
      lastFocusedInput = null;
    };
  }, []);
  
  return null; // No visual output
} 