import React, { useState, useEffect } from 'react';
import { Box, useTheme, Typography, Tabs, Tab, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem, FormControl, InputLabel, Select, IconButton, Grid, FormHelperText } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const SalesOrderManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [salesOrders, setSalesOrders] = useState([]);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState(null);
  const [newSalesOrder, setNewSalesOrder] = useState({
    customer: '',
    date: new Date(),
    items: [],
    discount: 0,
    currency: 'USD',
    totalAmount: 0,
  });
  const { addMessage } = useUserMessageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSalesOrder, setEditedSalesOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const theme = useTheme();


  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
    fetchProducts();
    fetchServices();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      const response = await axiosInstance.get('/api/salesorders/');
      setSalesOrders(response.data);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      addMessage('error', 'Failed to fetch sales orders');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addMessage('error', 'Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      addMessage('error', 'Failed to fetch products');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axiosInstance.get('/api/services/');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      addMessage('error', 'Failed to fetch services');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewSalesOrder(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setNewSalesOrder(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleItemAdd = () => {
    setNewSalesOrder(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    return total - discount;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newSalesOrder.items];
    newItems[index][field] = value;
  
    if (field === 'product') {
      const selectedItem = [...products, ...services].find(item => item.id === value);
      if (selectedItem) {
        newItems[index].unitPrice = parseFloat(selectedItem.price) || 0;
      }
    }
  
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index][field] = parseFloat(value) || 0;
    }
  
    const updatedSalesOrder = {
      ...newSalesOrder,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, newSalesOrder.discount)
    };
  
    setNewSalesOrder(updatedSalesOrder);
  };

  const handleDiscountChange = (event) => {
    const discount = parseFloat(event.target.value) || 0;
    setNewSalesOrder(prev => ({
      ...prev,
      discount: discount,
      totalAmount: calculateTotalAmount(prev.items, discount)
    }));
  };

  const handleItemRemove = (index) => {
    const newItems = newSalesOrder.items.filter((_, i) => i !== index);
    setNewSalesOrder(prev => ({
      ...prev,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, prev.discount)
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
  
    if (!newInvoice.customer) {
      addMessage('error', 'Please select a customer');
      return;
    }
  
    try {
      const invoiceData = {
        customer: newInvoice.customer,
        date: newInvoice.date.toISOString().split('T')[0], // Send only the date part
        items: newInvoice.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unitPrice // Make sure this field is named 'unit_price'
        })),
        discount: newInvoice.discount,
        currency: newInvoice.currency,
        amount: newInvoice.totalAmount
      };
  
      console.log('Sending invoice data:', invoiceData); // For debugging
  
      const response = await axiosInstance.post('/api/invoices/create/', invoiceData);
      addMessage('success', 'Invoice created successfully');
      setNewInvoice({
        customer: '',
        date: new Date(),
        items: [],
        discount: 0,
        currency: 'USD',
        totalAmount: 0,
      });
      fetchInvoices();
    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
      }
      addMessage('error', 'Failed to create invoice');
    }
  };
  const handleCreateSalesOrder = (event) => {
    event.preventDefault();
    // Here you would typically send this data to your backend
    console.log('Creating sales order with:', { customer, product, quantity });
    // Reset form fields after submission
    setCustomer('');
    setProduct('');
    setQuantity('');
  };


  const handleSalesOrderSelect = (salesOrder) => {
    setSelectedSalesOrder(salesOrder);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedSalesOrder({ ...selectedSalesOrder });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSalesOrder(null);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axiosInstance.put(`/api/salesorders/${selectedSalesOrder.id}/`, editedSalesOrder);
      setSelectedSalesOrder(response.data);
      setIsEditing(false);
      fetchSalesOrders();
      addMessage('success', 'Sales order updated successfully');
    } catch (error) {
      console.error('Error updating sales order:', error);
      addMessage('error', 'Failed to update sales order');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/salesorders/${selectedSalesOrder.id}/`);
      addMessage('success', 'Sales order deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedSalesOrder(null);
      fetchSalesOrders();
      setActiveTab(2);
    } catch (error) {
      console.error('Error deleting sales order:', error);
      addMessage('error', 'Failed to delete sales order');
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
    <Typography variant="h4" gutterBottom>
          Sales Order Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>

        {activeTab === 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Create Sales Order</Typography>
            <form onSubmit={handleCreateSalesOrder}>
            <FormControl fullWidth margin="normal" required>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    name="customer"
                    value={newSalesOrder.customer}
                    onChange={handleInputChange}
                    error={!newSalesOrder.customer}
                  >
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </MenuItem>
                    ))}
                  </Select>
                  {!newSalesOrder.customer && (
                    <FormHelperText error>Please select a customer</FormHelperText>
                  )}
                </FormControl>
              
              <DatePicker
                label="Date"
                value={newSalesOrder.date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              
              <Typography variant="h6" gutterBottom>Items</Typography>
              {newSalesOrder.items.map((item, index) => (
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
                value={newSalesOrder.discount} 
                onChange={handleDiscountChange} 
                fullWidth 
                margin="normal" 
              />
              
              <TextField 
                label="Total Amount" 
                value={newSalesOrder.totalAmount.toFixed(2)} 
                fullWidth 
                margin="normal" 
                disabled 
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Currency</InputLabel>
                <Select
                  name="currency"
                  value={newSalesOrder.currency}
                  onChange={handleInputChange}
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                </Select>
              </FormControl>
              
              <Button type="submit" variant="contained" color="primary">Create Sales Order</Button>
            </form>
          </Box>
        )}

        {activeTab === 1 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Sales Order Details</Typography>
            {selectedSalesOrder ? (
              <Box>
                <TextField label="Order Number" value={selectedSalesOrder.order_number} fullWidth margin="normal" disabled />
                <TextField label="Customer" value={selectedSalesOrder.customer} fullWidth margin="normal" disabled={!isEditing} />
                <TextField label="Date" type="date" value={selectedSalesOrder.date} fullWidth margin="normal" disabled={!isEditing} InputLabelProps={{ shrink: true }} />
                <TextField label="Total Amount" value={selectedSalesOrder.totalAmount} fullWidth margin="normal" disabled />
                <TextField label="Discount" value={selectedSalesOrder.discount} fullWidth margin="normal" disabled={!isEditing} />
                <TextField label="Currency" value={selectedSalesOrder.currency} fullWidth margin="normal" disabled={!isEditing} />
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
              <Typography>Select a sales order from the list to view details</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Sales Order List</Typography>
              <Button
                variant="outlined"
                onClick={handleExportClick}
                endIcon={<ArrowDropDownIcon />}
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
                    <TableCell>Order Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesOrders.map((salesOrder) => (
                    <TableRow key={salesOrder.id} onClick={() => handleSalesOrderSelect(salesOrder)}>
                      <TableCell>{salesOrder.order_number}</TableCell>
                      <TableCell>{salesOrder.customer}</TableCell>
                      <TableCell>{new Date(salesOrder.date).toLocaleDateString()}</TableCell>
                      <TableCell>{salesOrder.totalAmount} {salesOrder.currency}</TableCell>
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
              Are you sure you want to delete this sales order?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} color="secondary" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default SalesOrderManagement;