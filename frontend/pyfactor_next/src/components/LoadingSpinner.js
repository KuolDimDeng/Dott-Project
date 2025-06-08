'use client';


import React from 'react';

/**
 * LoadingSpinner component
 * Displays a customizable loading spinner
 * 
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner ('small', 'medium', 'large')
 * @param {boolean} [props.fullscreen=false] - Whether to display the spinner fullscreen
 * @param {string} [props.message='Loading...'] - Message to display below the spinner
 * @param {string} [props.color='currentColor'] - Color of the spinner
 */
export default function LoadingSpinner({ 
  size = 'medium', 
  fullscreen = false,
  message = 'Loading...',
  color = 'currentColor'
}) {
  // Size mapping for spinner
  const sizeMap = {
    small: {
      spinner: 'h-4 w-4',
      text: 'text-sm'
    },
    medium: {
      spinner: 'h-8 w-8',
      text: 'text-base'
    },
    large: {
      spinner: 'h-12 w-12',
      text: 'text-lg'
    }
  };

  // Get size class or default to medium
  const sizeClass = sizeMap[size] || sizeMap.medium;

  // Container classes
  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80'
    : 'flex flex-col items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className={`${sizeClass.spinner} animate-spin`} style={{ color }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="opacity-25"
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
        </div>
        
        {/* Message (if provided) */}
        {message && (
          <div className={`mt-3 ${sizeClass.text} text-gray-700`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}