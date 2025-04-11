/**
 * Input Debugging Utilities - DISABLED
 * 
 * These functions are disabled because direct DOM manipulation is not recommended with MUI.
 * MUI provides its own controlled components that handle input properly.
 * 
 * Instead of using these utilities:
 * 1. Use MUI TextField components
 * 2. Manage state with React useState hooks
 * 3. Use proper event handlers with onChange
 */

/**
 * This function is disabled since checking for pointer-events via DOM is not recommended with MUI
 * @param {HTMLElement} element - The element to check
 * @returns {Object} - Empty result object
 */
export const checkEventBlocking = (element) => {
  console.warn('[InputDebug] Direct DOM manipulation is not recommended with MUI. Use MUI components instead.');
  return { element, blockers: [] };
};

/**
 * This function is disabled since fixing input fields via DOM manipulation is not recommended with MUI
 * @param {string} formSelector - CSS selector for the form or container
 */
export const fixInputFields = (formSelector = '.product-form') => {
  console.warn('[InputDebug] Direct DOM manipulation is not recommended with MUI. Use MUI components instead.');
  return 0;
};

/**
 * This function is disabled since monitoring events via DOM is not recommended with MUI
 * Instead, use MUI's components which handle events properly
 */
export const monitorInputEvents = () => {
  console.warn('[InputDebug] Direct DOM manipulation is not recommended with MUI. Use MUI components instead.');
  
  // Return no-op cleanup function
  return () => {};
};

export default {
  checkEventBlocking,
  fixInputFields,
  monitorInputEvents
}; 