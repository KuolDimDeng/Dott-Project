// src/hooks/useWebSocketConnection.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

const WS_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 10000,
  PING_INTERVAL: 30000
};

export const useWebSocketConnection = (url, options = {}) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const retryCount = useRef(0);
  const pingInterval = useRef(null);

  const setupPing = useCallback((socket) => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }

    pingInterval.current = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, WS_CONFIG.PING_INTERVAL);
  }, []);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        logger.info('WebSocket connected');
        setIsConnected(true);
        setError(null);
        retryCount.current = 0;
        setupPing(socket);
        options.onOpen?.();
      };

      socket.onclose = (event) => {
        logger.info(`WebSocket closed with code ${event.code}`);
        setIsConnected(false);
        clearInterval(pingInterval.current);
        options.onClose?.(event);

        // Attempt reconnection
        if (retryCount.current < WS_CONFIG.MAX_RETRIES) {
          const delay = Math.min(
            WS_CONFIG.BASE_DELAY * Math.pow(2, retryCount.current),
            WS_CONFIG.MAX_DELAY
          );
          setTimeout(() => {
            retryCount.current++;
            connect();
          }, delay);
        } else {
          setError(new Error('Maximum reconnection attempts reached'));
          options.onMaxRetriesReached?.();
        }
      };

      socket.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setError(error);
        options.onError?.(error);
      };

      socket.onmessage = (event) => {
        options.onMessage?.(event);
      };

      setWs(socket);
    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
      setError(error);
    }
  }, [url, options, setupPing]);

  useEffect(() => {
    connect();
    return () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
      clearInterval(pingInterval.current);
    };
  }, [connect, ws]);

  return {
    ws,
    isConnected,
    error,
    reconnect: connect
  };
};