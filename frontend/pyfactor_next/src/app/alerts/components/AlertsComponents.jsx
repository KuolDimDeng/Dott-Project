'use client';
import React, { useEffect, useState } from 'react';
import { Badge, IconButton, Snackbar } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
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

  return (
    <>
      <IconButton color="inherit" onClick={handleAlertClick}>
        <Badge badgeContent={unreadCount} color="secondary">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={showSnackbar}
        autoHideDuration={5000}
        onClose={() => setShowSnackbar(false)}
        message={snackbarMessage}
      />
    </>
  );
};

export default AlertsComponent;
