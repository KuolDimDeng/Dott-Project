'use client';

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
  TablePagination,
  IconButton,
  Button,
  Tooltip,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';

const ContactsManagement = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalContacts, setTotalContacts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const token = useStore((state) => state.token);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/crm/contacts/?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setContacts(data.results || []);
          setTotalContacts(data.count || 0);
        } else {
          logger.error('Failed to fetch contacts');
          // Show mock data for demonstration
          const mockContacts = [
            { id: '1', first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '555-1234', job_title: 'CEO', customer_name: 'ABC Corp', is_primary: true },
            { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', phone: '555-2345', job_title: 'CTO', customer_name: 'XYZ Inc', is_primary: false },
            { id: '3', first_name: 'Robert', last_name: 'Johnson', email: 'robert.j@example.com', phone: '555-3456', job_title: 'Sales Manager', customer_name: 'Acme Ltd', is_primary: true },
            { id: '4', first_name: 'Sarah', last_name: 'Williams', email: 'sarah.w@example.com', phone: '555-4567', job_title: 'Marketing Director', customer_name: 'Best Co', is_primary: false },
            { id: '5', first_name: 'Michael', last_name: 'Brown', email: 'michael.b@example.com', phone: '555-5678', job_title: 'CFO', customer_name: 'Global Enterprises', is_primary: true },
          ];
          setContacts(mockContacts);
          setTotalContacts(mockContacts.length);
        }
      } catch (error) {
        logger.error('Error fetching contacts:', error);
        // Show mock data for demonstration
        const mockContacts = [
          { id: '1', first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '555-1234', job_title: 'CEO', customer_name: 'ABC Corp', is_primary: true },
          { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', phone: '555-2345', job_title: 'CTO', customer_name: 'XYZ Inc', is_primary: false },
          { id: '3', first_name: 'Robert', last_name: 'Johnson', email: 'robert.j@example.com', phone: '555-3456', job_title: 'Sales Manager', customer_name: 'Acme Ltd', is_primary: true },
          { id: '4', first_name: 'Sarah', last_name: 'Williams', email: 'sarah.w@example.com', phone: '555-4567', job_title: 'Marketing Director', customer_name: 'Best Co', is_primary: false },
          { id: '5', first_name: 'Michael', last_name: 'Brown', email: 'michael.b@example.com', phone: '555-5678', job_title: 'CFO', customer_name: 'Global Enterprises', is_primary: true },
        ];
        setContacts(mockContacts);
        setTotalContacts(mockContacts.length);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, [page, rowsPerPage, searchTerm, token]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleDeleteClick = (contact) => {
    setSelectedContact(contact);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedContact) return;
    
    try {
      const response = await fetch(`/api/crm/contacts/${selectedContact.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Remove deleted contact from the list
        setContacts(contacts.filter(c => c.id !== selectedContact.id));
        setTotalContacts(totalContacts - 1);
      } else {
        logger.error('Failed to delete contact');
      }
    } catch (error) {
      logger.error('Error deleting contact:', error);
    } finally {
      setOpenDeleteDialog(false);
      setSelectedContact(null);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setSelectedContact(null);
  };

  if (loading && contacts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Contact Management
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Total Contacts
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {totalContacts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Primary Contacts
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {contacts.filter(c => c.is_primary).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Toolbar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          label="Search Contacts"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: '300px' }}
        />
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<FilterListIcon />}
            sx={{ mr: 1 }}
          >
            Filter
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
          >
            Add Contact
          </Button>
        </Box>
      </Box>
      
      {/* Contacts Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Primary</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{`${contact.first_name} ${contact.last_name}`}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{contact.job_title}</TableCell>
                  <TableCell>{contact.customer_name}</TableCell>
                  <TableCell>{contact.is_primary ? 'Yes' : 'No'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDeleteClick(contact)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalContacts}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Contact
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the contact 
            {selectedContact && ` "${selectedContact.first_name} ${selectedContact.last_name}"`}? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactsManagement;