/**
 * More comprehensive stub for pdfjs-dist to prevent parsing errors
 * Fixes "Cannot read properties of null (reading '0')" error
 */

const pdfjsLib = {
  GlobalWorkerOptions: {
    workerSrc: '',
    set workerSrc(value) { this._workerSrc = value; },
    get workerSrc() { return this._workerSrc || ''; }
  },
  getDocument: (src) => ({
    promise: Promise.resolve({
      numPages: 0,
      getPage: (pageNum) => Promise.resolve({
        getViewport: ({ scale, rotation }) => ({
          width: 800,
          height: 1100,
          scale: scale || 1,
          rotation: rotation || 0,
          clone: () => ({ width: 800, height: 1100, scale: scale || 1 })
        }),
        render: () => Promise.resolve({
          promise: Promise.resolve()
        }),
        getTextContent: () => Promise.resolve({
          items: [],
          styles: {}
        }),
        getAnnotations: () => Promise.resolve([]),
        getOperatorList: () => Promise.resolve({
          fnArray: [],
          argsArray: [[]] // Ensure argsArray has at least one empty array to prevent [0] access on null
        }),
        transport: {
          pageCache: { 0: {} },
          commonObjs: { 
            has: () => false, 
            get: () => ({}), // Return empty object instead of null
            resolve: () => {} 
          },
          fontCache: {}
        }
      }),
      _transport: {
        messageHandler: { on: () => {}, off: () => {} },
        annotationStorage: { 
          getValue: () => ({}), // Return empty object instead of undefined
          getAll: () => ({}) // Add getAll method
        },
        cleanup: () => {}
      },
      destroy: () => Promise.resolve()
    })
  }),
  version: '2.16.105',
  build: '0000000',
  PDFWorker: class PDFWorker {
    constructor(options = {}) {
      this.name = options.name || 'worker';
      this.destroyed = false;
      this._readyCapability = { promise: Promise.resolve() };
    }
    destroy() { 
      this.destroyed = true; 
      return Promise.resolve();
    }
    get promise() {
      return this._readyCapability.promise;
    }
    static fromPort(params) {
      return new PDFWorker();
    }
    static getWorkerSrc() {
      return '';
    }
  },
  AnnotationLayer: {
    render: () => {},
    update: () => {}
  },
  TextLayer: {
    render: () => ({ cancel: () => {} }),
    renderTextLayer: () => ({ cancel: () => {} })
  },
  LinkTarget: {
    NONE: 0,
    SELF: 1,
    BLANK: 2,
    PARENT: 3,
    TOP: 4
  },
  createObjectURL: () => '',
  createValidAbsoluteUrl: () => '',
  shadow: (obj, prop, value) => {
    Object.defineProperty(obj, prop, { value, enumerable: true, configurable: true, writable: false });
    return value;
  },
  SVGGraphics: class SVGGraphics {},
  RenderingCancelledException: class RenderingCancelledException extends Error {},
  renderTextLayer: () => ({ promise: Promise.resolve(), cancel: () => {} })
};

// Proxy handler to prevent null property access errors
const safeHandler = {
  get: function(target, prop) {
    // If property doesn't exist, return an empty object rather than undefined
    if (target[prop] === undefined) {
      if (typeof prop === 'string' && (prop.startsWith('get') || prop.startsWith('set'))) {
        return () => ({});
      }
      return {};
    }
    return target[prop];
  }
};

// Wrap the pdfjsLib in a Proxy to catch undefined property access
const safepdfjsLib = new Proxy(pdfjsLib, safeHandler);

// Export main module
export default safepdfjsLib;

// Named exports for destructuring imports
export const GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions;
export const getDocument = pdfjsLib.getDocument;
export const PDFWorker = pdfjsLib.PDFWorker;
export const AnnotationLayer = pdfjsLib.AnnotationLayer;
export const TextLayer = pdfjsLib.TextLayer;
export const LinkTarget = pdfjsLib.LinkTarget;
export const RenderingCancelledException = pdfjsLib.RenderingCancelledException;
export const renderTextLayer = pdfjsLib.renderTextLayer;
export const createObjectURL = pdfjsLib.createObjectURL;
export const createValidAbsoluteUrl = pdfjsLib.createValidAbsoluteUrl;
export const shadow = pdfjsLib.shadow;
export const SVGGraphics = pdfjsLib.SVGGraphics;
export const version = pdfjsLib.version;
export const build = pdfjsLib.build; 