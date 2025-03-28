'use client';

import { forwardRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

const Alert = forwardRef(({
  children,
  severity = 'info',
  variant = 'filled',
  action,
  icon,
  onClose,
  className = '',
  ...props
}, ref) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Severity variants
  const severityClasses = {
    success: {
      filled: 'bg-success-main text-white',
      outlined: 'border border-success-main text-success-main',
      standard: 'bg-success-main/10 text-success-dark',
    },
    info: {
      filled: 'bg-info-main text-white',
      outlined: 'border border-info-main text-info-main',
      standard: 'bg-info-main/10 text-info-dark',
    },
    warning: {
      filled: 'bg-warning-main text-white',
      outlined: 'border border-warning-main text-warning-main',
      standard: 'bg-warning-main/10 text-warning-dark',
    },
    error: {
      filled: 'bg-error-main text-white',
      outlined: 'border border-error-main text-error-main',
      standard: 'bg-error-main/10 text-error-dark',
    },
  };

  // Default icons
  const defaultIcons = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  // Close button
  const CloseButton = () => (
    <button
      type="button"
      onClick={() => {
        setDismissed(true);
        if (onClose) onClose();
      }}
      className="ml-auto -mx-1.5 -my-1.5 bg-transparent rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-black/10 focus:ring-2 focus:ring-gray-300"
      aria-label="Close"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  return (
    <div
      ref={ref}
      role="alert"
      className={twMerge(
        'flex items-center p-4 mb-4 rounded-lg',
        severityClasses[severity]?.[variant] || severityClasses.info[variant],
        className
      )}
      {...props}
    >
      {/* Icon */}
      {icon !== false && (
        <div className="flex-shrink-0 mr-3">
          {icon || defaultIcons[severity]}
        </div>
      )}
      
      {/* Content */}
      <div className="ml-0 flex-1 text-sm font-medium">
        {children}
      </div>
      
      {/* Action */}
      {action && (
        <div className="ml-auto">
          {action}
        </div>
      )}
      
      {/* Close button */}
      {onClose && !action && <CloseButton />}
    </div>
  );
});

Alert.displayName = 'Alert';

export default Alert; 