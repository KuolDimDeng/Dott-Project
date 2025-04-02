// Server-side logger implementation
// This file should be imported in API routes instead of the client-side logger

/**
 * Simple server-side logger
 */
const serverLogger = {
  debug: (...args) => console.log('[DEBUG]:', ...args),
  info: (...args) => console.log('[INFO]:', ...args),
  warn: (...args) => console.warn('[WARN]:', ...args),
  error: (...args) => console.error('[ERROR]:', ...args)
};

export { serverLogger as logger };
export default serverLogger; 