/**
 * Utility function for combining CSS class names
 * Similar to the popular classnames library
 * 
 * @param {...string|Object|Array} classes - CSS class names or objects with class names as keys and booleans as values
 * @returns {string} - Combined class names
 * 
 * Example: 
 * cls('btn', { 'btn-primary': true, 'btn-large': false }, ['active', condition && 'visible'])
 * => 'btn btn-primary active visible' (if condition is true)
 */
export default function cls(...classes) {
  return classes
    .filter(Boolean)
    .map(cls => {
      if (typeof cls === 'string') {
        return cls.trim();
      }
      if (Array.isArray(cls)) {
        return cls.filter(Boolean).join(' ');
      }
      if (typeof cls === 'object' && cls !== null) {
        return Object.entries(cls)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ');
      }
      return '';
    })
    .join(' ')
    .trim();
} 