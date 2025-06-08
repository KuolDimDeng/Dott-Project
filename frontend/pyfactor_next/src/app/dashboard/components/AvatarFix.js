'use client';


import React from 'react';

/**
 * Enhanced Avatar component that only shows initials when they are available
 * This component uses Tailwind CSS for styling
 */
const EnhancedAvatar = ({ initials, userData, sx, ...props }) => {
  // Only show initials if both userData and initials are available
  const shouldShowInitials = userData && initials;
  
  // Extract style properties from sx prop for compatibility
  const bgColor = sx?.bgcolor || 'bg-primary-main';
  const textColor = sx?.color || 'text-white';
  const width = sx?.width ? `w-${sx.width/4}` : 'w-8';
  const height = sx?.height ? `h-${sx.height/4}` : 'h-8';
  const fontSize = sx?.fontSize || 'text-sm';
  
  return (
    <div 
      className={`${width} ${height} rounded-full ${bgColor} ${textColor} flex items-center justify-center ${fontSize} font-medium border-2 border-white`}
      {...props}
    >
      {shouldShowInitials ? initials : ''}
    </div>
  );
};

export default EnhancedAvatar;