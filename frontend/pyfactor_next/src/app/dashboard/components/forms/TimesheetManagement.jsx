// TimesheetManagement.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';


const TimesheetManagement = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [summary, setSummary] = useState([]);
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();



  useEffect(() => {
    fetchTimesheets();
    fetchSummary();
  }, []);

  const fetchTimesheets = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/timesheets/');
      setTimesheets(response.data);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/timesheets/summary/');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleOpenDialog = (timesheet = null) => {
    setSelectedTimesheet(timesheet);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setSelectedTimesheet(null);
    setOpenDialog(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (selectedTimesheet?.id) {
        await axiosInstance.put(`/api/payroll/timesheets/${selectedTimesheet.id}/`, selectedTimesheet);
      } else {
        await axiosInstance.post('/api/payroll/timesheets/', selectedTimesheet);
      }
      fetchTimesheets();
      fetchSummary();
      handleCloseDialog();
    } catch (error) {
      console.error('Error submitting timesheet:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSelectedTimesheet(prev => ({ ...prev, [name]: value }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
    <Typography variant="h4" gutterBottom>
          Timesheet Management
        </Typography>
        
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()} sx={{ mb: 2 }}>
          Add New Timesheet
        </Button>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Hours Worked</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((timesheet) => (
                <TableRow key={timesheet.id}>
                  <TableCell>{timesheet.employee_name}</TableCell>
                  <TableCell>{new Date(timesheet.date).toLocaleDateString()}</TableCell>
                  <TableCell>{timesheet.hours_worked}</TableCell>
                  <TableCell>{timesheet.project}</TableCell>
                  <TableCell>{timesheet.status}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleOpenDialog(timesheet)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          Summary
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Total Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((item) => (
                <TableRow key={item.employee__full_name}>
                  <TableCell>{item.employee__full_name}</TableCell>
                  <TableCell>{item.total_hours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>{selectedTimesheet?.id ? 'Edit Timesheet' : 'Add Timesheet'}</DialogTitle>
          <DialogContent>
            <TextField
              name="employee"
              label="Employee ID"
              value={selectedTimesheet?.employee || ''}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <DatePicker
              label="Date"
              value={selectedTimesheet?.date ? new Date(selectedTimesheet.date) : null}
              onChange={(newDate) => setSelectedTimesheet(prev => ({ ...prev, date: newDate }))}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
            <TextField
              name="hours_worked"
              label="Hours Worked"
              type="number"
              value={selectedTimesheet?.hours_worked || ''}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="project"
              label="Project"
              value={selectedTimesheet?.project || ''}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="description"
              label="Description"
              value={selectedTimesheet?.description || ''}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              multiline
              rows={4}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} color="primary">
              {selectedTimesheet?.id ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default TimesheetManagement;