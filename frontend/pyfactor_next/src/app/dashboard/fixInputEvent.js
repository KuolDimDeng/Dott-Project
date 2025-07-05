'use client';


import React from 'react';

/**
 * Simplified version of FixInputEvent that doesn't rely on DOM manipulation
 * to avoid causing chunk loading errors
 */
export default function FixInputEvent() {
  // Return an empty fragment with some basic CSS that can be statically rendered
  return (
    <style jsx global>{`
      .emergency-form input,
      .emergency-form textarea,
      .emergency-form select {
        position: relative !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
      }
      
      .MuiDrawer-root .MuiBackdrop-root {
        pointer-events: none;
      }
    `}</style>
  );
}