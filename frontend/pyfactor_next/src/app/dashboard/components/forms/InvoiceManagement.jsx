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
  Grid,
  IconButton,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import axiosInstance from '@/lib/axiosConfig';;
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const InvoiceManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    customer: '',
    date: new Date(),
    items: [],
    discount: 0,
    currency: 'USD',
    totalAmount: 0,
  });
  const { addMessage } = useUserMessageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const theme = useTheme();


  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchServices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axiosInstance.get('/api/invoices/');
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      addMessage('error', 'Failed to fetch invoices');
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
    setNewInvoice(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setNewInvoice(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleItemAdd = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newInvoice.items];
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
  
    const totalAmount = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
    setNewInvoice(prev => ({
      ...prev,
      items: newItems,
      totalAmount: totalAmount - prev.discount
    }));
  };

  const handleItemRemove = (index) => {
    const newItems = newInvoice.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setNewInvoice(prev => ({
      ...prev,
      items: newItems,
      totalAmount: totalAmount - prev.discount
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
          unit_price: item.unitPrice // Changed from 'unitPrice' to 'unit_price'
        })),
        discount: newInvoice.discount,
        currency: newInvoice.currency,
        totalAmount: newInvoice.totalAmount
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

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedInvoice({ ...selectedInvoice });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedInvoice(null);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axiosInstance.put(`/api/invoices/${selectedInvoice.id}/`, editedInvoice);
      setSelectedInvoice(response.data);
      setIsEditing(false);
      fetchInvoices();
      addMessage('success', 'Invoice updated successfully');
    } catch (error) {
      console.error('Error updating invoice:', error);
      addMessage('error', 'Failed to update invoice');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/invoices/${selectedInvoice.id}/`);
      addMessage('success', 'Invoice deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
      setActiveTab(2);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      addMessage('error', 'Failed to delete invoice');
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
          Invoice Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>

        {activeTab === 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Create Invoice</Typography>
            <form onSubmit={handleCreateInvoice}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Customer</InputLabel>
                    <Select
                      name="customer"
                      value={newInvoice.customer}
                      onChange={handleInputChange}
                    >
                      {customers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.customerName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <DatePicker
                    label="Date"
                    value={newInvoice.date}
                    onChange={handleDateChange}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Items</Typography>
                  {newInvoice.items.map((item, index) => (
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
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Discount"
                    name="discount"
                    type="number"
                    value={newInvoice.discount}
                    onChange={handleInputChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      name="currency"
                      value={newInvoice.currency}
                      onChange={handleInputChange}
                    >
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Total Amount"
                    value={newInvoice.totalAmount.toFixed(2)}
                    fullWidth
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" color="primary">
                    Create Invoice
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}

        {activeTab === 1 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Invoice Details</Typography>
            {selectedInvoice ? (
              <Box>
                <TextField label="Invoice Number" value={selectedInvoice.invoice_num} fullWidth margin="normal" disabled />
                <TextField label="Customer" value={selectedInvoice.customer} fullWidth margin="normal" disabled={!isEditing} />
                <TextField label="Date" type="date" value={selectedInvoice.date} fullWidth margin="normal" disabled={!isEditing} InputLabelProps={{ shrink: true }} />
                <TextField label="Total Amount" value={selectedInvoice.totalAmount} fullWidth margin="normal" disabled />
                <TextField label="Discount" value={selectedInvoice.discount} fullWidth margin="normal" disabled={!isEditing} />
                <TextField label="Currency" value={selectedInvoice.currency} fullWidth margin="normal" disabled={!isEditing} />
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
              <Typography>Select an invoice from the list to view details</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Invoice List</Typography>
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
                    <TableCell>Invoice Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} onClick={() => handleInvoiceSelect(invoice)}>
                      <TableCell>{invoice.invoice_num}</TableCell>
                      <TableCell>{invoice.customer}</TableCell>
                      <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.totalAmount} {invoice.currency}</TableCell>
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
              Are you sure you want to delete this invoice?
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

export default InvoiceManagement;