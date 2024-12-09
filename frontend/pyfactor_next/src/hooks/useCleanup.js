// src/hooks/useCleanup.js
import { useRef, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

export const useCleanup = () => {
  const timeouts = useRef(new Set());
  const intervals = useRef(new Set());
  const eventListeners = useRef(new Map());
  const cleanupFns = useRef(new Set());

  const addTimeout = useCallback((callback, delay) => {
    const id = setTimeout(() => {
      timeouts.current.delete(id);
      callback();
    }, delay);
    timeouts.current.add(id);
    return id;
  }, []);

  const addInterval = useCallback((callback, delay) => {
    const id = setInterval(callback, delay);
    intervals.current.add(id);
    return id;
  }, []);

  const addEventListener = useCallback((element, event, handler, options) => {
    element.addEventListener(event, handler, options);
    const key = `${event}-${element.toString()}`;
    eventListeners.current.set(key, { element, event, handler });
    return key;
  }, []);

  const addCleanupFn = useCallback((fn) => {
    cleanupFns.current.add(fn);
    return fn;
  }, []);

  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      intervals.current.forEach(clearInterval);
      eventListeners.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      cleanupFns.current.forEach(fn => {
        try {
          fn();
        } catch (error) {
          logger.error('Cleanup function failed:', error);
        }
      });
    };
  }, []);

  return {
    addTimeout,
    addInterval,
    addEventListener,
    addCleanupFn
  };
};