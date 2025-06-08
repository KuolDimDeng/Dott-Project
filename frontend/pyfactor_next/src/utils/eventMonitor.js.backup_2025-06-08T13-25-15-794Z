'use client';

/**
 * Event debugging utility that works with React state updates
 */

// Core function to trace inputs and key events
export function setupInputMonitoring() {
  if (typeof document === 'undefined') return () => {};
  
  console.log('[InputDebug] Setting up one-time input monitoring');
  
  // Setup listeners using a proxy approach
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  
  // Create a new version that logs key events
  EventTarget.prototype.addEventListener = function(type, handler, options) {
    if (type === 'keydown' || type === 'keyup' || type === 'input') {
      console.log(`[EventDebug] addEventListener called for ${type} on ${this.tagName || this.toString()}`);
      
      // Replace the handler with a wrapper that logs
      const wrappedHandler = function(event) {
        console.log(`[EventDebug] ${type} event on ${event.target.tagName || 'unknown'}`);
        
        // Call the original handler
        return handler.apply(this, arguments);
      };
      
      // Store reference to original handler
      wrappedHandler._originalHandler = handler;
      
      // Call the original addEventListener with our wrapped handler
      return originalAddEventListener.call(this, type, wrappedHandler, options);
    }
    
    // For other events, just use the original
    return originalAddEventListener.call(this, type, handler, options);
  };
  
  // Replace removeEventListener to match wrapped handlers
  EventTarget.prototype.removeEventListener = function(type, handler, options) {
    if (type === 'keydown' || type === 'keyup' || type === 'input') {
      console.log(`[EventDebug] removeEventListener called for ${type}`);
    }
    
    return originalRemoveEventListener.call(this, type, handler, options);
  };
  
  // Capture immediate input results
  document.addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      console.log(`[InputTracking] Input event on ${e.target.name || e.target.id || 'unnamed'}: ${e.target.value}`);
    }
  }, true);
  
  // Return cleanup function
  return function cleanup() {
    EventTarget.prototype.addEventListener = originalAddEventListener;
    EventTarget.prototype.removeEventListener = originalRemoveEventListener;
    console.log('[InputDebug] Removed input monitoring');
  };
}

// Test function to create a simple input and monitor it
export function createTestInput() {
  if (typeof document === 'undefined') return;
  
  // Remove any existing test input
  const existingInput = document.getElementById('debug-test-input-container');
  if (existingInput) {
    document.body.removeChild(existingInput);
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = 'debug-test-input-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 2px solid red;
    padding: 10px;
    z-index: 10000;
    width: 300px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  `;
  
  // Create input
  const input = document.createElement('input');
  input.id = 'debug-test-input';
  input.type = 'text';
  input.placeholder = 'Type here to test input';
  input.style.cssText = `
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    margin-bottom: 10px;
  `;
  
  // Create output display
  const output = document.createElement('div');
  output.id = 'debug-test-output';
  output.style.cssText = `
    border: 1px solid #ddd;
    padding: 5px;
    background: #f5f5f5;
    min-height: 20px;
    max-height: 100px;
    overflow-y: auto;
    margin-bottom: 10px;
    font-family: monospace;
    font-size: 12px;
  `;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background: #f44336;
    color: white;
    border: none;
    padding: 5px 10px;
    cursor: pointer;
  `;
  
  // Add event listeners
  input.addEventListener('keydown', (e) => {
    console.log(`[TestInput] KeyDown: ${e.key}`);
  });
  
  input.addEventListener('input', (e) => {
    output.textContent = e.target.value;
    console.log(`[TestInput] Input value: ${e.target.value}`);
  });
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(container);
  });
  
  // Assemble
  container.appendChild(input);
  container.appendChild(output);
  container.appendChild(closeButton);
  document.body.appendChild(container);
  
  // Focus the input
  setTimeout(() => {
    input.focus();
  }, 100);
}

export default {
  setupInputMonitoring,
  createTestInput
};