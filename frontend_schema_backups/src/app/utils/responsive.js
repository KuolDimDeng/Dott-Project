/**
 * Responsive Utilities for the Pyfactor Application
 * 
 * This file provides consistent breakpoint definitions and responsive utilities
 * that can be used throughout the application.
 */

// Breakpoint definitions (matching MUI defaults for consistency)
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536
};

/**
 * Creates media query string for CSS-in-JS
 * @param {string} key - The breakpoint key (xs, sm, md, lg, xl)
 * @param {string} direction - 'up' or 'down'
 * @returns {string} The media query string
 */
export const createMediaQuery = (key, direction = 'up') => {
  const value = breakpoints[key];
  
  if (!value && value !== 0) {
    console.error(`Invalid breakpoint key: ${key}`);
    return '';
  }
  
  if (direction === 'up') {
    return `@media (min-width: ${value}px)`;
  } else if (direction === 'down') {
    // For 'down' direction, we use the next breakpoint - 0.05px
    // If it's the largest breakpoint (xl), we use Infinity
    const nextBreakpointKey = Object.keys(breakpoints).find(
      (bpKey) => breakpoints[bpKey] > value
    );
    const nextValue = nextBreakpointKey 
      ? breakpoints[nextBreakpointKey] - 0.05 
      : Infinity;
    
    return nextValue === Infinity 
      ? `@media (max-width: ${value}px)` 
      : `@media (max-width: ${nextValue}px)`;
  }
  
  return '';
};

/**
 * Creates responsive styles for different breakpoints
 * @param {string} property - The CSS property to set
 * @param {Object} values - Object with breakpoint keys and values
 * @returns {Object} Object with media queries
 * 
 * @example
 * // Usage:
 * const styles = {
 *   ...responsiveStyles('padding', { xs: '8px', sm: '16px', md: '24px' })
 * };
 */
export const responsiveStyles = (property, values) => {
  const result = {};
  
  Object.entries(values).forEach(([breakpoint, value]) => {
    if (breakpoint === 'xs') {
      // Base style without media query for xs
      result[property] = value;
    } else {
      // Add media query for other breakpoints
      result[createMediaQuery(breakpoint, 'up')] = {
        [property]: value
      };
    }
  });
  
  return result;
};

/**
 * Checks if the current viewport matches a specific breakpoint range
 * 
 * Note: This must be used in the browser environment only
 * 
 * @param {string} key - The breakpoint key (xs, sm, md, lg, xl)
 * @param {string} direction - 'up' or 'down'
 * @returns {boolean} Whether the current viewport matches the breakpoint
 */
export const isBreakpoint = (key, direction = 'up') => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const value = breakpoints[key];
  
  if (!value && value !== 0) {
    console.error(`Invalid breakpoint key: ${key}`);
    return false;
  }
  
  if (direction === 'up') {
    return window.innerWidth >= value;
  } else if (direction === 'down') {
    const nextBreakpointKey = Object.keys(breakpoints).find(
      (bpKey) => breakpoints[bpKey] > value
    );
    const nextValue = nextBreakpointKey 
      ? breakpoints[nextBreakpointKey] - 0.05 
      : Infinity;
    
    return nextValue === Infinity 
      ? window.innerWidth <= value 
      : window.innerWidth <= nextValue;
  }
  
  return false;
};

export default {
  breakpoints,
  createMediaQuery,
  responsiveStyles,
  isBreakpoint
}; 