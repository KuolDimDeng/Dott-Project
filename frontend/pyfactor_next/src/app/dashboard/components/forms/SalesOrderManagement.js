import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';

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
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSalesOrder, setEditedSalesOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
    fetchProducts();
    fetchServices();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      console.log('[DEBUG] Fetching sales orders from API');
      const response = await axiosInstance.get('/api/salesorders/');
      
      console.log('[DEBUG] Sales orders response:', response.data);
      console.log('[DEBUG] Number of sales orders fetched:', response.data?.length || 0);
      
      setSalesOrders(response.data || []);
    } catch (error) {
      console.error('[DEBUG] Error fetching sales orders:', error);
      
      if (error.response) {
        console.error('[DEBUG] Response status:', error.response.status);
        console.error('[DEBUG] Response data:', error.response.data);
      } else if (error.request) {
        console.error('[DEBUG] Request made but no response received:', error.request);
      } else {
        console.error('[DEBUG] Error setting up request:', error.message);
      }
      
      toast.error('Failed to fetch sales orders');
      setSalesOrders([]); // Set empty array to prevent rendering errors
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('[DEBUG] Fetching customers from API');
      const response = await axiosInstance.get('/api/customers/');
      
      console.log('[DEBUG] Customers response:', response.data);
      console.log('[DEBUG] Customers response type:', typeof response.data);
      
      // Ensure customers is always an array
      if (Array.isArray(response.data)) {
        console.log('[DEBUG] Setting customers array with', response.data.length, 'items');
        setCustomers(response.data);
      } else {
        console.error('[DEBUG] Customers data is not an array:', response.data);
        setCustomers([]);
        toast.error('Invalid customers data format');
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching customers:', error);
      
      if (error.response) {
        console.error('[DEBUG] Customers fetch - Response status:', error.response.status);
        console.error('[DEBUG] Customers fetch - Response data:', error.response.data);
      } else if (error.request) {
        console.error('[DEBUG] Customers fetch - Request made but no response:', error.request);
      } else {
        console.error('[DEBUG] Customers fetch - Error setting up request:', error.message);
      }
      
      toast.error('Failed to fetch customers');
      // Initialize with empty array on error
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('[DEBUG] Fetching products from API');
      const response = await axiosInstance.get('/api/products/');
      
      console.log('[DEBUG] Products response:', response.data);
      console.log('[DEBUG] Products response type:', typeof response.data);
      
      // Ensure products is always an array
      if (Array.isArray(response.data)) {
        console.log('[DEBUG] Setting products array with', response.data.length, 'items');
        setProducts(response.data);
      } else {
        console.error('[DEBUG] Products data is not an array:', response.data);
        setProducts([]);
        toast.error('Invalid products data format');
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching products:', error);
      
      if (error.response) {
        console.error('[DEBUG] Products fetch - Response status:', error.response.status);
        console.error('[DEBUG] Products fetch - Response data:', error.response.data);
      } else if (error.request) {
        console.error('[DEBUG] Products fetch - Request made but no response:', error.request);
      } else {
        console.error('[DEBUG] Products fetch - Error setting up request:', error.message);
      }
      
      toast.error('Failed to fetch products');
      // Initialize with empty array on error
      setProducts([]);
    }
  };

  const fetchServices = async () => {
    try {
      console.log('[DEBUG] Fetching services from API');
      const response = await axiosInstance.get('/api/services/');
      
      console.log('[DEBUG] Services response:', response.data);
      console.log('[DEBUG] Services response type:', typeof response.data);
      
      // Ensure services is always an array
      if (Array.isArray(response.data)) {
        console.log('[DEBUG] Setting services array with', response.data.length, 'items');
        setServices(response.data);
      } else {
        console.error('[DEBUG] Services data is not an array:', response.data);
        setServices([]);
        toast.error('Invalid services data format');
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching services:', error);
      
      if (error.response) {
        console.error('[DEBUG] Services fetch - Response status:', error.response.status);
        console.error('[DEBUG] Services fetch - Response data:', error.response.data);
      } else if (error.request) {
        console.error('[DEBUG] Services fetch - Request made but no response:', error.request);
      } else {
        console.error('[DEBUG] Services fetch - Error setting up request:', error.message);
      }
      
      toast.error('Failed to fetch services');
      // Initialize with empty array on error
      setServices([]);
    }
  };

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewSalesOrder((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setNewSalesOrder((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const handleItemAdd = () => {
    setNewSalesOrder((prev) => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return total - discount;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newSalesOrder.items];
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

    const updatedSalesOrder = {
      ...newSalesOrder,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, newSalesOrder.discount),
    };

    setNewSalesOrder(updatedSalesOrder);
  };

  const handleDiscountChange = (event) => {
    const discount = parseFloat(event.target.value) || 0;
    setNewSalesOrder((prev) => ({
      ...prev,
      discount: discount,
      totalAmount: calculateTotalAmount(prev.items, discount),
    }));
  };

  const handleItemRemove = (index) => {
    const newItems = newSalesOrder.items.filter((_, i) => i !== index);
    setNewSalesOrder((prev) => ({
      ...prev,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, prev.discount),
    }));
  };

  const handleCreateSalesOrder = async (e) => {
    e.preventDefault();
    
    console.log('[DEBUG] Sales Order Creation Started');
    console.log('[DEBUG] Form data:', newSalesOrder);

    if (!newSalesOrder.customer) {
      console.log('[DEBUG] Validation failed: No customer selected');
      toast.error('Please select a customer');
      return;
    }

    if (!newSalesOrder.items || newSalesOrder.items.length === 0) {
      console.log('[DEBUG] Validation failed: No items added');
      toast.error('Please add at least one item to the sales order');
      return;
    }

    try {
      console.log('[DEBUG] Preparing sales order data for API call');
      
      const salesOrderData = {
        customer: newSalesOrder.customer,
        date: newSalesOrder.date.toISOString().split('T')[0],
        items: newSalesOrder.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        discount: newSalesOrder.discount,
        currency: newSalesOrder.currency,
        total_amount: newSalesOrder.totalAmount,
      };

      console.log('[DEBUG] Sending sales order data to backend:', salesOrderData);

      const response = await axiosInstance.post('/api/salesorders/create/', salesOrderData);
      
      console.log('[DEBUG] Sales order creation response:', response.data);
      toast.success('Sales order created successfully');
      
      console.log('[DEBUG] Resetting form after successful creation');
      setNewSalesOrder({
        customer: '',
        date: new Date(),
        items: [],
        discount: 0,
        currency: 'USD',
        totalAmount: 0,
      });
      
      console.log('[DEBUG] Refreshing sales orders list');
      fetchSalesOrders();
    } catch (error) {
      console.error('[DEBUG] Error creating sales order:', error);
      
      if (error.response) {
        console.error('[DEBUG] Response status:', error.response.status);
        console.error('[DEBUG] Response data:', error.response.data);
        console.error('[DEBUG] Response headers:', error.response.headers);
        
        if (error.response.data && error.response.data.detail) {
          toast.error(`Failed to create sales order: ${error.response.data.detail}`);
        } else if (error.response.data && error.response.data.message) {
          toast.error(`Failed to create sales order: ${error.response.data.message}`);
        } else {
          toast.error(`Failed to create sales order. Status: ${error.response.status}`);
        }
      } else if (error.request) {
        console.error('[DEBUG] Request made but no response received:', error.request);
        toast.error('Failed to create sales order: No response from server');
      } else {
        console.error('[DEBUG] Error setting up request:', error.message);
        toast.error(`Failed to create sales order: ${error.message}`);
      }
    }
  };
  // Removed duplicate function - using the corrected handleCreateSalesOrder above

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
      console.log('[DEBUG] Updating sales order with ID:', selectedSalesOrder.id);
      console.log('[DEBUG] Updated data:', editedSalesOrder);
      
      const response = await axiosInstance.put(
        `/api/salesorders/${selectedSalesOrder.id}/`,
        editedSalesOrder
      );
      
      console.log('[DEBUG] Sales order update response:', response.data);
      
      setSelectedSalesOrder(response.data);
      setIsEditing(false);
      fetchSalesOrders();
      toast.success('Sales order updated successfully');
    } catch (error) {
      console.error('[DEBUG] Error updating sales order:', error);
      
      if (error.response) {
        console.error('[DEBUG] Update error - Response status:', error.response.status);
        console.error('[DEBUG] Update error - Response data:', error.response.data);
        toast.error(`Failed to update sales order: ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('[DEBUG] Update error - No response received:', error.request);
        toast.error('Failed to update sales order: No response from server');
      } else {
        console.error('[DEBUG] Update error - Request setup:', error.message);
        toast.error(`Failed to update sales order: ${error.message}`);
      }
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      console.log('[DEBUG] Deleting sales order with ID:', selectedSalesOrder.id);
      
      await axiosInstance.delete(`/api/salesorders/${selectedSalesOrder.id}/`);
      
      console.log('[DEBUG] Sales order deleted successfully');
      
      toast.success('Sales order deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedSalesOrder(null);
      fetchSalesOrders();
      setActiveTab(2);
    } catch (error) {
      console.error('[DEBUG] Error deleting sales order:', error);
      
      if (error.response) {
        console.error('[DEBUG] Delete error - Response status:', error.response.status);
        console.error('[DEBUG] Delete error - Response data:', error.response.data);
        toast.error(`Failed to delete sales order: ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('[DEBUG] Delete error - No response received:', error.request);
        toast.error('Failed to delete sales order: No response from server');
      } else {
        console.error('[DEBUG] Delete error - Request setup:', error.message);
        toast.error(`Failed to delete sales order: ${error.message}`);
      }
    }
  };

  const handleExportClick = () => {
    setExportMenuOpen(!exportMenuOpen);
  };

  const handleExportClose = () => {
    setExportMenuOpen(false);
  };

  const handleExport = (format) => {
    // Implement export logic here
    console.log(`Exporting to ${format}`);
    handleExportClose();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Sales Order Management
      </h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 0
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Create
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 1
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            Details
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 2
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            List
          </button>
        </nav>
      </div>

      {/* Create Tab */}
      {activeTab === 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Create Sales Order
          </h2>
          <form onSubmit={handleCreateSalesOrder} className="space-y-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-600">*</span>
              </label>
              <select
                id="customer"
                name="customer"
                value={newSalesOrder.customer}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  !newSalesOrder.customer ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              >
                <option value="">Select a customer</option>
                {Array.isArray(customers) ? customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName}
                  </option>
                )) : null}
              </select>
              {!newSalesOrder.customer && (
                <p className="mt-1 text-sm text-red-600">Please select a customer</p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={newSalesOrder.date instanceof Date ? newSalesOrder.date.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-800 mb-3">Items</h3>
              
              {newSalesOrder.items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product/Service
                    </label>
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select a product/service</option>
                      <optgroup label="Products">
                        {Array.isArray(products) ? products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        )) : null}
                      </optgroup>
                      <optgroup label="Services">
                        {Array.isArray(services) ? services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        )) : null}
                      </optgroup>
                    </select>
                  </div>
                  
                  <div className="w-full sm:w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="w-full sm:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="flex items-end pb-2">
                    <button 
                      type="button"
                      onClick={() => handleItemRemove(index)}
                      className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleItemAdd}
                className="mt-2 flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Item
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-1">
                Discount
              </label>
              <input
                id="discount"
                name="discount"
                type="number"
                value={newSalesOrder.discount}
                onChange={handleDiscountChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount
              </label>
              <input
                id="totalAmount"
                type="text"
                value={newSalesOrder.totalAmount.toFixed(2)}
                disabled
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={newSalesOrder.currency}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                onClick={handleCreateSalesOrder}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Sales Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 1 && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Sales Order Details
          </h2>
          {selectedSalesOrder ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="order_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Order Number
                </label>
                <input
                  id="order_number"
                  type="text"
                  value={selectedSalesOrder.order_number}
                  disabled
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="customer_detail" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <input
                  id="customer_detail"
                  type="text"
                  value={selectedSalesOrder.customer}
                  disabled={!isEditing}
                  className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : 'focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                  } sm:text-sm`}
                />
              </div>
              
              <div>
                <label htmlFor="date_detail" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="date_detail"
                  type="date"
                  value={selectedSalesOrder.date}
                  disabled={!isEditing}
                  className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : 'focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                  } sm:text-sm`}
                />
              </div>
              
              <div>
                <label htmlFor="total_amount_detail" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>
                <input
                  id="total_amount_detail"
                  type="text"
                  value={selectedSalesOrder.totalAmount}
                  disabled
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="discount_detail" className="block text-sm font-medium text-gray-700 mb-1">
                  Discount
                </label>
                <input
                  id="discount_detail"
                  type="text"
                  value={selectedSalesOrder.discount}
                  disabled={!isEditing}
                  className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : 'focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                  } sm:text-sm`}
                />
              </div>
              
              <div>
                <label htmlFor="currency_detail" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <input
                  id="currency_detail"
                  type="text"
                  value={selectedSalesOrder.currency}
                  disabled={!isEditing}
                  className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : 'focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                  } sm:text-sm`}
                />
              </div>
              
              <div className="pt-4">
                {isEditing ? (
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">Select a sales order from the list to view details</p>
          )}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 2 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Sales Order List
            </h2>
            
            <div className="relative">
              <button
                type="button"
                onClick={handleExportClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {exportMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      onClick={() => handleExport('PDF')}
                    >
                      PDF
                    </button>
                    <button
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      onClick={() => handleExport('CSV')}
                    >
                      CSV
                    </button>
                    <button
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      onClick={() => handleExport('Excel')}
                    >
                      Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
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
                {salesOrders.length > 0 ? (
                  salesOrders.map((salesOrder) => (
                    <tr 
                      key={salesOrder.id} 
                      onClick={() => handleSalesOrderSelect(salesOrder)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {salesOrder.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {salesOrder.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(salesOrder.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {salesOrder.totalAmount} {salesOrder.currency}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No sales orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setDeleteDialogOpen(false)}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Confirm Delete
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this sales order? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteDialogOpen(false)}
                >
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

export default SalesOrderManagement;
