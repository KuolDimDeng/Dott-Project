'use client';

import React from 'react';

const Button = ({ 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  children,
  onClick,
  ...props 
}) => {
  let baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size variants
  if (size === 'small') {
    baseClasses += ' px-3 py-1.5 text-sm';
  } else if (size === 'large') {
    baseClasses += ' px-6 py-3 text-lg';
  } else {
    baseClasses += ' px-4 py-2 text-base';
  }
  
  // Color variants
  if (variant === 'primary') {
    baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
  } else if (variant === 'secondary') {
    baseClasses += ' bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
  } else if (variant === 'danger') {
    baseClasses += ' bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
  } else if (variant === 'outline') {
    baseClasses += ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500';
  }
  
  // Disabled state
  if (disabled || loading) {
    baseClasses += ' opacity-50 cursor-not-allowed';
  }
  
  return (
    <button
      className={`${baseClasses} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m15.84 7.02.707.707-1.414 1.414-.707-.707z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export { Button };
