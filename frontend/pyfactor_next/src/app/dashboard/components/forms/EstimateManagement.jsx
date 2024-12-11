import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  useTheme,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Grid,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const EstimateManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [estimates, setEstimates] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [newEstimate, setNewEstimate] = useState({
    title: 'Estimate',
    summary: '',
    customerRef: '',
    customer_name: '',
    date: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [],
    discount: 0,
    currency: 'USD',
    footer: '',
    totalAmount: 0, // Initialize with 0
  });
  const { addMessage } = useUserMessageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logger.error('Error fetching user profile:', error);
      addMessage('error', 'Failed to fetch user profile');
    }
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    const customerData = customers.find((customer) => customer.id === selectedId);

    setNewEstimate((prevEstimate) => ({
      ...prevEstimate,
      customerRef: selectedId,
      customer: customerData
        ? {
            id: selectedId,
            name: customerData.name || `${customerData.first_name} ${customerData.last_name}`,
          }
        : null,
      customer_name: customerData
        ? customerData.customerName || `${customerData.first_name} ${customerData.last_name}`
        : '',
    }));
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      console.log('Fetching data for database:', userDatabase);
      fetchEstimates(userDatabase);
      fetchCustomers(userDatabase);
      fetchProducts(userDatabase);
      fetchServices(userDatabase);
    }
  }, [userDatabase]);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      setCustomersError(null);
      console.log('Fetching customers from database:', userDatabase);
      const response = await axiosInstance.get('/api/customers/', {
        params: { database: userDatabase },
      });
      console.log('Fetched customers:', response.data);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomersError(`Failed to load customers. ${error.message}`);
      addMessage('error', `Failed to fetch customers: ${error.message}`);
    } finally {
      setCustomersLoading(false);
    }
  };

  const transformEstimates = (estimates) => {
    return estimates.map((estimate) => ({
      ...estimate,
      customer: `${estimate.customer_name} (Account: ${estimate.customer_ref || ''})`,
      totalAmount: parseFloat(estimate.totalAmount || 0).toFixed(2), // Format the totalAmount
      items: estimate.items || [],
    }));
  };

  const fetchEstimates = async (database_name) => {
    try {
      console.log('Fetching estimates from database:', database_name);

      const response = await axiosInstance.get('/api/estimates/', {
        params: { database: database_name },
      });

      console.log('Raw API response for estimates:', response.data);

      // Use the transformEstimates function
      const transformedEstimates = transformEstimates(response.data);

      console.log('Transformed estimates:', transformedEstimates);
      setEstimates(transformedEstimates);
    } catch (error) {
      console.error('Error fetching estimates', error);
      addMessage('error', 'Error fetching estimates');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      logger.error('Error fetching products', error);
      addMessage('error', 'Error fetching products');
    }
  };

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
    const { name, value } = event.target;
    setNewEstimate((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date, name) => {
    setNewEstimate((prev) => ({
      ...prev,
      [name]: date,
    }));
  };

  const handleItemAdd = () => {
    setNewEstimate((prev) => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    if (!items) return 0;

    const total = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const discountValue = Number(discount) || 0;
    const totalAmount = total - discountValue;

    console.log('Calculated total amount:', totalAmount);
    return totalAmount;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newEstimate.items];
    newItems[index][field] = value;

    if (field === 'product') {
      const selectedItem = [...products, ...services].find((item) => item.id === value);
      if (selectedItem) {
        newItems[index].unitPrice = parseFloat(selectedItem.price) || 0;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index][field] = parseFloat(value) || 0;
    }

    const updatedEstimate = {
      ...newEstimate,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, newEstimate.discount),
    };

    console.log('Updated estimate with recalculated totalAmount:', updatedEstimate);
    setNewEstimate(updatedEstimate);
  };

  const handleDiscountChange = (event) => {
    const discount = parseFloat(event.target.value) || 0;
    setNewEstimate((prev) => ({
      ...prev,
      discount: discount,
      totalAmount: calculateTotalAmount(prev.items, discount),
    }));
  };

  const handleItemRemove = (index) => {
    const updatedItems = newEstimate.items.filter((_, i) => i !== index);
    const updatedEstimate = {
      ...newEstimate,
      items: updatedItems,
      totalAmount: calculateTotalAmount(updatedItems, newEstimate.discount),
    };
    setNewEstimate(updatedEstimate);
  };

  const handleCreateEstimate = async (e) => {
    e.preventDefault();
    if (!newEstimate.customerRef) {
      addMessage('error', 'Please select a customer');
      return;
    }
    try {
      const formatDate = (date) => {
        return date instanceof Date ? date.toISOString().split('T')[0] : date;
      };

      const transformedItems = newEstimate.items.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unitPrice),
      }));

      const estimateData = {
        ...newEstimate,
        customer: newEstimate.customerRef,
        date: formatDate(newEstimate.date),
        valid_until: formatDate(newEstimate.valid_until),
        items: transformedItems,
        discount: parseFloat(newEstimate.discount),
        totalAmount: newEstimate.totalAmount, // Make sure this is included
      };

      console.log('Estimate data being sent to create:', estimateData);

      const response = await axiosInstance.post('/api/estimates/create/', estimateData);
      console.log('Create estimate response:', response.data);

      addMessage('success', 'Estimate created successfully');

      setNewEstimate({
        title: 'Estimate',
        summary: '',
        customer_name: '',
        date: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [],
        discount: 0,
        currency: 'USD',
        footer: '',
        totalAmount: 0,
      });

      fetchEstimates();
    } catch (error) {
      console.error('Error creating estimate', error);
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
        addMessage('error', `Error creating estimate: ${JSON.stringify(error.response.data)}`);
      } else {
        addMessage('error', 'Error creating estimate');
      }
    }
  };

  const handleEstimateSelect = (estimate) => {
    console.log('Selected estimate:', estimate);
    setSelectedEstimate(estimate);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEstimate({ ...selectedEstimate });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEstimate(null);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axiosInstance.put(
        `/api/estimates/${selectedEstimate.id}/`,
        editedEstimate
      );
      setSelectedEstimate(response.data);
      setIsEditing(false);
      fetchEstimates();
      addMessage('success', 'Estimate updated successfully');
    } catch (error) {
      logger.error('Error updating estimate', error);
      addMessage('error', 'Error updating estimate');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/estimates/${selectedEstimate.id}/`);
      addMessage('success', 'Estimate deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedEstimate(null);
      fetchEstimates();
      setActiveTab(2);
    } catch (error) {
      logger.error('Error deleting estimate', error);
      addMessage('error', 'Error deleting estimate');
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
    color: '#000080',
    borderColor: '#000080',
    '&:hover': {
      backgroundColor: '#000080',
      color: 'white',
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Estimate Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>

        {activeTab === 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Create Estimate
            </Typography>
            <form onSubmit={handleCreateEstimate}>
              <TextField
                label="Title"
                name="title"
                value={newEstimate.title}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Summary"
                name="summary"
                value={newEstimate.summary}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    name="customerRef"
                    value={newEstimate.customerRef}
                    onChange={handleCustomerChange}
                    error={!!customersError}
                  >
                    <MenuItem value="">
                      <em>Select a customer</em>
                    </MenuItem>
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={String(customer.id)}>
                        {customer.customerName || `${customer.first_name} ${customer.last_name}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {customersError && (
                  <Typography color="error" variant="caption">
                    {customersError}
                  </Typography>
                )}
              </Grid>

              <DatePicker
                label="Date"
                value={newEstimate.date}
                onChange={(date) => handleDateChange(date, 'date')}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              <DatePicker
                label="Valid Until"
                value={newEstimate.valid_until}
                onChange={(date) => handleDateChange(date, 'valid_until')}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />

              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              {newEstimate.items.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                  <FormControl sx={{ mr: 2, flexGrow: 1 }}>
                    <InputLabel>Product/Service</InputLabel>
                    <Select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    >
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                      {services.map((service) => (
                        <MenuItem key={service.id} value={service.id}>
                          {service.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    sx={{ mr: 2, width: '100px' }}
                    type="number"
                    label="Quantity"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  />
                  <TextField
                    sx={{ mr: 2, width: '150px' }}
                    type="number"
                    label="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  />
                  <IconButton onClick={() => handleItemRemove(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleItemAdd}>
                Add Item
              </Button>

              <TextField
                label="Discount"
                name="discount"
                type="number"
                value={newEstimate.discount}
                onChange={handleDiscountChange}
                fullWidth
                margin="normal"
              />

              <TextField
                label="Total Amount"
                value={newEstimate.totalAmount.toFixed(2)}
                fullWidth
                margin="normal"
                disabled
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Currency</InputLabel>
                <Select name="currency" value={newEstimate.currency} onChange={handleInputChange}>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Footer"
                name="footer"
                value={newEstimate.footer}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />

              <Button type="submit" variant="contained" color="primary">
                Create Estimate
              </Button>
            </form>
          </Box>
        )}

        {activeTab === 1 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Estimate Details
            </Typography>
            {selectedEstimate ? (
              <Box>
                <TextField
                  label="Title"
                  name="title"
                  value={isEditing ? editedEstimate.title : selectedEstimate.title}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                />
                <TextField
                  label="Summary"
                  name="summary"
                  value={isEditing ? editedEstimate.summary : selectedEstimate.summary}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  disabled={!isEditing}
                />
                <TextField
                  label="Customer"
                  name="customer_name"
                  value={isEditing ? editedEstimate.customer_name : selectedEstimate.customer_name}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                />
                <TextField
                  label="Date"
                  name="date"
                  type="date"
                  value={isEditing ? editedEstimate.date : selectedEstimate.date}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Valid Until"
                  name="valid_until"
                  type="date"
                  value={isEditing ? editedEstimate.valid_until : selectedEstimate.valid_until}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                  InputLabelProps={{ shrink: true }}
                />
                {console.log('Rendering estimate details:', selectedEstimate)}

                <TextField
                  label="Total Amount"
                  name="totalAmount"
                  value={
                    isEditing
                      ? editedEstimate.totalAmount || '0.00'
                      : selectedEstimate.totalAmount
                        ? Number(selectedEstimate.totalAmount).toFixed(2)
                        : '0.00'
                  }
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">{selectedEstimate.currency}</InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Discount"
                  name="discount"
                  type="number"
                  value={isEditing ? editedEstimate.discount : selectedEstimate.discount}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                />
                <TextField
                  label="Currency"
                  name="currency"
                  value={isEditing ? editedEstimate.currency : selectedEstimate.currency}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  disabled={!isEditing}
                />
                <TextField
                  label="Footer"
                  name="footer"
                  value={isEditing ? editedEstimate.footer : selectedEstimate.footer}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  disabled={!isEditing}
                />
                {isEditing ? (
                  <Box mt={2}>
                    <Button variant="contained" color="primary" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button variant="contained" color="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Box mt={2}>
                    <Button variant="contained" color="primary" onClick={handleEdit}>
                      Edit
                    </Button>
                    <Button variant="contained" color="secondary" onClick={handleDelete}>
                      Delete
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography>Select an estimate from the list to view details</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box mt={3}>
            {console.log('Rendering estimate list:', estimates)}

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Estimate List</Typography>
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
                    <TableCell>Title</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimates.map((estimate) => (
                    <TableRow key={estimate.id} onClick={() => handleEstimateSelect(estimate)}>
                      <TableCell>{estimate.title}</TableCell>
                      <TableCell>{estimate.customer_name}</TableCell>
                      <TableCell>{new Date(estimate.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {console.log('Estimate in list row:', estimate)}
                        {estimate.totalAmount
                          ? Number(estimate.totalAmount).toFixed(2)
                          : '0.00'}{' '}
                        {estimate.currency}
                      </TableCell>
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
          <DialogTitle id="alert-dialog-title">{'Confirm Delete'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Are you sure you want to delete this estimate?
              <br />
              Title: {selectedEstimate?.title}
              <br />
              Customer: {selectedEstimate?.customer}
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
    </LocalizationProvider>
  );
};

export default EstimateManagement;
