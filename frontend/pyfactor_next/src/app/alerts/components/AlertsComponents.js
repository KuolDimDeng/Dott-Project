'use client';
import React, { useEffect, useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const AlertsComponent = ({ onAlertClick }) => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axiosInstance.get('/api/alerts/user_alerts/');
      setAlerts(response.data);
      setUnreadCount(response.data.filter((alert) => !alert.is_read).length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  useEffect(() => {
    if (alerts.length > 0 && !alerts[0].is_read) {
      setSnackbarMessage(alerts[0].alert.subject);
      setShowSnackbar(true);
    }
  }, [alerts]);

  const handleAlertClick = () => {
    onAlertClick(alerts);
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  useEffect(() => {
    if (showSnackbar) {
      const timer = setTimeout(() => {
        setShowSnackbar(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showSnackbar]);

  return (
    <>
      <button 
        onClick={handleAlertClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showSnackbar && (
        <div className="fixed top-4 right-4 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 transition-opacity duration-300 ease-in-out">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">New Alert</span>
              <button 
                onClick={handleCloseSnackbar}
                className="ml-auto text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">{snackbarMessage}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default AlertsComponent;