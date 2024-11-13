import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem } from '@mui/material';
import axiosInstance from '@/lib/axiosConfig';;
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';


const ServiceManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: 0,
    sellEnabled: false,
    buyEnabled: false,
    salesTax: 0,
    duration: 0,
    is_recurring: false,
  });
  const { addMessage } = useUserMessageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedService, setEditedService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);


  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axiosInstance.get('/api/services/');
      setServices(response.data);
    } catch (error) {
      logger.error('Error fetching services', error);
      addMessage('error', 'Error fetching services');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value, checked, type } = event.target;
    setNewService(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/create-service/', newService);
      addMessage('success', 'Service created successfully');
      setNewService({
        name: '',
        description: '',
        price: 0,
        sellEnabled: false,
        buyEnabled: false,
        salesTax: 0,
        duration: 0,
        is_recurring: false,
      });
      fetchServices();
    } catch (error) {
      logger.error('Error creating service', error);
      addMessage('error', 'Error creating service');
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedService({ ...selectedService });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedService(null);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axiosInstance.patch(`/api/services/${selectedService.id}/`, editedService);
      setSelectedService(response.data);
      setIsEditing(false);
      fetchServices();
      addMessage('success', 'Service updated successfully');
    } catch (error) {
      logger.error('Error updating service', error);
      addMessage('error', 'Error updating service');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/services/${selectedService.id}/`);
      addMessage('success', 'Service deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
      setActiveTab(2);
    } catch (error) {
      logger.error('Error deleting service', error);
      addMessage('error', 'Error deleting service');
    }
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = (format) => {
    // Implement export logic here
    console.log(`Exporting to ${format}`);
    handleExportClose();
  };

  const buttonStyle = {
    color: '#000080', // Navy blue
    borderColor: '#000080',
    '&:hover': {
      backgroundColor: '#000080',
      color: 'white',
    },
  };


  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Service Management
      </Typography>
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label="Create" />
        <Tab label="Details" />
        <Tab label="List" />
      </Tabs>

      {activeTab === 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>Create Service</Typography>
          <form onSubmit={handleCreateService}>
            <TextField label="Name" name="name" value={newService.name} onChange={handleInputChange} fullWidth margin="normal" required />
            <TextField label="Description" name="description" value={newService.description} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Price" name="price" type="number" value={newService.price} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Sales Tax" name="salesTax" type="number" value={newService.salesTax} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Duration (minutes)" name="duration" type="number" value={newService.duration} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Is Recurring" name="is_recurring" type="checkbox" checked={newService.is_recurring} onChange={handleInputChange} />
            <Button type="submit" variant="contained" color="primary">Create Service</Button>
          </form>
        </Box>
      )}

      {activeTab === 1 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>Service Details</Typography>
          {selectedService ? (
            <Box>
              <TextField label="Name" name="name" value={isEditing ? editedService.name : selectedService.name} onChange={handleInputChange} fullWidth margin="normal" required disabled={!isEditing} />
              <TextField label="Description" name="description" value={isEditing ? editedService.description : selectedService.description} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Price" name="price" type="number" value={isEditing ? editedService.price : selectedService.price} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Sales Tax" name="salesTax" type="number" value={isEditing ? editedService.salesTax : selectedService.salesTax} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Duration" name="duration" type="number" value={isEditing ? editedService.duration : selectedService.duration} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Is Recurring" name="is_recurring" type="checkbox" checked={isEditing ? editedService.is_recurring : selectedService.is_recurring} onChange={handleInputChange} disabled={!isEditing} />
              {isEditing ? (
                <Box mt={2}>
                  <Button variant="contained" color="primary" onClick={handleSaveEdit}>Save</Button>
                  <Button variant="contained" color="secondary" onClick={handleCancelEdit}>Cancel</Button>
                </Box>
              ) : (
                <Box mt={2}>
                  <Button variant="contained" color="primary" onClick={handleEdit}>Edit</Button>
                  <Button variant="contained" color="secondary" onClick={handleDelete}>Delete</Button>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>Select a service from the list to view details</Typography>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box mt={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Service List</Typography>
            <Button
              variant="outlined"
              onClick={handleExportClick}
              endIcon={<ArrowDropDownIcon />}
              sx={buttonStyle}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleExportClose}
            >
              <MenuItem onClick={() => handleExport('PDF')}>PDF</MenuItem>
              <MenuItem onClick={() => handleExport('CSV')}>CSV</MenuItem>
              <MenuItem onClick={() => handleExport('Excel')}>Excel</MenuItem>
            </Menu>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} onClick={() => handleServiceSelect(service)}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.price}</TableCell>
                    <TableCell>{new Date(service.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this service?
            <br />
            Name: {selectedService?.name}
            <br />
            Description: {selectedService?.description}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceManagement;
