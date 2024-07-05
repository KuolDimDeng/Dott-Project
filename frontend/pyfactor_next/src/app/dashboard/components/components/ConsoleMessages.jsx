import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const lightBlue = '#E3F2FD'; // Make sure this matches the color in your Dashboard component

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
  const { messages } = useUserMessageContext();
  const [latestMessage, setLatestMessage] = useState(null);

  useEffect(() => {
    if (messages.length > 0) {
      setLatestMessage(messages[messages.length - 1]);
    }
  }, [messages]);

  return (
    <MessageContainer backgroundColor={backgroundColor}>
      {latestMessage && (
        <Typography 
          style={getMessageStyle(latestMessage.type)}
          aria-label={latestMessage.type}
        >
          {latestMessage.content}
        </Typography>
      )}
    </MessageContainer>
  );
}

export default ConsoleMessages;