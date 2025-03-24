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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
  PersonAdd as ConvertIcon
} from '@mui/icons-material';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';

const LeadsManagement = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLeads, setTotalLeads] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const token = useStore((state) => state.token);

  const statuses = [
    { value: 'new', label: 'New', color: 'primary' },
    { value: 'contacted', label: 'Contacted', color: 'info' },
    { value: 'qualified', label: 'Qualified', color: 'success' },
    { value: 'unqualified', label: 'Unqualified', color: 'warning' },
    { value: 'converted', label: 'Converted', color: 'secondary' }
  ];

  const sources = [
    'Website',
    'Referral',
    'Social Media',
    'Event',
    'Phone Inquiry',
    'Email Campaign',
    'Partner',
    'Other'
  ];

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        let url = `/api/crm/leads/?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`;
        if (statusFilter) {
          url += `&status=${statusFilter}`;
        }
        
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLeads(data.results || []);
          setTotalLeads(data.count || 0);
        } else {
          logger.error('Failed to fetch leads');
          // Show mock data for demonstration
          const mockLeads = [
            { id: '1', first_name: 'Thomas', last_name: 'Anderson', company_name: 'Future Tech', email: 'thomas@futuretech.com', phone: '555-1111', source: 'Website', status: 'new', assigned_to_name: 'Alex Johnson' },
            { id: '2', first_name: 'Lisa', last_name: 'Chen', company_name: 'Innovative Solutions', email: 'lisa@innosol.com', phone: '555-2222', source: 'Referral', status: 'contacted', assigned_to_name: 'Maria Garcia' },
            { id: '3', first_name: 'David', last_name: 'Williams', company_name: 'Peak Performance', email: 'david@peakperf.com', phone: '555-3333', source: 'Event', status: 'qualified', assigned_to_name: 'Alex Johnson' },
            { id: '4', first_name: 'Emily', last_name: 'Taylor', company_name: 'Global Retail', email: 'emily@globalretail.com', phone: '555-4444', source: 'Social Media', status: 'unqualified', assigned_to_name: 'James Wilson' },
            { id: '5', first_name: 'Mohammed', last_name: 'Ali', company_name: 'Fast Logistics', email: 'mohammed@fastlog.com', phone: '555-5555', source: 'Email Campaign', status: 'converted', assigned_to_name: 'Maria Garcia' },
          ];
          setLeads(mockLeads);
          setTotalLeads(mockLeads.length);
        }
      } catch (error) {
        logger.error('Error fetching leads:', error);
        // Show mock data for demonstration
        const mockLeads = [
          { id: '1', first_name: 'Thomas', last_name: 'Anderson', company_name: 'Future Tech', email: 'thomas@futuretech.com', phone: '555-1111', source: 'Website', status: 'new', assigned_to_name: 'Alex Johnson' },
          { id: '2', first_name: 'Lisa', last_name: 'Chen', company_name: 'Innovative Solutions', email: 'lisa@innosol.com', phone: '555-2222', source: 'Referral', status: 'contacted', assigned_to_name: 'Maria Garcia' },
          { id: '3', first_name: 'David', last_name: 'Williams', company_name: 'Peak Performance', email: 'david@peakperf.com', phone: '555-3333', source: 'Event', status: 'qualified', assigned_to_name: 'Alex Johnson' },
          { id: '4', first_name: 'Emily', last_name: 'Taylor', company_name: 'Global Retail', email: 'emily@globalretail.com', phone: '555-4444', source: 'Social Media', status: 'unqualified', assigned_to_name: 'James Wilson' },
          { id: '5', first_name: 'Mohammed', last_name: 'Ali', company_name: 'Fast Logistics', email: 'mohammed@fastlog.com', phone: '555-5555', source: 'Email Campaign', status: 'converted', assigned_to_name: 'Maria Garcia' },
        ];
        setLeads(mockLeads);
        setTotalLeads(mockLeads.length);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeads();
  }, [page, rowsPerPage, searchTerm, statusFilter, token]);

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

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleDeleteClick = (lead) => {
    setSelectedLead(lead);
    setOpenDeleteDialog(true);
  };

  const handleConvertClick = (lead) => {
    setSelectedLead(lead);
    setOpenConvertDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLead) return;
    
    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Remove deleted lead from the list
        setLeads(leads.filter(l => l.id !== selectedLead.id));
        setTotalLeads(totalLeads - 1);
      } else {
        logger.error('Failed to delete lead');
      }
    } catch (error) {
      logger.error('Error deleting lead:', error);
    } finally {
      setOpenDeleteDialog(false);
      setSelectedLead(null);
    }
  };

  const handleConvertConfirm = async () => {
    if (!selectedLead) return;
    
    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/convert/`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Update the lead status in the list
        setLeads(leads.map(l => 
          l.id === selectedLead.id ? { ...l, status: 'converted' } : l
        ));
      } else {
        logger.error('Failed to convert lead');
      }
    } catch (error) {
      logger.error('Error converting lead:', error);
    } finally {
      setOpenConvertDialog(false);
      setSelectedLead(null);
    }
  };

  const handleDialogCancel = () => {
    setOpenDeleteDialog(false);
    setOpenConvertDialog(false);
    setSelectedLead(null);
  };

  const getStatusChip = (status) => {
    const statusObj = statuses.find(s => s.value === status) || { label: status, color: 'default' };
    return (
      <Chip 
        label={statusObj.label} 
        color={statusObj.color} 
        size="small" 
        variant="outlined"
      />
    );
  };

  if (loading && leads.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Lead Management
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Total Leads
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {totalLeads}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                New Leads
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {leads.filter(l => l.status === 'new').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Qualified Leads
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {leads.filter(l => l.status === 'qualified').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Conversion Rate
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {leads.length > 0 
                  ? `${Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)}%` 
                  : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Toolbar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Search Leads"
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
            sx={{ minWidth: '250px' }}
          />
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: '150px' }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              {statuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
          >
            Add Lead
          </Button>
        </Box>
      </Box>
      
      {/* Leads Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{`${lead.first_name} ${lead.last_name}`}</TableCell>
                  <TableCell>{lead.company_name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>{getStatusChip(lead.status)}</TableCell>
                  <TableCell>{lead.assigned_to_name}</TableCell>
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
                    {lead.status !== 'converted' && (
                      <Tooltip title="Convert to Customer">
                        <IconButton size="small" onClick={() => handleConvertClick(lead)}>
                          <ConvertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDeleteClick(lead)}>
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
          count={totalLeads}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDialogCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Lead
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the lead 
            {selectedLead && ` "${selectedLead.first_name} ${selectedLead.last_name}"`}? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Convert Confirmation Dialog */}
      <Dialog
        open={openConvertDialog}
        onClose={handleDialogCancel}
        aria-labelledby="convert-dialog-title"
        aria-describedby="convert-dialog-description"
      >
        <DialogTitle id="convert-dialog-title">
          Convert Lead to Customer
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="convert-dialog-description">
            Are you sure you want to convert 
            {selectedLead && ` "${selectedLead.first_name} ${selectedLead.last_name}"`} 
            from {selectedLead?.company_name} to a customer? 
            This will create a new customer record in the system.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConvertConfirm} color="primary" variant="contained">
            Convert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeadsManagement;