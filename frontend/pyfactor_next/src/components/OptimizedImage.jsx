import React from 'react';
import Image from 'next/image';
import UnoptimizedImage from './UnoptimizedImage';

/**
 * OptimizedImage component
 * 
 * This component automatically uses the right image component based on environment.
 * - In development or HTTPS, it uses UnoptimizedImage to avoid image optimization issues
 * - In production with HTTP, it uses the standard Next.js Image with optimization
 * 
 * This is a drop-in replacement for Next.js Image component.
 */
const OptimizedImage = (props) => {
  // Always use UnoptimizedImage for now to ensure images work properly
  return <UnoptimizedImage {...props} />;
};

export default OptimizedImage; 