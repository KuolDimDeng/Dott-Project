'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * NotificationBell - Notification indicator with count
 */
const NotificationBell = ({ 
  unreadCount = 0,
  onClick,
  className = ""
}) => {
  const { t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate when count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-full hover:bg-gray-100 transition-colors
        ${className}
      `}
      aria-label={t('notifications.bell_aria_label', { count: unreadCount })}
    >
      <svg 
        className={`w-6 h-6 text-gray-600 ${isAnimating ? 'animate-bounce' : ''}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      
      {unreadCount > 0 && (
        <span 
          className={`
            absolute -top-1 -right-1 h-5 w-5 rounded-full
            bg-red-500 text-white text-xs font-semibold
            flex items-center justify-center
            ${isAnimating ? 'animate-pulse' : ''}
          `}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
