import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Fab, Paper, Typography, TextField, IconButton } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { axiosInstance } from '@/lib/axiosConfig';
import debounce from 'lodash/debounce';

const Chatbot = ({ userName, backgroundColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [userDatabase, setUserDatabase] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // To track if initialization has been done

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
      setIsInitialized(true); // Mark as initialized to prevent re-fetching on reopen
    } else if (!isOpen) {
      setMessages([]); // Clear messages when closing
      setIsInitialized(false); // Reset initialization state
      if (socket) {
        socket.close();
      }
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = async () => {
    try {
      const profile = await fetchUserProfile();
      if (profile && profile.database_name) {
        await fetchMessages(profile.database_name);
        initializeWebSocket(profile.database_name);
      } else {
        setError('Failed to get user database information.');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat. Please try again later.');
    }
  };

  const isTokenExpired = (token) => {
    if (!token) return true;

    try {
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      const expiration = decodedPayload.exp * 1000; // Convert to milliseconds

      return Date.now() > expiration;
    } catch (e) {
      console.error('Failed to decode token:', e);
      return true;
    }
  };

  const initializeWebSocket = useCallback(
    (database_name) => {
      const token = localStorage.getItem('token');
      console.log('Retrieved token:', token);

      if (!token || token === 'null') {
        console.error('No valid authentication token found or token has expired');
        setError('Authentication error. Please log in again.');
        return;
      }

      const sanitizedUserName = userName.replace('@', '_').replace('.', '_');
      const newSocket = new WebSocket(
        `ws://localhost:8000/ws/chat/${sanitizedUserName}/?token=${token}&database=${database_name}`
      );

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setIsSocketConnected(true);
        setError(null);
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            throw new Error(data.error);
          }
          setMessages((prevMessages) => [
            ...prevMessages,
            { message: data.message, is_from_user: data.username === sanitizedUserName },
          ]);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          setError('Failed to process incoming message.');
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event);
        setIsSocketConnected(false);
        setError('Connection lost. Reconnecting...');
        setTimeout(() => initializeWebSocket(database_name), 3000); // Attempt reconnection after 3 seconds
      };

      setSocket(newSocket);
    },
    [userName]
  );

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(`Failed to fetch user profile: ${error.message}`);
      return null;
    }
  };

  const fetchMessages = async (database_name) => {
    try {
      const response = await axiosInstance.get('/api/chatbot/get_messages/', {
        params: { database: database_name },
      });
      console.log('Fetched messages:', response.data);
      if (Array.isArray(response.data.messages)) {
        setMessages(response.data.messages);
      } else {
        console.error('Received messages is not an array:', response.data.messages);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to fetch messages. Please try again.');
      setMessages([]);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const debouncedHandleSend = useMemo(
    () =>
      debounce((input, socket) => {
        if (input.trim() && socket && socket.readyState === WebSocket.OPEN) {
          console.log('Sending message:', input);
          const message = JSON.stringify({ message: input });
          socket.send(message);
          setInput('');
          setError(null);
        } else {
          console.error(
            'Unable to send message. Input:',
            input,
            'Socket state:',
            socket ? socket.readyState : 'No socket'
          );
          setError('Unable to send message. Please check your connection.');
        }
      }, 300),
    [socket]
  );

  const handleSend = () => {
    debouncedHandleSend(input, socket);
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
      {isOpen ? (
        <Paper
          elevation={3}
          sx={{
            width: 300,
            height: 400,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor,
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            <Typography variant="h6">Hello {userName}, need help?</Typography>
            <IconButton onClick={handleToggle} size="small" aria-label="Close Chat">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            {error && (
              <Typography color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            {Array.isArray(messages) &&
              messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    textAlign: msg.is_from_user ? 'right' : 'left',
                    backgroundColor: msg.is_from_user ? '#f0f3f9' : '#f5f5f5',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    maxWidth: '80%',
                  }}
                >
                  {typeof msg.message === 'string' ? (
                    msg.message.split('\n').map((line, lineIndex) => (
                      <Typography
                        key={lineIndex}
                        sx={{
                          display: 'block',
                          mb: lineIndex < msg.message.split('\n').length - 1 ? '4px' : '0',
                        }}
                      >
                        {line}
                      </Typography>
                    ))
                  ) : (
                    <Typography>{msg.message}</Typography>
                  )}
                </Box>
              ))}
            <div ref={messagesEndRef} />
          </Box>
          <Box sx={{ p: 2, display: 'flex' }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={input}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              aria-label="Type a message"
            />
            <IconButton onClick={handleSend} aria-label="Send Message">
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      ) : (
        <Fab color="primary" onClick={handleToggle} aria-label="Open Chat">
          <ChatIcon />
        </Fab>
      )}
    </Box>
  );
};

export default Chatbot;
