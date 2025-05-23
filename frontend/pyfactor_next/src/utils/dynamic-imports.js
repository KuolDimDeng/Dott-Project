/**
 * Dynamic Import Utilities
 * 
 * This file provides functions for lazy-loading heavy libraries
 * only when they are needed, reducing initial bundle size and memory usage.
 */

/**
 * Dynamically loads the React PDF renderer
 * @returns {Promise<Object>} The React PDF component library
 */
export const loadReactPdfRenderer = async () => {
  try {
    // Use dynamic import to load the library only when needed
    const reactPdfModule = await import('@react-pdf/renderer');
    console.log('React PDF renderer loaded successfully');
    return reactPdfModule;
  } catch (error) {
    console.error('Error loading React PDF renderer:', error);
    // Return stub implementation to prevent errors
    return {
      Document: () => null,
      Page: () => null,
      Text: () => null,
      View: () => null,
      StyleSheet: {
        create: (styles) => styles
      },
      pdf: async () => new Uint8Array(),
      PDFViewer: () => null
    };
  }
};

/**
 * Dynamically loads PDF.js library with memory optimization
 * @returns {Promise<Object>} The PDF.js library
 */
export const loadPdfLib = async () => {
  try {
    // Import our memory-optimized stub instead of the real PDF.js
    const pdfjs = await import('../utils/stubs/pdfjs-stub');
    
    // Return the optimized version
    return pdfjs.default;
  } catch (error) {
    console.error('Error loading PDF library:', error);
    // Return minimal stub implementation
    return {
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 0,
          getPage: () => Promise.resolve({
            getViewport: () => ({ width: 800, height: 1100 }),
            render: () => Promise.resolve()
          })
        })
      }),
      GlobalWorkerOptions: { workerSrc: '' }
    };
  }
};

/**
 * Dynamically loads jsPDF with memory optimizations
 * @returns {Promise<Function>} Constructor for jsPDF
 */
export const loadJsPdf = async () => {
  try {
    const jsPdfModule = await import('jspdf');
    return jsPdfModule.jsPDF;
  } catch (error) {
    console.error('Error loading jsPDF:', error);
    // Return stub implementation
    return class StubJsPDF {
      constructor() {
        this.content = [];
      }
      text(text, x, y) { 
        this.content.push({ type: 'text', text, x, y });
        return this;
      }
      setFontSize() { return this; }
      addPage() { return this; }
      save() { return this; }
      output() { return ''; }
    };
  }
};

/**
 * Optimizes a jsPDF instance by applying memory-saving configurations
 * @param {Object} doc - The jsPDF document instance
 * @returns {Object} The same document with optimizations applied
 */
export const optimizeJsPDF = (doc) => {
  // Set memory-saving properties if the document exists
  if (doc) {
    // Reduce image quality to save memory
    if (doc.internal && doc.internal.events && doc.internal.events.subscribe) {
      doc.internal.events.subscribe('addImage', (data) => {
        if (data && data.image && data.image.quality) {
          // Use lower quality for images
          data.image.quality = 0.5;
        }
      });
    }
    
    // Add cleanup method
    doc._originalClose = doc.close;
    doc.close = function() {
      const result = this._originalClose ? this._originalClose() : undefined;
      
      // Release memory
      if (doc.internal && doc.internal.pages) {
        doc.internal.pages.length = 0;
      }
      
      // Trigger garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      } else if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
      
      return result;
    };
  }
  
  return doc;
};

/**
 * Cleanup function for PDF tasks and resources
 * Call this when you're done with PDF operations to free memory
 */
export function cleanupPDFTasks() {
  // Clear module caches if needed
  if (typeof window !== 'undefined') {
    // Clear any temporary data
    window._pdfjs_tasks = null;
    window._pdf_resources = null;
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }
}

// Chart.js dynamic import wrapper
export const loadChartJs = async () => {
  try {
    return await import('chart.js');
  } catch (error) {
    console.error('Error loading Chart.js:', error);
    return null;
  }
};

// XLSX dynamic import wrapper
export const loadXlsx = async () => {
  try {
    return await import('xlsx');
  } catch (error) {
    console.error('Error loading XLSX:', error);
    return null;
  }
};

// Floating UI React dynamic import wrapper
export const loadFloatingUI = async () => {
  try {
    return await import('@floating-ui/react');
  } catch (error) {
    console.error('Error loading Floating UI:', error);
    
    // Return a stub implementation to prevent errors when the module fails to load
    return {
      // Basic positioning and interaction stubs
      useFloating: () => ({
        x: 0, 
        y: 0, 
        strategy: 'fixed',
        refs: { 
          setReference: () => {}, 
          setFloating: () => {} 
        },
        context: {},
        placement: 'bottom',
        middlewareData: {},
        isPositioned: true,
        update: async () => {}
      }),
      
      // Common middleware stubs
      offset: () => ({ name: 'offset' }),
      flip: () => ({ name: 'flip' }),
      shift: () => ({ name: 'shift' }),
      arrow: () => ({ name: 'arrow' }),
      
      // Interaction hooks stubs
      useHover: () => ({ isHovered: false, getReferenceProps: () => ({}) }),
      useFocus: () => ({ isFocused: false, getReferenceProps: () => ({}) }),
      useClick: () => ({ isClicked: false, getReferenceProps: () => ({}) }),
      useDismiss: () => ({ getReferenceProps: () => ({}), getFloatingProps: () => ({}) }),
      useRole: () => ({ getReferenceProps: () => ({}), getFloatingProps: () => ({}) }),
      useInteractions: () => ({ getReferenceProps: () => ({}), getFloatingProps: () => ({}) }),
      
      // Composite components
      FloatingPortal: ({ children }) => children,
      FloatingOverlay: ({ children }) => children,
      FloatingArrow: () => null
    };
  }
};

// Datepicker dynamic import wrapper
export const loadDatepicker = async () => {
  try {
    return await import('react-datepicker');
  } catch (error) {
    console.error('Error loading React Datepicker:', error);
    return null;
  }
};

/**
 * Creates a lazy-loaded component that will only import its dependencies
 * when the component is actually rendered
 * @param {Function} importFunc - Function that returns a dynamic import
 * @param {Object} options - Additional options
 * @returns {React.LazyExoticComponent}
 */
export const createLazyComponent = (importFunc, options = {}) => {
  // This will be implemented on the client side where React is available
  if (typeof window !== 'undefined' && typeof React !== 'undefined') {
    const { lazy } = React;
    return lazy(importFunc);
  }
  
  // Server-side fallback
  return () => null;
}; 