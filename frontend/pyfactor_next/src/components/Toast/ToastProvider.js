'use client';

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { ToastContainer, toast as reactToastify } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const debug = (message, ...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ToastProvider] ${message}`, ...args);
  }
};

const TOAST_CONFIG = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
  theme: 'light',
  limit: 3,
  style: {
    fontSize: '14px',
    padding: '16px',
  },
};

const ToastContext = React.createContext(null);

export const ToastProvider = memo(function ToastProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef(null);
  const mountedRef = useRef(false);
  const toastInstanceRef = useRef(null);
  const toastQueueRef = useRef([]);
  const loadingToastsRef = useRef(new Set());

  const initializeToast = useCallback(() => {
    if (!mountedRef.current || !containerRef.current) return;

    try {
      toastInstanceRef.current = reactToastify;
      setIsInitialized(true);

      if (toastQueueRef.current.length > 0) {
        toastQueueRef.current.forEach(({ type, args }) => {
          toastInstanceRef.current[type]?.(...args);
        });
        toastQueueRef.current = [];
      }
    } catch (error) {
      console.error('Toast initialization error:', error);
    }
  }, []);

  const toastMethods = useCallback(
    (type) =>
      (...args) => {
        if (!mountedRef.current || !isInitialized || !toastInstanceRef.current) {
          toastQueueRef.current.push({ type, args });
          return;
        }

        try {
          const result = toastInstanceRef.current[type]?.(...args);
          return result;
        } catch (error) {
          console.error(`Toast ${type} error:`, error);
        }
      },
    [isInitialized]
  );

  const toast = React.useMemo(
    () => ({
      success: toastMethods('success'),
      error: toastMethods('error'),
      info: toastMethods('info'),
      warning: toastMethods('warning'),
      loading: (message) => {
        const id = toastMethods('info')({
          message,
          isLoading: true,
          autoClose: false,
        });
        loadingToastsRef.current.add(id);
        return id;
      },
      dismiss: (id) => {
        if (id) {
          loadingToastsRef.current.delete(id);
          toastInstanceRef.current?.dismiss(id);
        } else {
          loadingToastsRef.current.clear();
          toastInstanceRef.current?.dismiss();
        }
      },
      update: (id, props) => {
        if (!id || !toastInstanceRef.current) return;
        toastInstanceRef.current.update(id, {
          ...props,
          isLoading: false,
          autoClose: 5000,
        });
        loadingToastsRef.current.delete(id);
      },
    }),
    [toastMethods]
  );

  useEffect(() => {
    mountedRef.current = true;
    const initTimer = setTimeout(initializeToast, 0);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);

      if (toastInstanceRef.current) {
        Array.from(loadingToastsRef.current).forEach((id) => {
          toastInstanceRef.current.dismiss(id);
        });
        loadingToastsRef.current.clear();
        toastInstanceRef.current = null;
      }

      setIsInitialized(false);
    };
  }, [initializeToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div ref={containerRef} id="toast-root">
        <ToastContainer {...TOAST_CONFIG} enableMultiContainer containerId="toast-root" />
      </div>
    </ToastContext.Provider>
  );
});

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    console.warn('useToast must be used within a ToastProvider');
    return {
      success: () => null,
      error: () => null,
      info: () => null,
      warning: () => null,
      loading: () => null,
      dismiss: () => null,
      update: () => null,
    };
  }

  return context;
}

if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  ToastProvider.propTypes = {
    children: PropTypes.node.isRequired,
  };
}

export default ToastProvider;
