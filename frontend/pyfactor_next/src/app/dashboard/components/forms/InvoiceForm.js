import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  InputAdornment,
  Tooltip,
  Chip
} from '@mui/material';
import { useToast } from '@/components/Toast/ToastProvider';
import InvoicePreview from './InvoicePreview';
import InvoiceTemplateBuilder from './InvoiceTemplateBuilder';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CategoryIcon from '@mui/icons-material/Category';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DescriptionIcon from '@mui/icons-material/Description';
import NumbersIcon from '@mui/icons-material/Numbers';
import PaidIcon from '@mui/icons-material/Paid';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ModernFormLayout from '@/app/components/ModernFormLayout';

const InvoiceForm = ({ mode = 'create' }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [logo, setLogo] = useState(null);
  const [accentColor, setAccentColor] = useState('#000080'); // Navy blue as default
  const [template, setTemplate] = useState('Contemporary');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
  });
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [userDatabase, setUserDatabase] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    logger.info('[InvoiceForm] Component mounted');
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchCustomers(userDatabase);
      fetchProducts(userDatabase);
      fetchServices(userDatabase);
    }
  }, [userDatabase]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const fetchUserProfile = async () => {
    try {
      logger.info('[InvoiceForm] Fetching user profile');
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.info('[InvoiceForm] User profile fetched:', response.data);
      logger.debug('[InvoiceForm] User database:', response.data.database_name);
    } catch (error) {
      logger.error('[InvoiceForm] Error fetching user profile:', error);
      toast.error('Failed to fetch user profile');
    }
  };

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      setCustomersError(null);
      logger.info('[InvoiceForm] Fetching customers from database:', userDatabase);
      const response = await axiosInstance.get('/api/customers/', {
        params: { database: userDatabase },
      });
      logger.info('[InvoiceForm] Fetched customers:', response.data.length);
      setCustomers(response.data);
    } catch (error) {
      logger.error('[InvoiceForm] Error fetching customers:', error);
      let errorMessage = 'Failed to load customers';
      
      if (error.response) {
        logger.error('[InvoiceForm] Error response:', error.response.status, error.response.data);
        errorMessage += ` (${error.response.status})`;
      } else if (error.request) {
        logger.error('[InvoiceForm] No response received');
        errorMessage += '. No response received from server.';
      } else {
        logger.error('[InvoiceForm] Error message:', error.message);
        errorMessage += `. ${error.message}`;
      }
      
      setCustomersError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchProducts = async (database_name) => {
    try {
      logger.info('[InvoiceForm] Fetching products from database:', database_name);
      const response = await axiosInstance.get('/api/products/', {
        params: { database: database_name },
      });
      logger.info('[InvoiceForm] Fetched products:', response.data.length);
      setProducts(response.data);
    } catch (error) {
      logger.error('[InvoiceForm] Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchServices = async (database_name) => {
    try {
      logger.info('[InvoiceForm] Fetching services from database:', database_name);
      const response = await axiosInstance.get('/api/services/', {
        params: { database: database_name },
      });
      logger.info('[InvoiceForm] Fetched services:', response.data.length);
      setServices(response.data);
    } catch (error) {
      logger.error('[InvoiceForm] Error fetching services:', error);
      toast.error('Failed to fetch services');
    }
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    logger.debug('[InvoiceForm] Selected customer ID:', selectedId);
    setSelectedCustomer(selectedId);

    const selectedCustomerData = customers.find((customer) => customer.id === selectedId);
    logger.debug('[InvoiceForm] Selected customer data:', selectedCustomerData);

    if (selectedCustomerData) {
      setUserData({
        first_name: selectedCustomerData.first_name || '',
        last_name: selectedCustomerData.last_name || '',
        business_name: selectedCustomerData.customerName || '',
        address: selectedCustomerData.street || '',
        city: selectedCustomerData.city || '',
        state: selectedCustomerData.billingState || '',
        zip_code: selectedCustomerData.postcode || '',
        phone: selectedCustomerData.phone || '',
        email: selectedCustomerData.email || '',
      });
    } else {
      logger.debug('[InvoiceForm] No customer found with id:', selectedId);
    }
  };

  const handleOpenTemplateBuilder = () => {
    const windowFeatures = 'width=800,height=600,resizable=yes,scrollbars=yes';
    const windowName = '_blank';
    const url = '/invoice-template-builder';
    window.open(url, windowName, windowFeatures);
  };

  const handleCloseTemplateBuilder = () => {
    setShowTemplateBuilder(false);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setLogo(URL.createObjectURL(file));
  };

  const handleAccentColorChange = (event) => {
    setAccentColor(event.target.value);
  };

  const handleTemplateChange = (event) => {
    setTemplate(event.target.value);
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { type: '', description: '', quantity: 1, unitPrice: 0, amount: 0 },
    ]);
  };

  const handleRemoveInvoiceItem = (index) => {
    const updatedItems = [...invoiceItems];
    updatedItems.splice(index, 1);
    setInvoiceItems(updatedItems);
  };

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;

    if (field === 'productId' || field === 'serviceId') {
      const selectedItem =
        field === 'productId'
          ? products.find((product) => product.id === value)
          : services.find((service) => service.id === value);

      if (selectedItem && selectedItem.price) {
        updatedItems[index].unitPrice = parseFloat(selectedItem.price);
        updatedItems[index].description = selectedItem.name || selectedItem.description || '';
        updatedItems[index].amount = updatedItems[index].quantity * parseFloat(selectedItem.price);
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setInvoiceItems(updatedItems);
  };

  const handleSave = async () => {
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    const subtotal = invoiceItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    if (total <= 0) {
      toast.error('Invoice total must be greater than zero');
      return;
    }

    try {
      setIsSubmitting(true);
      logger.info('[InvoiceForm] Saving invoice');
      
      // Generate a unique invoice number
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}${month}${day}`;

      // Fetch the last invoice number from the server or local storage
      const lastInvoiceNumber = await getLastInvoiceNumber();
      let newInvoiceNumber;

      if (lastInvoiceNumber) {
        const lastNumber = parseInt(lastInvoiceNumber.replace(/\D/g, ''), 10);
        newInvoiceNumber = `INV${String(lastNumber + 1).padStart(5, '0')}`;
      } else {
        newInvoiceNumber = `INV00001`;
      }

      const formattedDate = currentDate.toISOString().split('T')[0]; // This will give you YYYY-MM-DD

      // Correct transaction data format
      const transactionData = {
        description: 'Invoice Transaction',
        account: 1, // Make sure this is a valid account ID
        type: 'credit',
        amount: total,
        notes: 'Automatically created for invoice',
        date: formattedDate, // Add the transaction date
      };

      const invoiceData = {
        invoice_num: newInvoiceNumber,
        customer: selectedCustomer,
        amount: total,
        due_date: formattedDate,
        status: 'draft',
        transaction: transactionData,
        date: formattedDate, // Add the invoice date
        items: invoiceItems.map((item) => ({
          product: item.productId,
          service: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          amount: item.amount,
        })),
      };

      // Save the new invoice number to the server or local storage
      await saveInvoiceNumber(newInvoiceNumber);
      logger.info('[InvoiceForm] Invoice data being sent to server:', invoiceData);
      const response = await axiosInstance.post('/api/invoices/create/', invoiceData);

      logger.info('[InvoiceForm] Invoice created successfully', response.data);
      toast.success('Invoice created successfully');
      
      // Reset form or navigate to invoice list
      setInvoiceItems([]);
      setSelectedCustomer('');
    } catch (error) {
      logger.error('[InvoiceForm] Error creating invoice:', error);
      let errorMessage = 'Error creating invoice';
      
      if (error.response) {
        logger.error('[InvoiceForm] Response data:', error.response.data);
        logger.error('[InvoiceForm] Response status:', error.response.status);
        errorMessage += ` (${error.response.status})`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to fetch the last invoice number from the server or local storage
  const getLastInvoiceNumber = async () => {
    // Implement logic to fetch the last invoice number from the server or local storage
    // Return the last invoice number or null if not found
    return null; // Replace with your implementation
  };

  // Function to save the new invoice number to the server or local storage
  const saveInvoiceNumber = async (invoiceNumber) => {
    // Implement logic to save the new invoice number to the server or local storage
    // Return a promise or handle any necessary operations
  }; // Replace with your implementation

  const handleCancel = () => {
    // Reset form data or navigate to the previous page
    if (invoiceItems.length > 0) {
      if (confirm('Are you sure you want to cancel? Your changes will be lost.')) {
        setInvoiceItems([]);
        setSelectedCustomer('');
      }
    } else {
      setInvoiceItems([]);
      setSelectedCustomer('');
    }
  };

  // Calculate totals
  const calculateSubTotal = () => {
    return invoiceItems.reduce((total, item) => total + (item.amount || 0), 0);
  };

  const calculateTax = () => {
    return calculateSubTotal() * 0.1; // 10% tax
  };

  const calculateTotal = () => {
    return calculateSubTotal() + calculateTax();
  };

  // Render Customer Selection Tab
  const renderCustomerTab = () => (
    <>
      <Grid item xs={12} md={8}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="customer-select-label">Select Customer</InputLabel>
          <Select
            labelId="customer-select-label"
            id="customer-select"
            value={selectedCustomer}
            onChange={handleCustomerChange}
            label="Select Customer"
            error={!!customersError}
            disabled={customersLoading}
            startAdornment={
              selectedCustomer && (
                <InputAdornment position="start">
                  <PersonAddIcon color="primary" />
                </InputAdornment>
              )
            }
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
          <Alert severity="error" sx={{ mt: 2 }}>
            {customersError}
          </Alert>
        )}
        {customersLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          fullWidth
          sx={{ height: '56px' }}
          onClick={() => {
            // Navigate to create customer page or open modal
          }}
        >
          New Customer
        </Button>
      </Grid>

      {selectedCustomer && (
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ mt: 3, borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Business Name
                  </Typography>
                  <Typography variant="body1">
                    {userData.business_name || 'Not provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Contact Name
                  </Typography>
                  <Typography variant="body1">
                    {userData.first_name && userData.last_name
                      ? `${userData.first_name} ${userData.last_name}`
                      : 'Not provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{userData.email || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{userData.phone || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Billing Address
                  </Typography>
                  <Typography variant="body1">
                    {userData.address
                      ? `${userData.address}, ${userData.city}, ${userData.state} ${userData.zip_code}`
                      : 'Not provided'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </>
  );

  // Render Invoice Items Tab
  const renderInvoiceItemsTab = () => (
    <>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Invoice Items</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddInvoiceItem}
            startIcon={<AddIcon />}
            sx={{ borderRadius: '8px' }}
          >
            Add Item
          </Button>
        </Box>

        {invoiceItems.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No items added yet. Use the 'Add Item' button to add products or services to this invoice.
          </Alert>
        ) : (
          <>
            {invoiceItems.map((item, index) => (
              <Card 
                key={index} 
                variant="outlined" 
                sx={{ 
                  mb: 3, 
                  borderRadius: '12px',
                  position: 'relative',
                  '&:hover': { borderColor: 'primary.main' } 
                }}
              >
                <CardContent>
                  <IconButton 
                    size="small" 
                    color="error" 
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => handleRemoveInvoiceItem(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Item Type</InputLabel>
                        <Select
                          value={item.type}
                          onChange={(e) => handleInvoiceItemChange(index, 'type', e.target.value)}
                          label="Item Type"
                          startAdornment={
                            item.type && (
                              <InputAdornment position="start">
                                {item.type === 'product' ? <CategoryIcon /> : <DesignServicesIcon />}
                              </InputAdornment>
                            )
                          }
                        >
                          <MenuItem value="">Select Item Type</MenuItem>
                          <MenuItem value="product">Product</MenuItem>
                          <MenuItem value="service">Service</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {item.type === 'product' && (
                      <Grid item xs={12} md={8}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel>Product</InputLabel>
                          <Select
                            value={item.productId || ''}
                            onChange={(e) => handleInvoiceItemChange(index, 'productId', e.target.value)}
                            label="Product"
                          >
                            <MenuItem value="">Select a product</MenuItem>
                            {products.map((product) => (
                              <MenuItem key={product.id} value={product.id}>
                                {product.name} - ${parseFloat(product.price).toFixed(2)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {item.type === 'service' && (
                      <Grid item xs={12} md={8}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel>Service</InputLabel>
                          <Select
                            value={item.serviceId || ''}
                            onChange={(e) => handleInvoiceItemChange(index, 'serviceId', e.target.value)}
                            label="Service"
                          >
                            <MenuItem value="">Select a service</MenuItem>
                            {services.map((service) => (
                              <MenuItem key={service.id} value={service.id}>
                                {service.name} - ${parseFloat(service.price).toFixed(2)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <TextField
                        label="Description"
                        value={item.description}
                        onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                        fullWidth
                        variant="outlined"
                        placeholder="Item description"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DescriptionIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleInvoiceItemChange(index, 'quantity', Math.max(1, parseFloat(e.target.value) || 0))
                        }
                        fullWidth
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <NumbersIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Unit Price"
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleInvoiceItemChange(index, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        fullWidth
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Line Total"
                        value={item.amount ? `$${item.amount.toFixed(2)}` : '$0.00'}
                        InputProps={{ 
                          readOnly: true,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PaidIcon color="action" />
                            </InputAdornment>
                          )
                        }}
                        fullWidth
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Card 
              variant="outlined" 
              sx={{ 
                mt: 4, 
                borderRadius: '12px',
                backgroundColor: 'background.paper'
              }}
            >
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Subtotal</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" align="right">${calculateSubTotal().toFixed(2)}</Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Tax (10%)</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" align="right">${calculateTax().toFixed(2)}</Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Total</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" align="right" color="primary.main">
                      ${calculateTotal().toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}
      </Grid>
    </>
  );

  // Render Template Tab
  const renderTemplateTab = () => (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Invoice Template
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenTemplateBuilder}
          startIcon={<ReceiptIcon />}
          sx={{ mb: 3, borderRadius: '8px' }}
        >
          Open Template Builder
        </Button>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Template Style</InputLabel>
              <Select
                value={template}
                onChange={handleTemplateChange}
                label="Template Style"
              >
                <MenuItem value="Contemporary">Contemporary</MenuItem>
                <MenuItem value="Professional">Professional</MenuItem>
                <MenuItem value="Classic">Classic</MenuItem>
                <MenuItem value="Modern">Modern</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Accent Color"
              type="color"
              value={accentColor}
              onChange={handleAccentColorChange}
              fullWidth
              InputProps={{
                startAdornment: (
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      backgroundColor: accentColor,
                      mr: 1
                    }} 
                  />
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="outlined" 
              component="label"
              sx={{ mt: 2, borderRadius: '8px' }}
            >
              Upload Logo
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleLogoUpload}
              />
            </Button>
            {logo && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Logo Preview:
                </Typography>
                <img src={logo} alt="Logo Preview" style={{ maxHeight: '50px' }} />
              </Box>
            )}
          </Grid>
        </Grid>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          Preview
        </Typography>
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
          <InvoicePreview
            logo={logo}
            accentColor={accentColor}
            template={template}
            userData={userData}
            invoiceItems={invoiceItems}
            products={products}
            services={services}
          />
        </Paper>
      </Grid>
    </>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto' }}>
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
          <Tab label="Customer" />
          <Tab label="Invoice Items" />
          <Tab label="Template" />
        </Tabs>
      </Paper>

      <ModernFormLayout
        title="Create New Invoice"
        subtitle="Generate a professional invoice for your customers"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        isLoading={isSubmitting}
        submitLabel="Save Invoice"
        startIcon={<SaveIcon />}
        submitDisabled={invoiceItems.length === 0 || !selectedCustomer}
        footer={
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            sx={{ mr: 2, borderRadius: '8px', textTransform: 'none' }}
          >
            Cancel
          </Button>
        }
      >
        {activeTab === 0 && renderCustomerTab()}
        {activeTab === 1 && renderInvoiceItemsTab()}
        {activeTab === 2 && renderTemplateTab()}

        {activeTab < 2 && (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setActiveTab(activeTab + 1)}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Next: {activeTab === 0 ? 'Invoice Items' : 'Template'}
            </Button>
          </Grid>
        )}
      </ModernFormLayout>
    </Box>
  );
};

export default InvoiceForm;
