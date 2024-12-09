// src/components/ErrorBoundary/index.js
'use client';

export { 
  ErrorBoundary,
  AppErrorBoundary,
  withErrorBoundary 
} from './ErrorBoundary';

export { default as ErrorFallback } from './ErrorFallback';

// Export AppErrorBoundary as default
import { AppErrorBoundary as DefaultExport } from './ErrorBoundary';
export default DefaultExport;