import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

const MessageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  whiteSpace: 'nowrap',
}));

const SuccessMessage = styled(Typography)(({ theme }) => ({
  color: 'green',
  marginRight: theme.spacing(1),
}));

const WarningMessage = styled(Typography)(({ theme }) => ({
  color: 'orange',
  marginRight: theme.spacing(1),
}));

const ErrorMessage = styled(Typography)(({ theme }) => ({
  color: 'red',
  marginRight: theme.spacing(1),
}));

function PrintStatements() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const originalConsoleLog = console.log;

    console.log = (...args) => {
      const message = args.join(' ');
      const messageType = getMessageType(message);
      setMessages((prevMessages) => [...prevMessages, { message, type: messageType }]);
      originalConsoleLog(...args);
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  const getMessageType = (message) => {
    if (message.includes('success')) {
      return 'success';
    } else if (message.includes('warning')) {
      return 'warning';
    } else if (message.includes('error')) {
      return 'error';
    }
    return 'default';
  };

  return (
    <MessageContainer>
      {messages.map((messageData, index) => (
        <React.Fragment key={index}>
          {messageData.type === 'success' && (
            <SuccessMessage variant="body2">{messageData.message}</SuccessMessage>
          )}
          {messageData.type === 'warning' && (
            <WarningMessage variant="body2">{messageData.message}</WarningMessage>
          )}
          {messageData.type === 'error' && (
            <ErrorMessage variant="body2">{messageData.message}</ErrorMessage>
          )}
          {messageData.type === 'default' && (
            <Typography variant="body2" color="inherit">
              {messageData.message}
            </Typography>
          )}
        </React.Fragment>
      ))}
    </MessageContainer>
  );
}

export default PrintStatements;