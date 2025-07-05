'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';
import EstimatePreviewModal from './EstimatePreview';
import {
  saveEstimate,
  printEstimate,
  emailEstimate,
  getEstimatePdf,
} from '../actions/estimateActions';

const EstimateForm = ({ onSave, onPreview, initialData }) => {
  const [estimate, setEstimate] = useState(
    initialData || {
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
      attachments: [],
    }
  );

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [estimateId, setEstimateId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/auth/profile');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logger.error('Error fetching user profile:', error);
      toast.error('Failed to fetch user profile');
    }
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    const customerData = customers.find((customer) => customer.id === selectedId);
    setSelectedCustomerData(customerData);

    setEstimate((prevEstimate) => ({
      ...prevEstimate,
      customerRef: selectedId,
      customer: customerData
        ? {
            id: selectedId,
            name:
              customerData.customerName || `${customerData.first_name} ${customerData.last_name}`,
          }
        : null,
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
      console.log(
        'Fetched customers:',
        customers.map((c) => c.id)
      );
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.response) {
        console.error('Data:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        setCustomersError(
          `Failed to load customers. Server responded with status ${error.response.status}`
        );
      } else if (error.request) {
        console.error('Request:', error.request);
        setCustomersError('Failed to load customers. No response received from server.');
      } else {
        console.error('Error', error.message);
        setCustomersError(`Failed to load customers. ${error.message}`);
      }
      toast.error(`Failed to fetch customers: ${error.message}`);
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
        items: estimate.items.map((item) => ({
          ...item,
          description: item.description || 'No description',
          unit_price: item.unitPrice,
        })),
        totalAmount,
      };

      console.log('Estimate data being saved:', JSON.stringify(estimateData, null, 2));

      let response;
      if (typeof onSave === 'function') {
        response = await onSave(estimateData);
      } else {
        response = await axiosInstance.post('/api/estimates/create/', estimateData);
      }

      console.log('Estimate saved successfully:', response.data);
      setSuccessMessage('Estimate saved successfully');
      toast.success('Estimate saved successfully');

      // Set the estimateId if it's returned from the server
      if (response.data && response.data.id) {
        setEstimateId(response.data.id);
      }
    } catch (err) {
      console.error('Error saving estimate:', err);
      if (err.response && err.response.data) {
        const errorMessage =
          typeof err.response.data === 'string'
            ? err.response.data
            : JSON.stringify(err.response.data);
        setError(`Failed to save estimate: ${errorMessage}`);
      } else {
        setError(err.message || 'Failed to save estimate');
      }
      toast.error('Failed to save estimate');
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
        await new Promise((resolve) => setTimeout(resolve, 1000));

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
      items: [
        ...estimate.items,
        { type: '', description: '', quantity: 1, unitPrice: 0, amount: 0 },
      ],
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEstimate({ ...estimate, [name]: value });
  };

  const handleDateChange = (event, name) => {
    const date = event.target.value ? new Date(event.target.value) : null;
    setEstimate({ ...estimate, [name]: date });
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setEstimate({ ...estimate, logo: file });
  };

  const handleItemAdd = () => {
    setEstimate({
      ...estimate,
      items: [...estimate.items, { product: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...estimate.items];
    newItems[index][field] = value;

    if (field === 'product' || field === 'service') {
      const selectedItem =
        field === 'product'
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
      totalAmount: totalAmount - estimate.discount,
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
    return estimate.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Create New Estimate</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Title</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            name="title"
            value={estimate.title}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo Upload</label>
          <div className="flex items-center">
            <input
              type="file"
              id="logo-upload"
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <label
              htmlFor="logo-upload"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload Logo
            </label>
            {estimate.logo && <span className="ml-2">{estimate.logo.name}</span>}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={3}
            name="summary"
            value={estimate.summary}
            onChange={handleInputChange}
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <select
            className={`w-full p-2 border ${customersError ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white`}
            name="customerRef"
            value={estimate.customerRef}
            onChange={handleCustomerChange}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={String(customer.id)}>
                {customer.customerName || `${customer.first_name} ${customer.last_name}`}
              </option>
            ))}
          </select>
          {customersError && <p className="mt-1 text-sm text-red-500">{customersError}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(estimate.date)}
              onChange={(e) => handleDateChange(e, 'date')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formatDate(estimate.valid_until)}
              onChange={(e) => handleDateChange(e, 'valid_until')}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium mb-2">Items</h3>
          {estimate.items.map((item, index) => (
            <div key={index} className="flex flex-wrap items-center mb-4 gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product/Service</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  value={item.product}
                  onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                >
                  <option value="">Select a product/service</option>
                  <optgroup label="Products">
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Services">
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={item.description || ''}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                />
              </div>
              <div className="mt-5">
                <button 
                  type="button" 
                  onClick={() => handleItemRemove(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleItemAdd}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Item
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md"
            name="discount"
            value={estimate.discount}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md bg-white"
            name="currency"
            value={estimate.currency}
            onChange={handleInputChange}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
            value={estimate.totalAmount ? estimate.totalAmount.toFixed(2) : '0.00'}
            disabled
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Footer</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={3}
            name="footer"
            value={estimate.footer}
            onChange={handleInputChange}
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
          <div className="flex items-center">
            <input
              type="file"
              id="attachment-upload"
              className="hidden"
              multiple
              onChange={handleAttachmentUpload}
            />
            <label
              htmlFor="attachment-upload"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Attach Documents
            </label>
          </div>
          {estimate.attachments.map((file, index) => (
            <div key={index} className="flex items-center mt-2">
              <span className="mr-2">{file.name}</span>
              <button
                type="button"
                onClick={() => handleAttachmentRemove(index)}
                className="text-red-500 hover:text-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="md:col-span-2">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handlePreview}
              className="px-4 py-2 flex items-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Preview
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 flex items-center bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              Save and Continue
            </button>
          </div>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
          <button type="button" onClick={() => setError('')} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
          <button type="button" onClick={() => setSuccessMessage('')} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <EstimatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        estimateId={estimateId}
        onSave={handleSaveEstimate}
        onPrint={handlePrintEstimate}
        onEmail={handleEmailEstimate}
      />
    </div>
  );
};

export default EstimateForm;