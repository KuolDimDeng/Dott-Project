import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const SalesOrderForm = ({ onSave, initialData }) => {
  const [salesOrder, setSalesOrder] = useState(
    initialData || {
      customerId: '',
      items: [],
      discount: 0,
      currency: 'USD',
      date: new Date(),
      totalAmount: 0,
    }
  );

  const [customers, setCustomers] = useState([]);
  const [customersError, setCustomersError] = useState(null);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [userDatabase, setUserDatabase] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const toast = useToast();

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

  useEffect(() => {
    console.log('SalesOrder state updated:', salesOrder);
  }, [salesOrder]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database set to:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to fetch user profile');
    }
  };

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
      console.error('Error fetching products:', error);
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
      console.error('Error fetching services:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSalesOrder({ ...salesOrder, [name]: value });
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    setSalesOrder((prevState) => ({
      ...prevState,
      customerId: selectedId,
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return total - discount;
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...salesOrder.items];
    updatedItems[index][field] = value;

    if (field === 'product') {
      const selectedProduct = products.find((product) => product.id === value);
      if (selectedProduct) {
        updatedItems[index].unitPrice = parseFloat(selectedProduct.price);
        updatedItems[index].description = selectedProduct.name;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].quantity = parseFloat(updatedItems[index].quantity) || 0;
      updatedItems[index].unitPrice = parseFloat(updatedItems[index].unitPrice) || 0;
    }

    const totalAmount = calculateTotalAmount(updatedItems, salesOrder.discount);
    setSalesOrder({ ...salesOrder, items: updatedItems, totalAmount });
  };

  const handleItemAdd = () => {
    setSalesOrder({
      ...salesOrder,
      items: [...salesOrder.items, { product: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleItemRemove = (index) => {
    const updatedItems = salesOrder.items.filter((_, i) => i !== index);
    const totalAmount = calculateTotalAmount(updatedItems, salesOrder.discount);
    setSalesOrder({ ...salesOrder, items: updatedItems, totalAmount });
  };

  const handleDiscountChange = (event) => {
    const discount = parseFloat(event.target.value) || 0;
    const totalAmount = calculateTotalAmount(salesOrder.items, discount);
    setSalesOrder({ ...salesOrder, discount, totalAmount });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      if (!salesOrder.customerId || salesOrder.items.length === 0) {
        throw new Error('Please fill out all required fields and add at least one item');
      }

      const salesOrderData = {
        customer: salesOrder.customerId,
        items: salesOrder.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        discount: salesOrder.discount,
        currency: salesOrder.currency,
        date: salesOrder.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        totalAmount: salesOrder.totalAmount,
      };

      const response = await axiosInstance.post('/api/salesorders/create/', salesOrderData);

      setSuccessMessage('Sales order created successfully');
      setSalesOrder(response.data);
      if (onSave) {
        onSave(response.data);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMessages = Object.entries(err.response.data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 my-4">
      <h4 className="text-2xl font-semibold mb-4">
        Create New Sales Order
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
        <div className="col-span-1 sm:col-span-3">
          <div className="w-full">
            <label htmlFor="customer-select" className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              id="customer-select"
              value={salesOrder.customerId}
              onChange={handleCustomerChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerName || `${customer.first_name} ${customer.last_name}`}
                </option>
              ))}
            </select>
          </div>
          {customersError && (
            <p className="text-red-600 text-sm mt-1">
              {customersError}
            </p>
          )}
        </div>
        
        <div className="col-span-1 sm:col-span-6">
          <h6 className="text-lg font-medium mb-2">
            Items
          </h6>
          {salesOrder.items.map((item, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-4">
              <div className="flex-grow">
                <label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  id={`product-${index}`}
                  value={item.product}
                  onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-full md:w-24">
                <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  id={`quantity-${index}`}
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="w-full md:w-36">
                <label htmlFor={`price-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price
                </label>
                <input
                  id={`price-${index}`}
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex-grow">
                <label htmlFor={`desc-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  id={`desc-${index}`}
                  type="text"
                  value={item.description || ''}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button 
                type="button"
                onClick={() => handleItemRemove(index)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Remove
              </button>
            </div>
          ))}
          <button 
            type="button"
            onClick={handleItemAdd}
            className="px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Item
          </button>
        </div>
        
        <div className="col-span-1 sm:col-span-2">
          <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-1">
            Discount
          </label>
          <input
            id="discount"
            type="number"
            name="discount"
            value={salesOrder.discount}
            onChange={handleDiscountChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-1 sm:col-span-2">
          <label htmlFor="total" className="block text-sm font-medium text-gray-700 mb-1">
            Total Amount
          </label>
          <input
            id="total"
            type="number"
            value={salesOrder.totalAmount.toFixed(2)}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
          />
        </div>
        
        <div className="col-span-1 sm:col-span-2">
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={salesOrder.currency}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        
        <div className="col-span-1 sm:col-span-6">
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : 'Create Sales Order'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 whitespace-pre-line">{error}</p>
            </div>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <button 
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrderForm;