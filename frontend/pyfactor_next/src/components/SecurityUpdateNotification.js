'use client';

/**
 * Security Update Notification - Informs users to re-login after security updates
 */

import { useEffect, useState } from 'react';

export default function SecurityUpdateNotification() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already seen this notification
    const hasSeenUpdate = localStorage.getItem('security-update-2025-08-10');
    
    // Show notification if user hasn't seen it and there are session issues
    if (!hasSeenUpdate) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    // Mark as seen and redirect to login
    localStorage.setItem('security-update-2025-08-10', 'seen');
    setShow(false);
    
    // Clear all session data and redirect
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies by setting them to expired
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    window.location.href = '/auth/signin';
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 rounded-full p-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">🔒 Security Update Complete</h3>
            <p className="text-sm opacity-90">
              We've upgraded our security system. Please log in again to continue accessing your account.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Re-login Now
        </button>
      </div>
    </div>
  );
}