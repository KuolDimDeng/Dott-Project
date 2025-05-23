import React from 'react';

const LoadingSpinner = ({ 
  size = 'md',
  color = 'blue',
  className = '',
  ...props 
}) => {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
    purple: 'border-purple-600'
  };

  return (
    <div 
      className={`inline-block animate-spin rounded-full border-4 border-gray-200 border-t-transparent ${sizes[size]} ${colors[color]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner; 