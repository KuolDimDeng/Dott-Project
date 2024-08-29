// components/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Fab, Paper, Typography, TextField, IconButton } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import axiosInstance from '../components/axiosConfig';
console.log('axiosInstance:', axiosInstance);



const Chatbot = ({ userName, backgroundColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [userDatabase, setUserDatabase] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const initializeChat = async () => {
        try {
          const database_name = await fetchUserProfile();
          if (database_name) {
            await fetchMessages(database_name);
          }
        } catch (error) {
          console.error('Error initializing chat:', error);
        }
      };
  
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
      return response.data.database_name;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const fetchMessages = async (database_name) => {
    try {
      const response = await axiosInstance.get('/api/chatbot/messages/get_messages/', {
        params: { database: database_name },
      });
      if (Array.isArray(response.data.messages)) {
        setMessages(response.data.messages);
      } else {
        console.error('Received messages is not an array:', response.data.messages);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      setMessages([]);
    }
  };

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (input.trim() && userDatabase) {
      try {
        const response = await axiosInstance.post('/api/chatbot/messages/send_message/', 
          { message: input },
          { params: { database: userDatabase } }
        );
        setMessages([...messages, { message: input, is_from_user: true }, { message: response.data.response, is_from_user: false }]);
        setInput('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
      {isOpen ? (
        <Paper elevation={3} sx={{ width: 300, height: 400, display: 'flex', flexDirection: 'column', backgroundColor }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6">Hello {userName}, need help?</Typography>
            <IconButton onClick={handleToggle} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            {Array.isArray(messages) && messages.map((msg, index) => (
              <Typography 
                key={index} 
                sx={{ 
                  mb: 1, 
                  textAlign: msg.is_from_user ? 'right' : 'left',
                  backgroundColor: msg.is_from_user ? '#e3f2fd' : '#f5f5f5',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'inline-block',
                  maxWidth: '80%'
                }}
              >
                {msg.message}
              </Typography>
            ))}
            <div ref={messagesEndRef} />
          </Box>
          <Box sx={{ p: 2, display: 'flex' }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
            />
            <IconButton onClick={handleSend}>
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      ) : (
        <Fab color="primary" onClick={handleToggle}>
          <ChatIcon />
        </Fab>
      )}
    </Box>
  );
};

export default Chatbot;