import React, { useState } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';

const SendGlobalAlert = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await useApi.post('/api/alerts/send_global_alert/', {
        subject,
        message,
        priority,
      });
      if (response.status === 201) {
        alert('Global alert sent successfully');
        setSubject('');
        setMessage('');
        setPriority('medium');
      }
    } catch (error) {
      console.error('Error sending global alert:', error);
      alert('Failed to send global alert');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, margin: 'auto', mt: 4 }}>
      <TextField
        fullWidth
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        multiline
        rows={4}
        margin="normal"
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Priority</InputLabel>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} label="Priority">
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
        </Select>
      </FormControl>
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        Send Global Alert
      </Button>
    </Box>
  );
};

export default SendGlobalAlert;
