'use client';


import React, { useEffect } from 'react';

/**
 * Optimized KeyboardEventFixer that reduces browser performance impact
 * while still fixing keyboard input issues
 */
export default function KeyboardEventFixer() {
  useEffect(() => {
    console.log('KeyboardEventFixer mounted');
    
    // Throttling mechanism
    let lastFixTime = 0;
    const THROTTLE_MS = 100; // Only run fixes every 100ms at most
    
    // Track focused input element
    let focusedInput = null;
    let isFixActive = true;
    
    // Create a toggle function that can be used for debugging
    window.toggleInputFix = (enabled) => {
      isFixActive = enabled !== undefined ? enabled : !isFixActive;
      console.log(`Input fix is now ${isFixActive ? 'enabled' : 'disabled'}`);
      document.body.setAttribute('data-keyboard-fixer', isFixActive ? 'active' : 'disabled');
      return isFixActive;
    };
    
    // Track the focused element - this is more efficient than overriding addEventListener
    const focusHandler = (e) => {
      const tagName = e.target.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || 
          e.target.contentEditable === 'true' || e.target.role === 'textbox') {
        focusedInput = e.target;
      }
    };
    
    const blurHandler = () => {
      focusedInput = null;
    };
    
    // Listen for focus/blur events
    document.addEventListener('focusin', focusHandler);
    document.addEventListener('focusout', blurHandler);
    
    // Create an optimized keydown handler
    const documentKeyHandler = (e) => {
      // Skip processing if fix is disabled or no input is focused
      if (!isFixActive || !focusedInput || e.__redirected) return;
      
      // Check if focusedInput is still in the DOM
      if (!document.contains(focusedInput)) {
        focusedInput = null;
        return;
      }
      
      // Throttle processing to avoid performance issues
      const now = Date.now();
      if (now - lastFixTime < THROTTLE_MS) return;
      lastFixTime = now;
      
      // Only handle basic text input keys
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || 
          e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
          e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'Home' || e.key === 'End' || 
          e.key === 'Tab' || e.key === 'Enter' || 
          e.key === 'Escape') {
        
        // Only for text inputs, use direct value manipulation for better performance
        if (e.key.length === 1 && 
            (focusedInput.tagName.toLowerCase() === 'input' || 
             focusedInput.tagName.toLowerCase() === 'textarea')) {
          
          try {
            // Safety check before manipulating the input
            if (!focusedInput || !focusedInput.isConnected) {
              focusedInput = null;
              return;
            }
            
            const start = focusedInput.selectionStart || 0;
            const end = focusedInput.selectionEnd || 0;
            const value = focusedInput.value || '';
            
            // Simulate typing by manually updating the input value
            const newValue = value.substring(0, start) + e.key + value.substring(end);
            focusedInput.value = newValue;
            
            // Set cursor position
            if (focusedInput && focusedInput.isConnected) {
              focusedInput.selectionStart = start + 1;
              focusedInput.selectionEnd = start + 1;
            }
            
            // Trigger change event - use InputEvent when possible for better React compatibility
            if (focusedInput && focusedInput.isConnected) {
              if (typeof InputEvent === 'function') {
                const inputEvent = new InputEvent('input', { bubbles: true });
                focusedInput.dispatchEvent(inputEvent);
              } else {
                const changeEvent = new Event('input', { bubbles: true });
                focusedInput.dispatchEvent(changeEvent);
              }
            }
          } catch (error) {
            console.warn('KeyboardEventFixer: Error setting input properties', error);
            // The input is no longer usable, clear our reference
            focusedInput = null;
          }
          
          // Prevent the original event
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    // Listen for keydown but only in capture phase to ensure we can fix keyboard events
    document.addEventListener('keydown', documentKeyHandler, true);
    
    // Create style element for fixed inputs, but more targeted
    const style = document.createElement('style');
    style.textContent = `
      /* Better input visibility */
      input:focus, textarea:focus, select:focus {
        z-index: 2000 !important;
        position: relative !important;
        pointer-events: auto !important;
        outline: 2px solid #4285f4 !important;
      }
      
      /* Make Drawer backdrop better behaved */
      .MuiBackdrop-root {
        pointer-events: none !important;
      }
      
      /* Add visual indicator that the fix is running */
      body[data-keyboard-fixer="active"] .emergency-form input:focus,
      body[data-keyboard-fixer="active"] .emergency-form textarea:focus {
        outline: 2px solid #4CAF50 !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
    
    // Mark the body to indicate fix is active
    document.body.setAttribute('data-keyboard-fixer', 'active');
    
    return () => {
      // Clean up
      document.removeEventListener('focusin', focusHandler);
      document.removeEventListener('focusout', blurHandler);
      document.removeEventListener('keydown', documentKeyHandler, true);
      
      // Remove style
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
      
      // Remove DOM attribute
      document.body.removeAttribute('data-keyboard-fixer');
      
      // Remove global toggle
      delete window.toggleInputFix;
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}