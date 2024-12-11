import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import { Add, Edit, Delete, Check, Close } from '@mui/icons-material';
import { axiosInstance } from '@/lib/axiosConfig';

const JournalEntryManagement = () => {
  const [journalEntries, setJournalEntries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      const response = await axiosInstance.get('/api/journal-entries/');
      setJournalEntries(response.data);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/chart-of-accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleCreateEntry = () => {
    setCurrentEntry({
      date: new Date().toISOString().split('T')[0],
      description: '',
      lines: [{ account: '', description: '', debit_amount: 0, credit_amount: 0 }],
    });
    setOpenDialog(true);
  };

  const handleEditEntry = (entry) => {
    setCurrentEntry(entry);
    setOpenDialog(true);
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      try {
        await axiosInstance.delete(`/api/journal-entries/${id}/`);
        fetchJournalEntries();
      } catch (error) {
        console.error('Error deleting journal entry:', error);
      }
    }
  };

  const handleSaveEntry = async () => {
    try {
      if (currentEntry.id) {
        await axiosInstance.put(`/api/journal-entries/${currentEntry.id}/`, currentEntry);
      } else {
        await axiosInstance.post('/api/journal-entries/', currentEntry);
      }
      setOpenDialog(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }
  };

  const handleInputChange = (event, index) => {
    const { name, value } = event.target;
    if (name === 'date' || name === 'description') {
      setCurrentEntry({ ...currentEntry, [name]: value });
    } else {
      const newLines = [...currentEntry.lines];
      newLines[index] = { ...newLines[index], [name]: value };
      setCurrentEntry({ ...currentEntry, lines: newLines });
    }
  };

  const addLine = () => {
    setCurrentEntry({
      ...currentEntry,
      lines: [
        ...currentEntry.lines,
        { account: '', description: '', debit_amount: 0, credit_amount: 0 },
      ],
    });
  };

  const removeLine = (index) => {
    const newLines = currentEntry.lines.filter((_, i) => i !== index);
    setCurrentEntry({ ...currentEntry, lines: newLines });
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom>
        Journal Entry Management
      </Typography>
      <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleCreateEntry}>
        Create Journal Entry
      </Button>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {journalEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.is_posted ? 'Posted' : 'Draft'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEditEntry(entry)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteEntry(entry.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentEntry?.id ? 'Edit Journal Entry' : 'Create Journal Entry'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            name="date"
            value={currentEntry?.date || ''}
            onChange={(e) => handleInputChange(e)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            name="description"
            value={currentEntry?.description || ''}
            onChange={(e) => handleInputChange(e)}
          />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Journal Entry Lines
          </Typography>
          {currentEntry?.lines.map((line, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                select
                label="Account"
                fullWidth
                name="account"
                value={line.account}
                onChange={(e) => handleInputChange(e, index)}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Description"
                fullWidth
                name="description"
                value={line.description}
                onChange={(e) => handleInputChange(e, index)}
              />
              <TextField
                label="Debit"
                type="number"
                fullWidth
                name="debit_amount"
                value={line.debit_amount}
                onChange={(e) => handleInputChange(e, index)}
              />
              <TextField
                label="Credit"
                type="number"
                fullWidth
                name="credit_amount"
                value={line.credit_amount}
                onChange={(e) => handleInputChange(e, index)}
              />
              <IconButton onClick={() => removeLine(index)}>
                <Delete />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<Add />} onClick={addLine}>
            Add Line
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} startIcon={<Close />}>
            Cancel
          </Button>
          <Button onClick={handleSaveEntry} color="primary" startIcon={<Check />}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JournalEntryManagement;
