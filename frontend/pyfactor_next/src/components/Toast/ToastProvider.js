
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/Toast/ToastProvider.js
'use client';

import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createSafeContext, useSafeContext } from '@/utils/ContextFix';
import { ClientOnly } from '@/components/ClientOnly';

const ToastContext = createSafeContext(null);

export function ToastProvider({ children }) {
  // Create toast methods outside of render to avoid recreating on each render
  const showToast = React.useMemo(() => ({
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    info: (message) => toast.info(message),
    warning: (message) => toast.warning(message),
  }), []);

  // Use ClientOnly pattern for client-side rendering without nested function
  return (
    <ToastContext.Provider value={showToast}>
      <ClientOnly>
        <React.Fragment>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
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
