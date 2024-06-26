import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const lightBlue = '#E3F2FD'; // Make sure this matches the color in your Dashboard component

const MessageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center', // Center the message vertically
  backgroundColor: lightBlue,
  padding: theme.spacing(1),
  height: '100%',
  overflow: 'hidden', // Hide overflow
}));

const Message = styled(Typography)(({ theme, messageType }) => ({
  whiteSpace: 'nowrap', // Prevent line breaks
  overflow: 'hidden', // Hide overflow
  textOverflow: 'ellipsis', // Add ellipsis for overflowing text
  fontWeight: 'bold',
  color: messageType === 'info' ? 'green' : 'red',
}));

function ConsoleMessages() {
  const { messages } = useUserMessageContext();
  const [latestMessage, setLatestMessage] = useState(null);

  useEffect(() => {
    if (messages.length > 0) {
      setLatestMessage(messages[messages.length - 1]);
    }
  }, [messages]);

  return (
    <MessageContainer>
      {latestMessage && (
        <Message messageType={latestMessage.type}>
          {latestMessage.content}
        </Message>
      )}
    </MessageContainer>
  );
}

export default ConsoleMessages;