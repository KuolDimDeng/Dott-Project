// src/components/MonthEndManagement.jsx

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, TextField, Select, MenuItem, FormControl, 
  InputLabel, IconButton, Toolbar, InputAdornment, Drawer, List, ListItem, 
  ListItemText, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Add, FilterList, Search, Edit, Delete, CheckCircle
} from '@mui/icons-material';
import axiosInstance from '../components/axiosConfig';

const MonthEndManagement = () => {
  const [closings, setClosings] = useState([]);
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClosing, setNewClosing] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'in_progress',
    notes: ''
  });

  useEffect(() => {
    fetchClosings();
  }, []);

  const fetchClosings = async () => {
    try {
      const response = await axiosInstance.get('/api/month-end-closings/');
      setClosings(response.data);
    } catch (error) {
      console.error('Error fetching month-end closings:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClosing({ ...newClosing, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/month-end-closings/', newClosing);
      fetchClosings();
      setDialogOpen(false);
      setNewClosing({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: 'in_progress',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating month-end closing:', error);
    }
  };

  const handleTaskUpdate = async (taskId, isCompleted) => {
    try {
      await axiosInstance.put(`/api/month-end-tasks/${taskId}/`, { is_completed: isCompleted });
      const updatedClosing = await axiosInstance.get(`/api/month-end-closings/${selectedClosing.id}/`);
      setSelectedClosing(updatedClosing.data);
      fetchClosings();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <Box>
      <Toolbar>
        <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
          Month-End Closing Management
        </Typography>
        <Button startIcon={<Add />} variant="contained" color="primary" onClick={() => setDialogOpen(true)}>
          Start New Closing
        </Button>
      </Toolbar>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Started At</TableCell>
              <TableCell>Completed At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {closings.map((closing) => (
              <TableRow key={closing.id}>
                <TableCell>{closing.month}</TableCell>
                <TableCell>{closing.year}</TableCell>
                <TableCell>{closing.status}</TableCell>
                <TableCell>{new Date(closing.started_at).toLocaleString()}</TableCell>
                <TableCell>{closing.completed_at ? new Date(closing.completed_at).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setSelectedClosing(closing)}><Edit /></IconButton>
                  <IconButton size="small"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Start New Month-End Closing</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Month</InputLabel>
            <Select
              name="month"
              value={newClosing.month}
              onChange={handleInputChange}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <MenuItem key={month} value={month}>{new Date(0, month - 1).toLocaleString('default', { month: 'long' })}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            name="year"
            label="Year"
            type="number"
            value={newClosing.year}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            margin="normal"
            name="notes"
            label="Notes"
            multiline
            rows={4}
            value={newClosing.notes}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">Start Closing</Button>
        </DialogActions>
      </Dialog>

      {selectedClosing && (
        <Dialog open={Boolean(selectedClosing)} onClose={() => setSelectedClosing(null)} maxWidth="md" fullWidth>
          <DialogTitle>{`Month-End Closing - ${new Date(0, selectedClosing.month - 1).toLocaleString('default', { month: 'long' })} ${selectedClosing.year}`}</DialogTitle>
          <DialogContent>
            <Typography variant="h6" gutterBottom>Tasks</Typography>
            <List>
              {selectedClosing.tasks.map(task => (
                <ListItem key={task.id}>
                  <Checkbox
                    checked={task.is_completed}
                    onChange={(e) => handleTaskUpdate(task.id, e.target.checked)}
                  />
                  <ListItemText 
                    primary={task.name}
                    secondary={task.is_completed ? `Completed at: ${new Date(task.completed_at).toLocaleString()}` : 'Not completed'}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedClosing(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default MonthEndManagement;