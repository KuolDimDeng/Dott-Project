///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EstimateForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, Grid, Paper, Select, MenuItem, InputLabel,
  FormControl, IconButton, Divider, CircularProgress, Snackbar
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PreviewIcon from '@mui/icons-material/Preview';
import SaveIcon from '@mui/icons-material/Save';
import Alert from '@mui/material/Alert';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import EstimatePreviewModal from './EstimatePreview';
import { saveEstimate, printEstimate, emailEstimate, getEstimatePdf } from '../actions/estimateActions';

const EstimateForm = ({ onSave, onPreview, initialData }) => {
  const [estimate, setEstimate] = useState(initialData || {
    title: 'Estimate',
    summary: '',
    logo: null,
    customerRef: '',
    date: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [],
    discount: 0,
    currency: 'USD',
    footer: '',
    attachments: []
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const { addMessage } = useUserMessageContext();
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [estimateId, setEstimateId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    setSelectedCustomerData(customerData);
    
    setEstimate(prevEstimate => ({
      ...prevEstimate,
      customerRef: selectedId,
      customer: customerData ? {
        id: selectedId,
        name: customerData.customerName || `${customerData.first_name} ${customerData.last_name}`
      } : null
    }));
  };




  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  useEffect(() => {
    if (userDatabase) {
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
      console.log('Fetched customers:', customers.map(c => c.id));
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.response) {
        console.error("Data:", error.response.data);
        console.error("Status:", error.response.status);
        console.error("Headers:", error.response.headers);
        setCustomersError(`Failed to load customers. Server responded with status ${error.response.status}`);
      } else if (error.request) {
        console.error("Request:", error.request);
        setCustomersError('Failed to load customers. No response received from server.');
      } else {
        console.error('Error', error.message);
        setCustomersError(`Failed to load customers. ${error.message}`);
      }
      addMessage('error', `Failed to fetch customers: ${error.message}`);
    } finally {
      setCustomersLoading(false);
    }
  };
  
  const fetchProducts = async (database_name) => {
    try {
      console.log('Fetching products from database:', database_name);
      const response = await axiosInstance.get('/api/products/', {
        params: { database: database_name },
      });
      console.log('Fetched products:', response.data);
      setProducts(response.data);
    } catch (error) {
      logger.error('Error fetching products:', error);
    }
  };
  
  const fetchServices = async (database_name) => {
    try {
      console.log('Fetching services from database:', database_name);
      const response = await axiosInstance.get('/api/services/', {
        params: { database: database_name },
      });
      console.log('Fetched services:', response.data);
      setServices(response.data);
    } catch (error) {
      logger.error('Error fetching services:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      if (!estimate.customerRef) {
        throw new Error('Please select a customer');
      }
      if (estimate.items.length === 0) {
        throw new Error('Please add at least one item');
      }

      for (let item of estimate.items) {
        if (!item.description) {
          item.description = 'No description provided';
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Please provide a valid quantity for all items');
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          throw new Error('Please provide a valid unit price for all items');
        }
      }

      const totalAmount = calculateTotal();
      const estimateData = {
        ...estimate,
        customer: estimate.customerRef,
        items: estimate.items.map(item => ({
          ...item,
          description: item.description || 'No description',
          unit_price: item.unitPrice,
        })),
        totalAmount,
      };

      console.log("Estimate data being saved:", JSON.stringify(estimateData, null, 2));

      let response;
      if (typeof onSave === 'function') {
        response = await onSave(estimateData);
      } else {
        response = await axiosInstance.post('/api/estimates/create/', estimateData);
      }

      console.log('Estimate saved successfully:', response.data);
      setSuccessMessage('Estimate saved successfully');
      addMessage('info', 'Estimate saved successfully');


    // Set the estimateId if it's returned from the server
    if (response.data && response.data.id) {
      setEstimateId(response.data.id);
    }

    } catch (err) {
      console.error('Error saving estimate:', err);
      if (err.response && err.response.data) {
        const errorMessage = typeof err.response.data === 'string' 
          ? err.response.data 
          : JSON.stringify(err.response.data);
        setError(`Failed to save estimate: ${errorMessage}`);
      } else {
        setError(err.message || 'Failed to save estimate');
      }
      addMessage('error', 'Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEstimate = async () => {
    try {
      await saveEstimate(estimateId);
      setSuccessMessage('Estimate saved successfully');
    } catch (error) {
      setError('Failed to save estimate');
    }
  };
  
  const handlePrintEstimate = async () => {
    try {
      await printEstimate(estimateId);
    } catch (error) {
      setError('Failed to print estimate');
    }
  };
  
  const handleEmailEstimate = async () => {
    try {
      await emailEstimate(estimateId);
      setSuccessMessage('Estimate emailed successfully');
    } catch (error) {
      setError('Failed to email estimate');
    }
  };
  
  const handlePreview = async () => {
    try {
      if (!estimateId) {
        // If the estimate hasn't been saved yet, save it first
        await handleSave();
      }
      
      if (estimateId) {
        console.log('Delaying...:');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Fetching estimate PDF:', estimateId);
        const pdfBlob = await getEstimatePdf(estimateId);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPreviewUrl(pdfUrl);
        setIsPreviewModalOpen(true);
      } else {
        setError('Unable to preview: Estimate has not been saved.');
      }
    } catch (error) {
      console.error('Error fetching estimate PDF:', error);
      setError('Failed to load estimate preview');
    }
  };

  const handleAddInvoiceItem = () => {
    setEstimate({
      ...estimate,
      items: [...estimate.items, { type: '', description: '', quantity: 1, unitPrice: 0, amount: 0 }]
    });
  };


  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEstimate({ ...estimate, [name]: value });
  };

  const handleDateChange = (date, name) => {
    setEstimate({ ...estimate, [name]: date });
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setEstimate({ ...estimate, logo: file });
  };

  const handleItemAdd = () => {
    setEstimate({
      ...estimate,
      items: [...estimate.items, { product: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...estimate.items];
    newItems[index][field] = value;
    
    if (field === 'product' || field === 'service') {
      const selectedItem = field === 'product'
        ? products.find((product) => product.id === value)
        : services.find((service) => service.id === value);
  
      if (selectedItem) {
        newItems[index].unitPrice = parseFloat(selectedItem.price);
        newItems[index].description = selectedItem.name || 'No description';
        newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
      }
    }
  
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
  
    const totalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  
    setEstimate({ 
      ...estimate, 
      items: newItems,
      totalAmount: totalAmount - estimate.discount
    });
  };

  const handleItemRemove = (index) => {
    const newItems = estimate.items.filter((_, i) => i !== index);
    setEstimate({ ...estimate, items: newItems });
  };

  const handleAttachmentUpload = (event) => {
    const files = Array.from(event.target.files);
    setEstimate({ ...estimate, attachments: [...estimate.attachments, ...files] });
  };

  const handleAttachmentRemove = (index) => {
    const newAttachments = estimate.attachments.filter((_, i) => i !== index);
    setEstimate({ ...estimate, attachments: newAttachments });
  };

  const calculateTotal = () => {
    return estimate.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };





  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 3, my: 2 }}>
        <Typography variant="h4" gutterBottom>
          Create New Estimate
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Estimate Title"
              name="title"
              value={estimate.title}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="logo-upload"
              type="file"
              onChange={handleLogoUpload}
            />
            <label htmlFor="logo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Upload Logo
              </Button>
            </label>
            {estimate.logo && <Typography>{estimate.logo.name}</Typography>}
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Summary"
              name="summary"
              value={estimate.summary}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Customer</InputLabel>
            <Select
              name="customerRef"
              value={estimate.customerRef}
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
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Date"
              value={estimate.date}
              onChange={(date) => handleDateChange(date, 'date')}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Valid Until"
              value={estimate.valid_until}
              onChange={(date) => handleDateChange(date, 'valid_until')}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Items
            </Typography>
            {estimate.items.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                <FormControl sx={{ mr: 2, flexGrow: 1 }}>
                  <InputLabel>Product/Service</InputLabel>
                  <Select
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                  >
                    <MenuItem value="">Select a product/service</MenuItem>
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
                    label="Description"
                    value={item.description || ''}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    fullWidth
                    required
                  />
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
          <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Discount"
                name="discount"
                value={estimate.discount}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  name="currency"
                  value={estimate.currency}
                  onChange={handleInputChange}
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Total Amount"
                value={estimate.totalAmount ? estimate.totalAmount.toFixed(2) : '0.00'}
                disabled
              />
            </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Footer"
              name="footer"
              value={estimate.footer}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <input
              accept="*/*"
              style={{ display: 'none' }}
              id="attachment-upload"
              multiple
              type="file"
              onChange={handleAttachmentUpload}
            />
            <label htmlFor="attachment-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Attach Documents
              </Button>
            </label>
            {estimate.attachments.map((file, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography>{file.name}</Typography>
                <IconButton onClick={() => handleAttachmentRemove(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              sx={{ mr: 2 }}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save and Continue'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={() => setSuccessMessage('')}>
      <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
        {successMessage}
      </Alert>
    </Snackbar>
    <EstimatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        estimateId={estimateId}  // Make sure this is correct
        onSave={handleSaveEstimate}
        onPrint={handlePrintEstimate}
        onEmail={handleEmailEstimate}
      />
  </LocalizationProvider>
);
};

export default EstimateForm;