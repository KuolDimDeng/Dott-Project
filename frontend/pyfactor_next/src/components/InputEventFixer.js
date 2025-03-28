import React, { useEffect, useRef } from 'react';

/**
 * InputEventFixer Component - SIMPLIFIED VERSION
 * 
 * This component is used to fix input field issues in forms by ensuring 
 * that inputs can properly receive events and focus.
 * 
 * Usage:
 * Wrap your form or section with input fields in this component:
 * <InputEventFixer>
 *   <YourFormOrComponent />
 * </InputEventFixer>
 */
const InputEventFixer = ({ children }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Function to process and fix all input elements within the container
    const fixInputElements = () => {
      // Find all input-related elements
      const inputElements = containerRef.current.querySelectorAll(
        'input, textarea, select, .MuiInputBase-root, .MuiOutlinedInput-input, .MuiFilledInput-input'
      );
      
      // Apply fixes to each element
      inputElements.forEach(el => {
        // Override any pointer-events: none
        el.style.pointerEvents = 'auto';
        
        // Ensure proper z-index and positioning
        el.style.position = 'relative';
        el.style.zIndex = '1000';
      });
    };
    
    // Fix inputs immediately
    fixInputElements();
    
    // Click handler to ensure inputs can be focused when clicked
    const clickHandler = (e) => {
      // If the clicked element is an input, ensure it's focused
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT') {
        e.target.focus();
      }
    };
    
    // Add click handler to container
    containerRef.current.addEventListener('click', clickHandler, true);
    
    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', clickHandler, true);
      }
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative',
        width: '100%', 
        height: '100%',
        // Create stacking context to ensure z-index works as expected
        zIndex: 1,
        // Allow for proper event propagation
        pointerEvents: 'auto'
      }}
    >
      {children}
    </div>
  );
};

export default InputEventFixer; 