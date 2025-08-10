'use client';

import React, { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/providers/SessionTimeoutProvider';
import { useSessionContext } from '@/contexts/SessionContext';
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function SessionTimeoutModal() {
  const { isWarningVisible, timeRemaining, showFinalCountdown, cancelTimeout } = useSessionTimeout();
  const { logout } = useSessionContext();
  const [audioPlayed, setAudioPlayed] = useState(false);

  // Debug logging
  console.log('🔐 [SessionTimeoutModal] Component state', {
    isWarningVisible,
    timeRemaining: timeRemaining / 1000 + 's',
    showFinalCountdown,
    modalWillRender: isWarningVisible
  });

  // Format time for display
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Play warning sound when modal appears
  useEffect(() => {
    if (isWarningVisible && !audioPlayed) {
      // Play a subtle notification sound
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore if autoplay is blocked
      });
      setAudioPlayed(true);
    }
    
    if (!isWarningVisible) {
      setAudioPlayed(false);
    }
  }, [isWarningVisible, audioPlayed]);

  if (!isWarningVisible) return null;

  const handleStaySignedIn = async () => {
    try {
      // Get the current session token from localStorage or cookie
      const sessionToken = localStorage.getItem('sid') || 
                          document.cookie.split('; ').find(row => row.startsWith('sid='))?.split('=')[1];
      
      if (!sessionToken) {
        console.error('No session token found');
        await logout();
        window.location.href = '/auth/signin?error=no_session';
        return;
      }

      // Use PATCH method to refresh the session
      const response = await fetch('/api/auth/session-v2', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Failed to refresh session:', response.status);
        // If refresh fails, logout for security
        await logout();
        window.location.href = '/auth/signin?error=session_refresh_failed';
        return;
      }

      const data = await response.json();
      console.log('🔐 [SessionTimeoutModal] Session refreshed successfully', data);
      
      // Then cancel the timeout
      cancelTimeout();
      
      // Update last activity time
      localStorage.setItem('sessionTimeoutLastActivity', Date.now().toString());
      
      // Optional: Force a page refresh to ensure all components get the new session
      // Comment this out if you don't want a page refresh
      // setTimeout(() => {
      //   window.location.reload();
      // }, 100);
    } catch (error) {
      console.error('🔐 [SessionTimeoutModal] Error refreshing session:', error);
      // On error, logout for security
      await logout();
      window.location.href = '/auth/signin?error=session_refresh_failed';
    }
  };

  const handleSignOut = async () => {
    cancelTimeout();
    await logout();
    window.location.href = '/auth/signin';
  };

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`
          relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all
          ${showFinalCountdown ? 'animate-pulse' : ''}
          sm:my-8 sm:w-full sm:max-w-lg
        `}>
          {/* Warning Header */}
          <div className={`
            px-6 py-4 ${showFinalCountdown ? 'bg-red-50' : 'bg-yellow-50'}
          `}>
            <div className="flex items-center">
              {showFinalCountdown ? (
                <ClockIcon className="h-6 w-6 text-red-600 animate-spin" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              )}
              <h3 className={`
                ml-3 text-lg font-medium
                ${showFinalCountdown ? 'text-red-900' : 'text-yellow-900'}
              `}>
                {showFinalCountdown ? 'Signing out soon!' : "Looks like you've been away for a while"}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="text-center">
              {/* Large Countdown Display */}
              <div className={`
                text-5xl font-bold mb-4
                ${showFinalCountdown ? 'text-red-600 animate-pulse' : 'text-gray-900'}
              `}>
                {formatTime(timeRemaining)}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                As a security precaution, you will be signed out in {formatTime(timeRemaining)}
              </p>
              
              {!showFinalCountdown && (
                <p className="text-sm text-gray-500">
                  Remember to save anything you're working on.
                </p>
              )}

              {showFinalCountdown && (
                <p className="text-sm font-medium text-red-600 animate-pulse">
                  Final countdown!
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:space-x-reverse sm:space-x-3">
            <button
              type="button"
              onClick={handleStaySignedIn}
              className={`
                inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm sm:w-auto
                ${showFinalCountdown 
                  ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-2 
                ${showFinalCountdown ? 'focus:ring-green-500' : 'focus:ring-blue-500'}
              `}
            >
              {showFinalCountdown ? 'Stay Signed In!' : 'Back to Dott'}
            </button>
            
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Sign Out
            </button>
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div 
              className={`
                h-full transition-all duration-1000
                ${showFinalCountdown ? 'bg-red-600' : 'bg-yellow-500'}
              `}
              style={{ 
                width: `${(timeRemaining / (showFinalCountdown ? 10000 : 60000)) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}