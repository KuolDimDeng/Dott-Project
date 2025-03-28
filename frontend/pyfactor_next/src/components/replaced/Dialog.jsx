'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { createPortal } from 'react-dom';

// Main Dialog component
const Dialog = forwardRef(({
  open = false,
  onClose,
  maxWidth = 'sm',
  fullWidth = false,
  fullScreen = false,
  children,
  className = '',
  ...props
}, ref) => {
  const dialogRef = useRef(null);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dialogRef.current && 
        !dialogRef.current.contains(event.target) && 
        onClose
      ) {
        onClose(event, 'backdropClick');
      }
    };
    
    // Handle escape key
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose(event, 'escapeKeyDown');
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Prevent scrolling when dialog is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore scrolling when dialog is closed
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Max width variants
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };
  
  const dialogClasses = twMerge(
    'bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all',
    fullScreen ? 'w-screen h-screen rounded-none' : 'w-full m-4',
    !fullScreen && fullWidth ? 'w-full' : '',
    !fullScreen && !fullWidth ? (maxWidthClasses[maxWidth] || maxWidthClasses.sm) : '',
    className
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        {/* Dialog */}
        <div 
          ref={(node) => {
            // Merges refs
            dialogRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className={dialogClasses}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
});

// Dialog Title component
const DialogTitle = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={twMerge('px-6 py-4 border-b border-gray-200 dark:border-gray-700', className)}
      {...props}
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
        {children}
      </h2>
    </div>
  );
});

// Dialog Content component
const DialogContent = forwardRef(({
  children,
  className = '',
  dividers = false,
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={twMerge(
        'px-6 py-4',
        dividers ? 'border-t border-b border-gray-200 dark:border-gray-700' : '',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

// Dialog Actions component
const DialogActions = forwardRef(({
  children,
  className = '',
  disableSpacing = false,
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={twMerge(
        'px-6 py-3 flex items-center justify-end',
        !disableSpacing && 'gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

// Display names for DevTools
Dialog.displayName = 'Dialog';
DialogTitle.displayName = 'DialogTitle';
DialogContent.displayName = 'DialogContent';
DialogActions.displayName = 'DialogActions';

export { Dialog, DialogTitle, DialogContent, DialogActions }; 