'use client';

import React, { useEffect, useState } from 'react';

export default function LoadingSpinner({
  size = 'medium',
  text = '',
  showProgress = false,
  progress = 0,
  status = 'loading',
  color = 'primary'
}) {
  // Internal state for smoothly animated progress
  const [animatedProgress, setAnimatedProgress] = useState(progress);
  
  // Smoothly animate to the target progress value
  useEffect(() => {
    // If animatedProgress is less than actual progress, gradually catch up
    if (animatedProgress < progress) {
      const diff = progress - animatedProgress;
      // Faster animation with larger increments
      const increment = Math.max(2, Math.min(Math.floor(diff / 2), 8)); 
      
      const timer = setTimeout(() => {
        setAnimatedProgress(prev => Math.min(progress, prev + increment));
      }, 30); // Faster animation with 30ms timeout instead of 50ms
      
      return () => clearTimeout(timer);
    }
    
    // Snap to 100% immediately for completed state
    if (progress >= 100) {
      setAnimatedProgress(100);
      return;
    }
    
    // When progress is very high, quickly animate to completion
    if (progress >= 92) {
      // After just 1 second at 92%+, snap to 100%
      const completeTimer = setTimeout(() => {
        setAnimatedProgress(100);
      }, 1000);
      
      return () => clearTimeout(completeTimer);
    }
    
    // For high progress (>= 90%), animate faster to avoid perception of being stuck
    if (progress >= 90 && animatedProgress < progress) {
      const diff = progress - animatedProgress;
      // Faster animation with larger increments for high progress
      const increment = Math.max(3, Math.min(Math.floor(diff / 1.5), 10)); 
      
      const timer = setTimeout(() => {
        setAnimatedProgress(prev => Math.min(progress, prev + increment));
      }, 20); // Even faster animation at high progress levels
      
      return () => clearTimeout(timer);
    }
  }, [progress, animatedProgress]);
  
  // Normalize progress value for display
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(animatedProgress)));
  
  // Determine spinner size classes
  const sizeClasses = {
    small: 'h-5 w-5',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };
  
  // Determine text size classes
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  // Determine color classes
  const colorClasses = {
    primary: 'text-primary-main',
    blue: 'text-blue-500',
    gray: 'text-gray-400',
    white: 'text-white'
  };

  // SVG animation based on status
  const getAnimationClass = () => {
    switch(status) {
      case 'complete':
        return 'animate-success';
      case 'error':
        return 'animate-error';
      default:
        return 'animate-spin';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        className={`${sizeClasses[size] || sizeClasses.medium} ${colorClasses[color] || colorClasses.primary} ${getAnimationClass()}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      
      {text && (
        <div className={`mt-2 ${textSizeClasses[size] || textSizeClasses.medium} text-gray-600`}>
          {text}
          {showProgress && normalizedProgress > 0 && (
            <span className="font-medium ml-1 transition-all duration-300 ease-in-out">
              ({normalizedProgress}%)
            </span>
          )}
        </div>
      )}
      
      {showProgress && !text && normalizedProgress > 0 && (
        <div className={`mt-2 ${textSizeClasses[size] || textSizeClasses.medium} text-gray-600 font-medium transition-all duration-300 ease-in-out`}>
          {normalizedProgress}%
        </div>
      )}
      
      {showProgress && normalizedProgress > 0 && (
        <div className="w-full mt-3 bg-gray-200 rounded-full h-2 max-w-[150px]">
          <div 
            className="h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ 
              width: `${normalizedProgress}%`,
              backgroundColor: status === 'error' ? '#ef4444' : 
                              status === 'complete' ? '#10b981' : 
                              '#4f46e5'
            }}
          ></div>
        </div>
      )}
    </div>
  );
}