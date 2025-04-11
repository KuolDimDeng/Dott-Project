/**
 * Stub for pdfjs-dist module
 * 
 * This stub prevents the "Cannot read properties of null (reading '0')" error
 * by providing safe fallback implementations of PDF.js functions.
 */

module.exports = {
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 0,
      getPage: () => Promise.resolve({
        getViewport: ({ scale = 1, rotation = 0 }) => ({
          width: 800,
          height: 1100,
          scale,
          rotation,
          clone: () => ({ width: 800, height: 1100, scale })
        }),
        render: () => Promise.resolve({
          promise: Promise.resolve()
        }),
        getTextContent: () => Promise.resolve({
          items: [{ str: 'PDF content unavailable in stub mode' }],
          styles: {}
        }),
        getOperatorList: () => Promise.resolve({
          fnArray: [],
          argsArray: [[]] // This is the fix - ensure argsArray has at least one empty array
        })
      }),
      destroy: () => Promise.resolve()
    })
  }),
  
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  
  PDFWorker: class PDFWorker {
    constructor() {
      this.destroyed = false;
    }
    destroy() {
      this.destroyed = true;
      return Promise.resolve();
    }
    get promise() {
      return Promise.resolve(this);
    }
  },
  
  build: '0000',
  version: '0.0.0'
}; 