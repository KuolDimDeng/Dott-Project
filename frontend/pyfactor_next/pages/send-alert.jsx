// pages/send-alert.jsx
import React, { useState } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Typography, Containerm, CssBaseline, ThemeProvider, createTheme, Container } from '@mui/material';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import withAuth from '@/app/components/withAuth';


// Create a light theme
const theme = createTheme({
    palette: {
      mode: 'light',
      background: {
        default: '#f5f5f5',
      },
    },
  });
  
  const SendAlertPage = () => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('medium');
    const [status, setStatus] = useState('');
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setStatus('');
      try {
        const response = await axiosInstance.post('/api/alerts/send_global_alert/', {
          subject,
          message,
          priority,
        });
        if (response.status === 201) {
          setStatus('Alert sent successfully');
          setSubject('');
          setMessage('');
          setPriority('medium');
        }
      } catch (error) {
        console.error('Error sending alert:', error);
        setStatus('Failed to send alert');
      }
    };
  
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container component="main" maxWidth="sm">
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: 3,
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              Send Global Alert
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="subject"
                label="Subject"
                name="subject"
                autoFocus
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="message"
                label="Message"
                id="message"
                multiline
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  value={priority}
                  label="Priority"
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Send Alert
              </Button>
            </Box>
            {status && (
              <Typography 
                color={status.includes('success') ? 'success.main' : 'error.main'} 
                sx={{ mt: 2 }}
              >
                {status}
              </Typography>
            )}
          </Box>
        </Container>
      </ThemeProvider>
    );
  };
  
  export default SendAlertPage;