import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from './useSession-v2';
import { toast } from 'react-hot-toast';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { session } = useSession();
  const intervalRef = useRef(null);
  const lastFetchRef = useRef(0);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!session?.authenticated) {
      return;
    }

    // Prevent too frequent requests (minimum 5 seconds between requests)
    const now = Date.now();
    if (now - lastFetchRef.current < 5000 && !options.force) {
      return;
    }
    lastFetchRef.current = now;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.unreadOnly) params.append('unread_only', 'true');
      if (options.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`/api/notifications/user?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update notifications and unread count
      if (data.results) {
        setNotifications(data.results);
        
        // Count unread notifications
        const unread = data.results.filter(n => !n.is_read).length;
        
        // Show toast for new notifications (only if we had previous data)
        if (notifications.length > 0 && unread > unreadCount && !options.silent) {
          const newNotifications = data.results.filter(n => 
            !n.is_read && !notifications.some(existing => existing.id === n.id)
          );
          
          newNotifications.forEach(notification => {
            toast(notification.title, {
              duration: 4000,
              icon: '🔔',
              style: {
                background: '#3B82F6',
                color: 'white',
              },
            });
          });
        }
        
        setUnreadCount(unread);
      }

    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, notifications, unreadCount]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!session?.authenticated) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/user/${notificationId}/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  }, [session]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!session?.authenticated || unreadCount === 0) {
      return;
    }

    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(notification => 
          fetch(`/api/notifications/user/${notification.id}/mark-read`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      );

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);

      toast.success('All notifications marked as read');

    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
    }
  }, [session, notifications, unreadCount]);

  // Start polling for notifications
  const startPolling = useCallback((intervalMs = 30000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial fetch
    fetchNotifications({ silent: true });

    // Set up polling
    intervalRef.current = setInterval(() => {
      fetchNotifications({ silent: false });
    }, intervalMs);
  }, [fetchNotifications]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start polling when session is available
  useEffect(() => {
    if (session?.authenticated) {
      startPolling();
      return () => stopPolling();
    } else {
      stopPolling();
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [session?.authenticated, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
  };
};