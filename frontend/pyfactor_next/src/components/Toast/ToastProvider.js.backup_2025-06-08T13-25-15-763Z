'use client';

import React, { useState, useCallback } from 'react';
import { createSafeContext, useSafeContext } from '@/utils/ContextFix';
import ClientOnly from '@/components/ClientOnly';
import CustomToast from '../CustomToast';

const ToastContext = createSafeContext(null);

// Toast container component
const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 min-w-[300px]">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`flex items-center justify-between py-3 px-4 rounded-lg shadow-md
            ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : ''}
            ${toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : ''}
            animate-fadeIn
          `}
        >
          <CustomToast message={toast.message} type={toast.type} />
          
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-700 focus:outline-none"
            aria-label="Close notification"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Function to add a toast
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
    
    // Auto remove toast after duration
    if (duration !== null) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  }, []);

  // Function to remove a toast
  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Convenience methods for different toast types
  const showToast = React.useMemo(() => ({
    info: (message, duration) => addToast(message, 'info', duration),
    success: (message, duration) => addToast(message, 'success', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    error: (message, duration) => addToast(message, 'error', duration),
  }), [addToast]);

  return (
    <ToastContext.Provider value={showToast}>
      <ClientOnly>
        <React.Fragment>
          {children}
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </React.Fragment>
      </ClientOnly>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useSafeContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}