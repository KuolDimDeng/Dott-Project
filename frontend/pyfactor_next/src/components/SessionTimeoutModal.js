'use client';

import React, { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/providers/SessionTimeoutProvider';
import { useSessionContext } from '@/contexts/SessionContext';
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SessionTimeoutModal() {
  const { 
    warningLevel, 
    timeRemaining, 
    isInGracePeriod, 
    cancelTimeout,
    extendSession,
    currentTimeout 
  } = useSessionTimeout();
  const { logout } = useSessionContext();
  const [audioPlayed, setAudioPlayed] = useState(false);

  // Format time for display
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  // Play warning sound for urgent/final warnings
  useEffect(() => {
    if ((warningLevel === 'urgent' || warningLevel === 'final') && !audioPlayed) {
      // Only play sound for urgent warnings, not first warning
      const audio = new Audio('/notification.mp3');
      audio.volume = warningLevel === 'final' ? 0.5 : 0.3;
      audio.play().catch(() => {
        // Ignore if autoplay is blocked
      });
      setAudioPlayed(true);
    }
    
    if (!warningLevel) {
      setAudioPlayed(false);
    }
  }, [warningLevel, audioPlayed]);

  // Don't show modal for first warning (handled by toast notification)
  if (!warningLevel || warningLevel === 'first') return null;

  const handleStaySignedIn = async () => {
    try {
      // Get the current session token
      const sessionToken = localStorage.getItem('sid') || 
                          document.cookie.split('; ').find(row => row.startsWith('sid='))?.split('=')[1];
      
      if (!sessionToken) {
        console.error('No session token found');
        await logout();
        window.location.href = '/auth/signin?error=no_session';
        return;
      }

      // Refresh the session
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
        alert('Unable to extend your session. Please try again or sign out.');
        return;
      }

      const data = await response.json();
      console.log('Session refreshed successfully', data);
      
      // Use the new extendSession method
      extendSession();
      
    } catch (error) {
      console.error('Error refreshing session:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth/signin';
    }
  };

  // Determine modal styling based on warning level
  const getModalStyling = () => {
    if (warningLevel === 'final' || isInGracePeriod) {
      return {
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-600',
        titleColor: 'text-red-900',
        icon: ExclamationTriangleIcon
      };
    }
    
    return {
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      icon: ClockIcon
    };
  };

  const styling = getModalStyling();
  const Icon = styling.icon;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-[99998]"
        onClick={(e) => e.preventDefault()} // Prevent closing on backdrop click
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]">
        <div 
          className={`
            bg-white rounded-lg shadow-2xl max-w-md w-full 
            border-2 ${styling.borderColor} 
            transform transition-all duration-300 scale-100
            ${warningLevel === 'final' ? 'animate-pulse' : ''}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeout-modal-title"
        >
          {/* Header */}
          <div className={`p-6 ${styling.bgColor} rounded-t-lg`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${styling.iconColor}`}>
                <Icon className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h3 
                  id="timeout-modal-title"
                  className={`text-lg font-semibold ${styling.titleColor}`}
                >
                  {isInGracePeriod 
                    ? 'Signing Out...' 
                    : warningLevel === 'final' 
                      ? 'Session Expiring Soon!' 
                      : 'Your Session Will Expire'}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {isInGracePeriod
                    ? 'You can still cancel the logout'
                    : 'You\'ve been inactive for a while'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-6">
            {/* Time remaining display */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-900">
                {formatTime(timeRemaining)}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {isInGracePeriod
                  ? 'Click cancel to stay signed in'
                  : 'Until automatic sign out'}
              </p>
            </div>
            
            {/* Additional information */}
            {!isInGracePeriod && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  For security, we automatically sign you out after{' '}
                  <span className="font-semibold">
                    {currentTimeout / 1000 / 60} minutes
                  </span>{' '}
                  of inactivity. Click "Stay Signed In" to continue working.
                </p>
              </div>
            )}
            
            {/* Progress bar for visual feedback */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className={`
                  h-2 rounded-full transition-all duration-1000
                  ${warningLevel === 'final' ? 'bg-red-600' : 'bg-yellow-500'}
                `}
                style={{ 
                  width: `${Math.max(
                    5, 
                    (timeRemaining / (warningLevel === 'final' ? 30000 : 180000)) * 100
                  )}%` 
                }}
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStaySignedIn}
                className={`
                  flex-1 px-4 py-3 rounded-lg font-medium text-white
                  transition-all duration-200 transform hover:scale-105
                  ${warningLevel === 'final' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${warningLevel === 'final' 
                    ? 'focus:ring-red-500' 
                    : 'focus:ring-blue-500'}
                `}
              >
                <CheckCircleIcon className="inline-block w-5 h-5 mr-2" />
                {isInGracePeriod ? 'Cancel Logout' : 'Stay Signed In'}
              </button>
              
              {!isInGracePeriod && (
                <button
                  onClick={handleSignOut}
                  className="
                    flex-1 px-4 py-3 rounded-lg font-medium
                    bg-gray-200 text-gray-700 hover:bg-gray-300
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                  "
                >
                  Sign Out Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}