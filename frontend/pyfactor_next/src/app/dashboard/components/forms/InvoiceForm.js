import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast/ToastProvider';
import InvoicePreview from './InvoicePreview';
import InvoiceTemplateBuilder from './InvoiceTemplateBuilder';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import ModernFormLayout from '@/app/components/ModernFormLayout';

const InvoiceForm = ({ mode = 'create' }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [logo, setLogo] = useState(null);
  const [accentColor, setAccentColor] = useState('#000080'); // Navy blue as default
  const [template, setTemplate] = useState('Modern');
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
  const [invoiceStyle, setInvoiceStyle] = useState('modern');

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

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
      const response = await axiosInstance.get('/api/auth/profile');
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

  const handleStyleChange = (event) => {
    setInvoiceStyle(event.target.value);
    setTemplate(event.target.value === 'modern' ? 'Modern' : 'Classic');
  };

  const handleGeneratePreview = () => {
    const previewData = {
      style: invoiceStyle,
      customer: userData,
      items: invoiceItems,
      logo,
      accentColor,
      template,
      subtotal: calculateSubTotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      invoiceNumber: 'PREVIEW-001',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    };
    
    setPreviewData(previewData);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  // Render Customer Selection Tab
  const renderCustomerTab = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1" id="customer-select-label">
              Select Customer
            </label>
            <div className="relative">
              {selectedCustomer && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                </span>
              )}
              <select
                id="customer-select"
                value={selectedCustomer}
                onChange={handleCustomerChange}
                className={`w-full p-2 ${selectedCustomer ? 'pl-10' : 'pl-3'} pr-10 border ${customersError ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${customersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={customersLoading}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => {
                  const customerId = customer.customer_id || customer.customer_number || customer.id;
                  const fullName = customer.name || 
                                  customer.full_name || 
                                  (customer.first_name && customer.last_name ? `${customer.first_name} ${customer.last_name}` : '') ||
                                  customer.customerName || 
                                  customer.customer_name || 
                                  customer.email || 
                                  'Unknown Customer';
                  return (
                    <option key={customer.id} value={String(customer.id)}>
                      {fullName}: {customerId}
                    </option>
                  );
                })}
              </select>
            </div>
            {customersError && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {customersError}
              </div>
            )}
            {customersLoading && (
              <div className="flex justify-center mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-4">
          <button
            type="button"
            className="w-full h-[56px] border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 flex items-center justify-center"
            onClick={() => {
              // Navigate to create customer page or open modal
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            New Customer
          </button>
        </div>
      </div>

      {selectedCustomer && (
        <div className="mt-6 w-full">
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-medium mb-4">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  Business Name
                </p>
                <p className="font-medium">
                  {userData.business_name || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Contact Name
                </p>
                <p className="font-medium">
                  {userData?.first_name && userData?.last_name
                    ? `${userData?.first_name} ${userData?.last_name}`
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Email
                </p>
                <p className="font-medium">{userData.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Phone
                </p>
                <p className="font-medium">{userData.phone || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">
                  Billing Address
                </p>
                <p className="font-medium">
                  {userData?.address
                    ? `${userData.address}, ${userData?.city || ''}, ${userData?.state || ''} ${userData?.zip_code || ''}`
                    : 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Render Invoice Items Tab
  const renderInvoiceItemsTab = () => (
    <>
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Invoice Items</h3>
          <button 
            type="button"
            onClick={handleAddInvoiceItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Item
          </button>
        </div>

        {invoiceItems.length === 0 ? (
          <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-4">
            No items added yet. Use the 'Add Item' button to add products or services to this invoice.
          </div>
        ) : (
          <>
            {invoiceItems.map((item, index) => (
              <div 
                key={index} 
                className="mb-6 border border-gray-200 hover:border-blue-500 rounded-xl p-4 relative"
              >
                <button 
                  type="button"
                  className="absolute top-2 right-2 text-red-600 hover:bg-red-50 p-1 rounded-full"
                  onClick={() => handleRemoveInvoiceItem(index)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Type
                      </label>
                      <div className="relative">
                        {item.type && (
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            {item.type === 'product' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3.004 7l-.23-.132a1 1 0 01.372-1.364l1.75-1a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.75 1a1 1 0 01-.372 1.364L16.996 7l-.23.132a1 1 0 11-.992-1.736L16.004 6l-.23-.132a1 1 0 01-.372-1.364zm-7.746 4.754a1 1 0 01.242 1.394l-1 1.5a1 1 0 01-1.636-1.147l.67-1.008-.669-1.01a1 1 0 111.639-1.145l1 1.5a1 1 0 01.09.316zm7.456.21a1 1 0 01.905.13l1.5 1a1 1 0 01-1.11 1.664l-1.5-1a1 1 0 01-.084-1.564l.185-.13a1 1 0 01.104-.034zm-3.06-.617a1 1 0 01.788.375l1 1.25a1 1 0 01-.757 1.614h-2.5a1 1 0 01-.78-1.625l1-1.25a1 1 0 01.792-.375zm-.788 3.75a1 1 0 011.557-.833l1.5 1a1 1 0
                                .01-1.103 1.666l-1.5-1a1 1 0 01-.454-.833z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                        )}
                        <select
                          value={item.type}
                          onChange={(e) => handleInvoiceItemChange(index, 'type', e.target.value)}
                          className={`w-full p-2 ${item.type ? 'pl-10' : 'pl-3'} pr-10 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        >
                          <option value="">Select Item Type</option>
                          <option value="product">Product</option>
                          <option value="service">Service</option>
                        </select>
                      </div>
                    </div>

                    {item.type === 'product' && (
                      <div className="md:col-span-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product
                        </label>
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleInvoiceItemChange(index, 'productId', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${parseFloat(product.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {item.type === 'service' && (
                      <div className="md:col-span-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service
                        </label>
                        <select
                          value={item.serviceId || ''}
                          onChange={(e) => handleInvoiceItemChange(index, 'serviceId', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ${parseFloat(service.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-12">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleInvoiceItemChange(index, 'quantity', Math.max(1, parseFloat(e.target.value) || 0))
                          }
                          className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleInvoiceItemChange(index, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-full p-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line Total
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          value={item.amount ? `$${item.amount.toFixed(2)}` : '$0.00'}
                          readOnly
                          className="w-full p-2 pl-10 bg-gray-50 border border-gray-300 rounded-md focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
              </div>
            ))}

            <div className="mt-8 border border-gray-200 rounded-xl p-4 bg-white"> 
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-8">
                  <p className="font-semibold">Subtotal</p>
                </div>
                <div className="md:col-span-4 text-right">
                  <p>${calculateSubTotal().toFixed(2)}</p>
                </div>
                
                <div className="md:col-span-8">
                  <p className="font-semibold">Tax (10%)</p>
                </div>
                <div className="md:col-span-4 text-right">
                  <p>${calculateTax().toFixed(2)}</p>
                </div>
                
                <div className="md:col-span-12">
                  <div className="border-t border-gray-200 my-2"></div>
                </div>
                
                <div className="md:col-span-8">
                  <p className="text-lg font-bold">Total</p>
                </div>
                <div className="md:col-span-4 text-right">
                  <p className="text-lg font-bold text-blue-600">
                    ${calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  // Render Template Tab
  const renderTemplateTab = () => (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Invoice Appearance</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Invoice Style
        </label>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                className="mt-1 mr-3"
                name="invoiceStyle"
                value="modern"
                checked={invoiceStyle === 'modern'}
                onChange={handleStyleChange}
              />
              <div>
                <div className="font-medium">Modern</div>
                <p className="text-sm text-gray-600 mt-1">
                  Clean, contemporary design with a minimal layout and modern typography
                </p>
              </div>
            </label>
          </div>
          
          <div className="flex-1">
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                className="mt-1 mr-3"
                name="invoiceStyle"
                value="classic"
                checked={invoiceStyle === 'classic'}
                onChange={handleStyleChange}
              />
              <div>
                <div className="font-medium">Classic</div>
                <p className="text-sm text-gray-600 mt-1">
                  Traditional invoice format with a formal structure and conventional styling
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Logo
        </label>
        <div className="mt-1 flex items-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm"
          />
        </div>
        {logo && (
          <div className="mt-2">
            <img src={logo} alt="Company Logo Preview" className="h-16 object-contain" />
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Accent Color
        </label>
        <div className="mt-1 flex items-center">
          <input
            type="color"
            value={accentColor}
            onChange={handleAccentColorChange}
            className="h-10 w-20 p-1 border border-gray-300 rounded-md"
          />
          <span className="ml-3 text-sm text-gray-600">{accentColor}</span>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleGeneratePreview}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Preview Invoice
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      <ModernFormLayout
        title={mode === 'create' ? 'Create New Invoice' : 'Edit Invoice'}
        tabs={[
          { label: 'Customer Information', id: 'customer' },
          { label: 'Invoice Items', id: 'items' },
          { label: 'Template', id: 'template' }
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSubmit={handleSave}
        onCancel={handleCancel}
        submitLabel={isSubmitting ? 'Saving...' : 'Save Invoice'}
        isSubmitting={isSubmitting}
      >
        {activeTab === 0 && renderCustomerTab()}
        {activeTab === 1 && renderInvoiceItemsTab()}
        {activeTab === 2 && renderTemplateTab()}
      </ModernFormLayout>
      
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Invoice Preview</h3>
              <button 
                onClick={handleClosePreview}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <InvoicePreview 
                data={previewData} 
                style={invoiceStyle}
              />
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button 
                onClick={handleClosePreview}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
