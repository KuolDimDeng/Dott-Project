import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useNotification } from '@/context/NotificationContext';
import PropTypes from 'prop-types';

// Tailwind theme utility to replace useTheme from MUI
const getTailwindColor = (colorName, shade = 500) => {
  const colors = {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    }
  };

  return colors[colorName]?.[shade] || colors.primary[500];
};

const InvoiceManagement = ({ newInvoice: isNewInvoiceProp = false, mode }) => {
  // Handle both newInvoice prop and mode prop for backward compatibility
  const isNewInvoice = isNewInvoiceProp || mode === 'create';
  
  const [activeTab, setActiveTab] = useState(isNewInvoice ? 0 : 2);
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
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);

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
      notifyError('Failed to fetch invoices');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      notifyError('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      notifyError('Failed to fetch products');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axiosInstance.get('/api/services/');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      notifyError('Failed to fetch services');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewInvoice((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setNewInvoice((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const handleItemAdd = () => {
    setNewInvoice((prev) => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newInvoice.items];
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

    const totalAmount = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    setNewInvoice((prev) => ({
      ...prev,
      items: newItems,
      totalAmount: totalAmount - prev.discount,
    }));
  };

  const handleItemRemove = (index) => {
    const newItems = newInvoice.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    setNewInvoice((prev) => ({
      ...prev,
      items: newItems,
      totalAmount: totalAmount - prev.discount,
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (!newInvoice.customer) {
      notifyError('Please select a customer');
      return;
    }

    try {
      const invoiceData = {
        customer: newInvoice.customer,
        date: newInvoice.date.toISOString().split('T')[0], // Send only the date part
        items: newInvoice.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unitPrice, // Changed from 'unitPrice' to 'unit_price'
        })),
        discount: newInvoice.discount,
        currency: newInvoice.currency,
        totalAmount: newInvoice.totalAmount,
      };

      console.log('Sending invoice data:', invoiceData); // For debugging

      const response = await axiosInstance.post('/api/invoices/create/', invoiceData);
      notifySuccess('Invoice created successfully');
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
      notifyError('Failed to create invoice');
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
      const response = await axiosInstance.put(
        `/api/invoices/${selectedInvoice.id}/`,
        editedInvoice
      );
      setSelectedInvoice(response.data);
      setIsEditing(false);
      fetchInvoices();
      notifySuccess('Invoice updated successfully');
    } catch (error) {
      console.error('Error updating invoice:', error);
      notifyError('Failed to update invoice');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/invoices/${selectedInvoice.id}/`);
      notifySuccess('Invoice deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
      setActiveTab(2);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      notifyError('Failed to delete invoice');
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
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">
          Invoice Management
        </h1>
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={(e) => handleTabChange(e, 0)}
            >
              Create
            </button>
            <button
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={(e) => handleTabChange(e, 1)}
            >
              Details
            </button>
            <button
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={(e) => handleTabChange(e, 2)}
            >
              List
            </button>
          </nav>
        </div>

        {activeTab === 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">
              Create Invoice
            </h2>
            <form onSubmit={handleCreateInvoice} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <select
                    id="customer"
                    name="customer"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={newInvoice.customer}
                    onChange={handleInputChange}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="invoice-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="invoice-date"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={newInvoice.date ? format(newInvoice.date, 'yyyy-MM-dd') : ''}
                    onChange={handleDateChange}
                  />
                </div>
                <div>
                  <h3 className="text-base font-medium mb-3">
                    Items
                  </h3>
                  <div className="space-y-4">
                    {newInvoice.items.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-200 rounded-md">
                        <div className="sm:flex-grow">
                          <label htmlFor={`item-product-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Product/Service
                          </label>
                          <select
                            id={`item-product-${index}`}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                        <div className="w-full sm:w-28">
                          <label htmlFor={`item-quantity-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            id={`item-quantity-${index}`}
                            type="number"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="1"
                            step="1"
                          />
                        </div>
                        <div className="w-full sm:w-36">
                          <label htmlFor={`item-unitPrice-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <input
                            id={`item-unitPrice-${index}`}
                            type="number"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end justify-end sm:w-10 pb-1">
                          <button 
                            type="button"
                            onClick={() => handleItemRemove(index)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-500 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={handleItemAdd}
                    className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Item
                  </button>
                </div>
                <div>
                  <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <input
                    id="discount"
                    name="discount"
                    type="number"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={newInvoice.discount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={newInvoice.currency}
                    onChange={handleInputChange}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    id="totalAmount"
                    type="text"
                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                    value={newInvoice.totalAmount.toFixed(2)}
                    readOnly
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Invoice
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeTab === 1 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">
              Invoice Details
            </h2>
            {selectedInvoice ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="invoice-number" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    id="invoice-number"
                    type="text"
                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                    value={selectedInvoice.invoice_num}
                    readOnly
                  />
                </div>
                
                <div>
                  <label htmlFor="detail-customer" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <input
                    id="detail-customer"
                    type="text"
                    className={`w-full rounded-md border-gray-300 shadow-sm ${!isEditing ? 'bg-gray-100' : 'focus:border-blue-500 focus:ring-blue-500'}`}
                    value={selectedInvoice.customer}
                    readOnly={!isEditing}
                  />
                </div>
                
                <div>
                  <label htmlFor="detail-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    id="detail-date"
                    type="date"
                    className={`w-full rounded-md border-gray-300 shadow-sm ${!isEditing ? 'bg-gray-100' : 'focus:border-blue-500 focus:ring-blue-500'}`}
                    value={selectedInvoice.date}
                    readOnly={!isEditing}
                  />
                </div>
                
                <div>
                  <label htmlFor="detail-total" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    id="detail-total"
                    type="text"
                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                    value={selectedInvoice.totalAmount}
                    readOnly
                  />
                </div>
                
                <div>
                  <label htmlFor="detail-discount" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <input
                    id="detail-discount"
                    type="number"
                    className={`w-full rounded-md border-gray-300 shadow-sm ${!isEditing ? 'bg-gray-100' : 'focus:border-blue-500 focus:ring-blue-500'}`}
                    value={selectedInvoice.discount}
                    readOnly={!isEditing}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label htmlFor="detail-currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <input
                    id="detail-currency"
                    type="text"
                    className={`w-full rounded-md border-gray-300 shadow-sm ${!isEditing ? 'bg-gray-100' : 'focus:border-blue-500 focus:ring-blue-500'}`}
                    value={selectedInvoice.currency}
                    readOnly={!isEditing}
                  />
                </div>
                
                <div className="pt-4 flex space-x-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select an invoice from the list to view details</p>
            )}
          </div>
        )}

        {activeTab === 2 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Invoice List
              </h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleExportClick}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Export
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 -mr-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Boolean(exportAnchorEl) && (
                  <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button 
                        className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left"
                        onClick={() => handleExport('PDF')}
                      >
                        PDF
                      </button>
                      <button 
                        className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left"
                        onClick={() => handleExport('CSV')}
                      >
                        CSV
                      </button>
                      <button 
                        className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left"
                        onClick={() => handleExport('Excel')}
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      onClick={() => handleInvoiceSelect(invoice)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_num}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.totalAmount} {invoice.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {deleteDialogOpen && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Confirm Delete
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete this invoice? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="button" 
                    onClick={handleConfirmDelete}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Delete
                  </button>
                  <button type="button" 
                    onClick={() => setDeleteDialogOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

InvoiceManagement.propTypes = {
  newInvoice: PropTypes.bool,
  mode: PropTypes.string
};

export default InvoiceManagement;
