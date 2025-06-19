'use client';

/**
 * Session Heartbeat Component
 * Maintains session health by sending periodic heartbeats
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from '@/hooks/useSession-v2';

const SessionHeartbeat = ({ 
  interval = 60000, // 1 minute default
  onMissedHeartbeat = null,
  enabled = true 
}) => {
  const { session, refreshSession } = useSession();
  const intervalRef = useRef(null);
  const lastHeartbeatRef = useRef(Date.now());
  const missedCountRef = useRef(0);

  const sendHeartbeat = useCallback(async () => {
    if (!session?.sessionToken) {
      return;
    }

    try {
      const response = await fetch('/api/sessions/security/heartbeat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          session_id: session.sessionToken
        }),
        credentials: 'include'
      });

      if (response.ok) {
        lastHeartbeatRef.current = Date.now();
        missedCountRef.current = 0;
        
        // Update session if needed
        const data = await response.json();
        if (data.refresh_required) {
          await refreshSession();
        }
      } else {
        missedCountRef.current += 1;
        console.warn('Heartbeat failed:', response.status);
        
        if (missedCountRef.current >= 3 && onMissedHeartbeat) {
          onMissedHeartbeat(missedCountRef.current);
        }
      }
    } catch (error) {
      missedCountRef.current += 1;
      console.error('Heartbeat error:', error);
      
      if (missedCountRef.current >= 3 && onMissedHeartbeat) {
        onMissedHeartbeat(missedCountRef.current);
      }
    }
  }, [session, refreshSession, onMissedHeartbeat]);

  // Set up heartbeat interval
  useEffect(() => {
    if (!enabled || !session?.sessionToken) {
      return;
    }

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, session?.sessionToken, interval, sendHeartbeat]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && enabled && session?.sessionToken) {
        // Page became visible, check if we need to send heartbeat
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
        if (timeSinceLastHeartbeat > interval) {
          sendHeartbeat();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, session?.sessionToken, interval, sendHeartbeat]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      if (enabled && session?.sessionToken) {
        sendHeartbeat();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, session?.sessionToken, sendHeartbeat]);

  // No visible UI, just background functionality
  return null;
};

export default SessionHeartbeat;