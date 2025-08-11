'use client';

import React, { useState, useEffect } from 'react';
import POSSystemInline from './POSSystemInline';
import SecureMobilePOS from './SecureMobilePOS';

/**
 * Wrapper component for POSSystem to be used in routing
 * Automatically detects mobile devices and uses SecureMobilePOS for enhanced security
 */
const POSSystemWrapper = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect if running on mobile device or PWA
    const checkMobileDevice = () => {
      // Check user agent for mobile devices
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      
      // Check if running as PWA (standalone mode)
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true;
      
      // Check screen size
      const isMobileScreen = window.innerWidth <= 768;
      
      // Check for touch support
      const hasTouchSupport = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 ||
                             navigator.msMaxTouchPoints > 0;
      
      // Use SecureMobilePOS if any mobile indicator is true
      const shouldUseMobilePOS = isMobileUserAgent || isPWA || (isMobileScreen && hasTouchSupport);
      
      setIsMobile(shouldUseMobilePOS);
      setIsLoading(false);
      
      // Log detection results for debugging
      console.log('[POSSystemWrapper] Mobile Detection:', {
        userAgent: isMobileUserAgent,
        isPWA,
        screenSize: isMobileScreen,
        touchSupport: hasTouchSupport,
        result: shouldUseMobilePOS ? 'Mobile POS' : 'Desktop POS'
      });
    };

    checkMobileDevice();
    
    // Re-check on resize
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  // Show loading while detecting device type
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Use SecureMobilePOS for mobile devices, regular POS for desktop
  if (isMobile) {
    console.log('[POSSystemWrapper] Loading SecureMobilePOS for mobile device');
    return <SecureMobilePOS />;
  }

  console.log('[POSSystemWrapper] Loading POSSystemInline for desktop');
  return <POSSystemInline />;
};

export default POSSystemWrapper;