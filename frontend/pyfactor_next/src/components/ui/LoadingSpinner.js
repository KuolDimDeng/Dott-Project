'use client';

import React from 'react';

/**
 * Loading spinner component with size variants
 */
const getSpinnerSizeClass = (size) => {
  switch (size) {
    case 'small': return 'h-4 w-4';
    case 'large': return 'h-12 w-12';
    case 'medium':
    default: return 'h-8 w-8';
  }
};

const LoadingSpinner = ({ 
  size = "medium", 
  className = "", 
  text = "Loading...",
  showText = true
}) => {
  const sizeClass = getSpinnerSizeClass(size);
  const spinnerClass = `animate-spin rounded-full border-t-2 border-b-2 border-blue-500 mx-auto ${sizeClass} ${className}`;
  
  return (
    <div className="text-center">
      <div className={spinnerClass}></div>
      {showText && (
        <p className="mt-3 text-gray-500">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner; 