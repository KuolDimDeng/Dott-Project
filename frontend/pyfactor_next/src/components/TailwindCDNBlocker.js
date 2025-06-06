'use client';

import { useEffect } from 'react';

export default function TailwindCDNBlocker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Block any attempts to load Tailwind CDN
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') {
              const src = node.src || node.href || '';
              if (src.includes('cdn.tailwindcss.com') || src.includes('tailwindcss.com')) {
                console.warn('⚠️ Blocked Tailwind CDN script/link in production:', src);
                node.remove();
              }
            }
          });
        });
      });

      observer.observe(document.head, {
        childList: true,
        subtree: true
      });

      // Also check existing scripts
      const scripts = document.querySelectorAll('script, link');
      scripts.forEach((script) => {
        const src = script.src || script.href || '';
        if (src.includes('cdn.tailwindcss.com') || src.includes('tailwindcss.com')) {
          console.warn('⚠️ Removed existing Tailwind CDN script/link:', src);
          script.remove();
        }
      });

      // Clean up on unmount
      return () => observer.disconnect();
    }
  }, []);

  return null;
}
