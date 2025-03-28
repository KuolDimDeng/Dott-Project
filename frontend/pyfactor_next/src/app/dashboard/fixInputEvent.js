'use client';

import React, { useEffect } from 'react';

/**
 * This component targets the specific issue with the MUI Drawer 
 * blocking input events - optimized for performance
 */
export default function FixInputEvent() {
  useEffect(() => {
    // Track processed elements to avoid duplicating work
    const processedElements = new WeakSet();
    let isProcessing = false;
    
    // Throttled function to apply fixes
    const applyForcefulFix = () => {
      // Prevent concurrent processing
      if (isProcessing) return;
      isProcessing = true;
      
      // Target only emergency form inputs to minimize performance impact
      const inputElements = document.querySelectorAll('.emergency-form input, .emergency-form textarea, .emergency-form select');
      
      inputElements.forEach(input => {
        // Skip already processed elements
        if (processedElements.has(input)) return;
        processedElements.add(input);
        
        // Apply style directly to the input element - only once
        input.style.cssText += `
          position: relative !important;
          z-index: 9999 !important;
          pointer-events: auto !important;
          background-color: white !important;
          visibility: visible !important;
          opacity: 1 !important;
        `;
        
        // Add minimal event handlers to each input - only once
        if (!input.getAttribute('data-fixed')) {
          input.setAttribute('data-fixed', 'true');
          
          // Simplified event handling
          const stopEvents = (e) => {
            e.stopPropagation();
          };
          
          // Only add critical event listeners
          input.addEventListener('keydown', stopEvents, true);
          input.addEventListener('input', stopEvents, true);
        }
      });
      
      isProcessing = false;
    };
    
    // One-time MUI fix targeting only the elements that need it
    const fixMuiComponents = () => {
      // Target only visible MUI Drawer components
      const overlayElements = document.querySelectorAll('.MuiDrawer-root');
      
      overlayElements.forEach(overlay => {
        const backdropElement = overlay.querySelector('.MuiBackdrop-root');
        if (backdropElement) {
          backdropElement.style.pointerEvents = 'none';
        }
      });
    };
    
    // Apply fixes once at the beginning
    applyForcefulFix();
    fixMuiComponents();
    
    // Create a more efficient observer with limited scope
    const observer = new MutationObserver((mutations) => {
      // Check if any mutations affect the emergency form
      const hasRelevantChanges = mutations.some(mutation => {
        // Check if target or parent has emergency-form class
        const isEmergencyForm = 
          mutation.target.classList?.contains('emergency-form') || 
          mutation.target.closest?.('.emergency-form');
        
        // Check if mutation involves MUI Drawer
        const isMuiDrawer = 
          mutation.target.classList?.contains('MuiDrawer-root') || 
          mutation.target.closest?.('.MuiDrawer-root');
        
        return isEmergencyForm || isMuiDrawer;
      });
      
      // Only process if relevant changes detected
      if (hasRelevantChanges) {
        // Throttle processing with requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          applyForcefulFix();
          fixMuiComponents();
        });
      }
    });
    
    // Start observing with more targeted approach - observe only relevant containers
    const emergencyForm = document.querySelector('.emergency-form');
    if (emergencyForm) {
      observer.observe(emergencyForm, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
    
    // Also observe drawer container
    const drawerContainer = document.querySelector('.MuiDrawer-root');
    if (drawerContainer) {
      observer.observe(drawerContainer, {
        childList: true,
        subtree: false,
        attributes: false
      });
    }
    
    // Create and inject minimal CSS fixes
    const style = document.createElement('style');
    style.textContent = `
      /* Target only emergency form inputs */
      .emergency-form input,
      .emergency-form textarea,
      .emergency-form select {
        position: relative !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
      }
      
      /* Ensure the drawer doesn't block emergency form inputs */
      .MuiDrawer-paper ~ .emergency-form input,
      .MuiDrawer-paper ~ .emergency-form textarea,
      .MuiDrawer-paper ~ .emergency-form select {
        z-index: 9999 !important;
      }
    `;
    
    document.head.appendChild(style);
    
    // Return cleanup function
    return () => {
      observer.disconnect();
      
      // Remove the style element
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);
  
  return null;
}