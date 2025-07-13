'use client';

/**
 * Handle chunk loading errors by forcing a hard reload
 * This fixes issues where old chunks are cached but no longer exist
 */
export const setupChunkErrorHandler = () => {
  if (typeof window === 'undefined') return;

  // Listen for unhandled promise rejections (chunk loading errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // Check if it's a chunk loading error
    if (
      error &&
      error.name === 'ChunkLoadError' ||
      (error.message && error.message.includes('Loading chunk')) ||
      (error.message && error.message.includes('Loading CSS chunk')) ||
      (error.message && error.message.includes('failed'))
    ) {
      console.warn('🔄 Chunk loading error detected, reloading page:', error.message);
      
      // Prevent the error from being logged to console
      event.preventDefault();
      
      // Force hard reload to clear cache and load new chunks
      window.location.reload();
    }
  });

  // Also handle script loading errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    const target = event.target;
    
    // Handle script loading errors
    if (target && target.tagName === 'SCRIPT' && event.message.includes('Loading chunk')) {
      console.warn('🔄 Script chunk loading error detected, reloading page');
      window.location.reload();
    }
    
    // Handle general chunk errors
    if (error && error.message && error.message.includes('Loading chunk')) {
      console.warn('🔄 Chunk loading error detected, reloading page:', error.message);
      window.location.reload();
    }
  });

  console.log('✅ Chunk error handler initialized');
};

/**
 * Clear service worker cache to prevent chunk loading issues
 */
export const clearServiceWorkerCache = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('🧹 Service worker unregistered');
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('🧹 Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }
    
    console.log('✅ All caches cleared');
  } catch (error) {
    console.warn('⚠️ Error clearing service worker cache:', error);
  }
};