import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { useToast } from '@/components/Toast/ToastProvider';

// Use our standardized colors
const lightBgColor = '#f0f3f9'; // Very light gray with slight blue tint

const MessageContainer = styled(Box)(({ theme, backgroundColor }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: backgroundColor,
  padding: theme.spacing(1),
  height: '100%',
  overflow: 'hidden',
}));

const getMessageStyle = (messageType) => ({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontWeight: 'normal',
  color: messageType === 'info' ? 'navy' : 'red',
});

function ConsoleMessages({ backgroundColor }) {
  // No longer using messages from context as toast notifications are displayed automatically
  // This component can now be simplified or even removed if not needed
  
  return (
    <MessageContainer backgroundColor={backgroundColor}>
      <Typography style={getMessageStyle('info')}>
        Console messages now use toast notifications
      </Typography>
    </MessageContainer>
  );
}

export default ConsoleMessages;
