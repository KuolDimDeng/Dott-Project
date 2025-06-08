// UnoptimizedImage.js - Wrapper for Next.js Image component with optimization disabled
import React from 'react';
import Image from 'next/image';

/**
 * UnoptimizedImage component
 * 
 * A wrapper around Next.js Image component that sets unoptimized=true by default
 * to avoid image optimization issues when running in development with HTTPS.
 * 
 * This component is a drop-in replacement for Next.js Image component.
 */
const UnoptimizedImage = ({
  src,
  alt,
  width,
  height,
  unoptimized = true, // Default to unoptimized
  ...props
}) => {
  return (
    <Image
      src={src}
      alt={alt || 'Image'}
      width={width || 0}
      height={height || 0}
      unoptimized={unoptimized}
      {...props}
    />
  );
};

export default UnoptimizedImage; 