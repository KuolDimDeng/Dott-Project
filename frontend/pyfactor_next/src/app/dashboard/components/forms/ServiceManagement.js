import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  CircularProgress
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ModernFormLayout from '@/app/components/ModernFormLayout';

const ServiceManagement = ({ salesContext = false, mode, newService: isNewService = false }) => {
  // Determine initial tab based on mode
  const initialTab = mode === 'create' || isNewService ? 0 : 2;
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    is_for_sale: true,
    is_recurring: false,
    salestax: '',
    duration: '',
    billing_cycle: 'monthly',
  });
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedService, setEditedService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    logger.info('[ServiceManagement] Component mounted, fetching services');
    fetchServices();
    
    return () => {
      logger.info('[ServiceManagement] Component unmounting');
    };
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      logger.info('[ServiceManagement] Fetching services from API');
      const response = await axiosInstance.get('/api/services/');
      logger.info('[ServiceManagement] Services fetched successfully:', response.data.length);
      setServices(response.data);
    } catch (error) {
      logger.error('[ServiceManagement] Error fetching services:', error);
      let errorMessage = 'Error fetching services';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage += ` (${error.response.status})`;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    logger.debug('[ServiceManagement] Tab changed to:', newValue);
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value, checked, type } = event.target;
    logger.debug('[ServiceManagement] Input changed:', name, type === 'checkbox' ? checked : value);
    
    if (isEditing) {
      setEditedService((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    } else {
      setNewService((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    logger.info('[ServiceManagement] Creating service:', newService);
    try {
      logger.debug('[ServiceManagement] Sending POST request to /api/create-service/');
      const response = await axiosInstance.post('/api/create-service/', newService);
      logger.info('[ServiceManagement] Service created successfully:', response.data);
      toast.success('Service created successfully');
      setNewService({
        name: '',
        description: '',
        price: '',
        is_for_sale: true,
        is_recurring: false,
        salestax: '',
        duration: '',
        billing_cycle: 'monthly',
      });
      fetchServices();
      // Switch to List tab after creation
      setActiveTab(2);
    } catch (error) {
      logger.error('[ServiceManagement] Error creating service:', error);
      let errorMessage = 'Error creating service';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage += ` (${error.response.status}): ${JSON.stringify(error.response.data)}`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSelect = (service) => {
    logger.debug('[ServiceManagement] Service selected:', service.id);
    setSelectedService(service);
    setActiveTab(1);
  };

  const handleEdit = () => {
    logger.debug('[ServiceManagement] Editing service:', selectedService.id);
    setIsEditing(true);
    setEditedService({ ...selectedService });
  };

  const handleCancelEdit = () => {
    logger.debug('[ServiceManagement] Cancelling edit');
    setIsEditing(false);
    setEditedService(null);
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    logger.info('[ServiceManagement] Saving edited service:', editedService);
    try {
      const response = await axiosInstance.patch(
        `/api/services/${selectedService.id}/`,
        editedService
      );
      logger.info('[ServiceManagement] Service updated successfully:', response.data);
      setSelectedService(response.data);
      setIsEditing(false);
      fetchServices();
      toast.success('Service updated successfully');
    } catch (error) {
      logger.error('[ServiceManagement] Error updating service:', error);
      let errorMessage = 'Error updating service';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage += ` (${error.response.status})`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    logger.debug('[ServiceManagement] Opening delete dialog for service:', selectedService.id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`/api/services/${selectedService.id}/`);
      toast.success('Service deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
      setActiveTab(2);
    } catch (error) {
      logger.error('Error deleting service', error);
      toast.error('Error deleting service');
    } finally {
      setIsSubmitting(false);
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

  const filteredServices = services.filter(service => 
    service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  logger.debug('[ServiceManagement] Rendering with activeTab:', activeTab);
  
  // Create Service Form
  const renderCreateServiceForm = () => (
    <ModernFormLayout 
      title="Create New Service" 
      subtitle="Add a new service to your business offerings"
      onSubmit={handleCreateService}
      isLoading={isSubmitting}
      submitLabel="Create Service"
    >
      <Grid item xs={12} md={6}>
        <TextField
          label="Service Name"
          name="name"
          value={newService.name}
          onChange={handleInputChange}
          fullWidth
          required
          variant="outlined"
          placeholder="Enter service name"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Price"
          name="price"
          type="number"
          value={newService.price}
          onChange={handleInputChange}
          fullWidth
          required
          variant="outlined"
          placeholder="0.00"
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Description"
          name="description"
          value={newService.description}
          onChange={handleInputChange}
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          placeholder="Enter service description"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Sales Tax (%)"
          name="salestax"
          type="number"
          value={newService.salestax}
          onChange={handleInputChange}
          fullWidth
          variant="outlined"
          placeholder="0.00"
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Duration (minutes)"
          name="duration"
          type="number"
          value={newService.duration}
          onChange={handleInputChange}
          fullWidth
          variant="outlined"
          placeholder="60"
          InputProps={{
            endAdornment: <InputAdornment position="end">min</InputAdornment>,
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
          Service Options
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={newService.is_for_sale}
              onChange={handleInputChange}
              name="is_for_sale"
              color="primary"
            />
          }
          label="Available for Sale"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={newService.is_recurring}
              onChange={handleInputChange}
              name="is_recurring"
              color="primary"
            />
          }
          label="Recurring Service"
        />
      </Grid>
      {newService.is_recurring && (
        <Grid item xs={12} md={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="billing-cycle-label">Billing Cycle</InputLabel>
            <Select
              labelId="billing-cycle-label"
              id="billing-cycle"
              name="billing_cycle"
              value={newService.billing_cycle}
              onChange={handleInputChange}
              label="Billing Cycle"
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="annually">Annually</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      )}
    </ModernFormLayout>
  );

  // Service Details Form
  const renderServiceDetailsForm = () => {
    if (!selectedService) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '300px',
          p: 3
        }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No service selected
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setActiveTab(2)}
            startIcon={<DesignServicesIcon />}
          >
            Select a service from the list
          </Button>
        </Box>
      );
    }

    return (
      <ModernFormLayout 
        title={isEditing ? "Edit Service" : "Service Details"} 
        subtitle={isEditing ? "Update service information" : `Service ID: ${selectedService.id || 'N/A'}`}
        onSubmit={e => {
          e.preventDefault();
          if (isEditing) handleSaveEdit();
        }}
        isLoading={isSubmitting}
        submitLabel="Save Changes"
        footer={
          isEditing ? (
            <Button 
              variant="outlined" 
              onClick={handleCancelEdit}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
          ) : (
            <Box>
              <Button 
                variant="outlined" 
                onClick={handleEdit}
                startIcon={<EditIcon />}
                sx={{ mr: 2 }}
              >
                Edit
              </Button>
              <Button 
                variant="outlined" 
                color="error"
                onClick={handleDelete}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            </Box>
          )
        }
      >
        <Grid item xs={12} md={6}>
          <TextField
            label="Service Name"
            name="name"
            value={isEditing ? editedService.name : selectedService.name}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            disabled={!isEditing}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Price"
            name="price"
            type="number"
            value={isEditing ? editedService.price : selectedService.price}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            disabled={!isEditing}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            name="description"
            value={isEditing ? editedService.description : selectedService.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            disabled={!isEditing}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Sales Tax (%)"
            name="salestax"
            type="number"
            value={isEditing ? editedService.salestax : selectedService.salestax}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            disabled={!isEditing}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Duration (minutes)"
            name="duration"
            type="number"
            value={isEditing ? editedService.duration : selectedService.duration}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            disabled={!isEditing}
            InputProps={{
              endAdornment: <InputAdornment position="end">min</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
            Service Options
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={isEditing ? editedService.is_for_sale : selectedService.is_for_sale}
                onChange={handleInputChange}
                name="is_for_sale"
                color="primary"
                disabled={!isEditing}
              />
            }
            label="Available for Sale"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={isEditing ? editedService.is_recurring : selectedService.is_recurring}
                onChange={handleInputChange}
                name="is_recurring"
                color="primary"
                disabled={!isEditing}
              />
            }
            label="Recurring Service"
          />
        </Grid>
        {(isEditing ? editedService.is_recurring : selectedService.is_recurring) && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined" disabled={!isEditing}>
              <InputLabel id="billing-cycle-label">Billing Cycle</InputLabel>
              <Select
                labelId="billing-cycle-label"
                id="billing-cycle"
                name="billing_cycle"
                value={isEditing ? editedService.billing_cycle : selectedService.billing_cycle}
                onChange={handleInputChange}
                label="Billing Cycle"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="annually">Annually</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
      </ModernFormLayout>
    );
  };

  // Service List
  const renderServiceList = () => (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, sm: 3 },
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <Box sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 3,
          gap: 2,
        }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Services
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}>
            <TextField
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
              sx={{ minWidth: '200px' }}
            />
            
            <Button 
              variant="contained" 
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setActiveTab(0)}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: '8px',
                minHeight: '40px',
              }}
            >
              New Service
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip 
              icon={<FilterListIcon />} 
              label="All Services" 
              variant="outlined" 
              onClick={() => {}} 
            />
            <Chip 
              icon={<FilterListIcon />} 
              label="Recurring" 
              variant="outlined" 
              onClick={() => {}} 
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={fetchServices} size="small">
              <RefreshIcon />
            </IconButton>
            
            <Button
              variant="outlined"
              onClick={handleExportClick}
              endIcon={<ArrowDropDownIcon />}
              size="small"
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
              }}
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
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredServices.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No services found{searchQuery ? ` matching "${searchQuery}"` : ''}
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => setActiveTab(0)}
              startIcon={<AddCircleOutlineIcon />}
            >
              Create New Service
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow 
                    key={service.id} 
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        backgroundColor: theme => theme.palette.action.hover,
                      },
                    }}
                  >
                    <TableCell onClick={() => handleServiceSelect(service)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {service.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell onClick={() => handleServiceSelect(service)}>
                      ${parseFloat(service.price).toFixed(2)}
                    </TableCell>
                    <TableCell onClick={() => handleServiceSelect(service)}>
                      {service.duration} min
                      {service.is_recurring && (
                        <Chip 
                          label="Recurring" 
                          size="small" 
                          color="info"
                          sx={{ ml: 1, height: '20px' }}
                        />
                      )}
                    </TableCell>
                    <TableCell onClick={() => handleServiceSelect(service)}>
                      <Chip 
                        label={service.is_for_sale ? "For Sale" : "Not For Sale"} 
                        size="small" 
                        color={service.is_for_sale ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleServiceSelect(service)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => {
                        setSelectedService(service);
                        handleDelete();
                      }} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: '60px',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              minHeight: '60px',
            }
          }}
        >
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>
      </Paper>

      {activeTab === 0 && renderCreateServiceForm()}
      {activeTab === 1 && renderServiceDetailsForm()}
      {activeTab === 2 && renderServiceList()}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: '12px',
            maxWidth: '500px',
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: 'error.main' }}>
            Confirm Delete
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this service? This action cannot be undone.
          </DialogContentText>
          
          {selectedService && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: '8px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {selectedService.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${parseFloat(selectedService.price).toFixed(2)} · {selectedService.duration} min
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            variant="outlined"
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained"
            color="error" 
            autoFocus
            disableElevation
            sx={{ borderRadius: '8px', textTransform: 'none' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Delete Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceManagement;
