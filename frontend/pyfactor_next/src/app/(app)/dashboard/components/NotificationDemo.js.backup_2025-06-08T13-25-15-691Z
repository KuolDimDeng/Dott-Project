'use client';

import React from 'react';
import { useNotification } from '@/context/NotificationContext';
import { Box, Button, Typography, Paper } from '@/components/ui/TailwindComponents';

const NotificationDemo = () => {
  const { 
    notifySuccess, 
    notifyError, 
    notifyInfo, 
    notifyWarning 
  } = useNotification();

  return (
    <Paper className="p-6 mb-6">
      <Typography variant="h4" component="h2" className="mb-4">
        Notification System (Tailwind CSS)
      </Typography>
      <Typography className="mb-4">
        Below are examples of different notification types. Click on each button to see the notification appear at the bottom left of the screen.
      </Typography>
      
      <Box className="flex flex-wrap gap-4">
        <Button 
          onClick={() => notifySuccess('Operation completed successfully!')}
          color="success"
        >
          Success Notification
        </Button>
        
        <Button 
          onClick={() => notifyError('An error occurred. Please try again.')}
          color="error"
        >
          Error Notification
        </Button>
        
        <Button 
          onClick={() => notifyInfo('This is an informational message.')}
          color="info"
        >
          Info Notification
        </Button>
        
        <Button 
          onClick={() => notifyWarning('Please be aware of this important information.')}
          color="warning"
        >
          Warning Notification
        </Button>
        
        <Button 
          onClick={() => {
            notifyInfo('This notification stays for 10 seconds', { 
              autoHideDuration: 10000 
            });
          }}
        >
          Long Duration (10s)
        </Button>
      </Box>
    </Paper>
  );
};

export default NotificationDemo; 