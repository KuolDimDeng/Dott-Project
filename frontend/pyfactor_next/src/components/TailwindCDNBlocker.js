'use client';


import { useEffect } from 'react';

/**
 * TailwindCDNBlocker component
 * 
 * Detects and blocks any attempts to load Tailwind from CDN in production
 * to prevent the warning: "cdn.tailwindcss.com should not be used in production"
 */
export default function TailwindCDNBlocker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Function to check and remove Tailwind CDN scripts/links
      const removeTailwindCDN = () => {
        const elements = document.querySelectorAll('script, link');
        elements.forEach((el) => {
          const src = el.src || el.href || '';
          if (src.includes('cdn.tailwindcss.com') || 
              (src.includes('tailwindcss') && src.includes('.cdn'))) {
            console.warn('⚠️ Removing Tailwind CDN:', src);
            el.parentNode?.removeChild(el);
          }
        });
      };
      
      // Remove existing CDN links
      removeTailwindCDN();
      
      // Set up observer to catch dynamically added elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            removeTailwindCDN();
          }
        });
      });
      
      // Start observing
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      
      // Cleanup
      return () => observer.disconnect();
    }
  }, []);
  
  return null;
}
