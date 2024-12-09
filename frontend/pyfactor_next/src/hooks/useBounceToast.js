// src/hooks/useDebounceToast.js
import { useCallback } from 'react';
import { useToast } from '@/components/Toast/ToastProvider';

export function useDebounceToast() {
  const toast = useToast();
  const timeouts = useRef({});

  const showToast = useCallback((type, message, options = {}) => {
    const key = `${type}-${message}`;
    
    if (timeouts.current[key]) {
      clearTimeout(timeouts.current[key]);
    }

    timeouts.current[key] = setTimeout(() => {
      toast[type](message, options);
      delete timeouts.current[key];
    }, options.delay || 500);
  }, [toast]);

  useEffect(() => {
    return () => {
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []);

  return showToast;
}

// Usage in component
function Step1Component() {
  const showToast = useDebounceToast();

  useEffect(() => {
    if (methods.formState.isDirty) {
      showToast('info', 'Saving draft...', { delay: 1000 });
    }
  }, [methods.formState.isDirty]);
}