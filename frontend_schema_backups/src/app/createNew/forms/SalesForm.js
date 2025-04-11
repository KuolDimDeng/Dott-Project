import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { dateFormat } from '@/utils/formatters';
import { useToast } from '@/components/Toast/ToastProvider';
import { format } from 'date-fns';

const SalesForm = ({ onClose }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if screen is mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  const [sale, setSale] = useState({
    customer: '',
    date: new Date(),
    payment_method: '',
    items: [],
    total_amount: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const toast = useToast();
  const [barcodeInput, setBarcodeInput] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleChange = (e) => {
    setSale({ ...sale, [e.target.name]: e.target.value });
  };

  const handleCustomerChange = (event, newValue) => {
    if (typeof newValue === 'string') {
      // Create a new customer
      setSale({ ...sale, customer: newValue });
    } else if (newValue && newValue.inputValue) {
      // Create a new customer from the input value
      setSale({ ...sale, customer: newValue.inputValue });
    } else {
      // Select an existing customer
      setSale({ ...sale, customer: newValue ? newValue.id : '' });
    }
  };

  const handleDateChange = (date) => {
    setSale({ ...sale, date });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...sale.items];
    updatedItems[index][field] = value;

    if (field === 'product') {
      const selectedProduct = products.find((p) => p.id === value);
      if (selectedProduct) {
        updatedItems[index].unit_price = selectedProduct.price;
      }
    }

    setSale({ ...sale, items: updatedItems });
    calculateTotal(updatedItems);
  };

  const addItem = () => {
    setSale({
      ...sale,
      items: [...sale.items, { product: '', quantity: 1, unit_price: 0 }],
    });
  };

  const removeItem = (index) => {
    const updatedItems = sale.items.filter((_, i) => i !== index);
    setSale({ ...sale, items: updatedItems });
    calculateTotal(updatedItems);
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    setSale((prevSale) => ({ ...prevSale, total_amount: total }));
  };

  const handleBarcodeInputChange = (e) => {
    setBarcodeInput(e.target.value);
    if (e.key === 'Enter') {
      handleBarcodeSubmit();
    }
  };

  const handleBarcodeSubmit = async () => {
    try {
      const response = await axiosInstance.get(`/api/products/barcode/${barcodeInput}/`);
      const scannedProduct = response.data;

      // Add the scanned product to the items list
      const newItem = {
        product: scannedProduct.id,
        quantity: 1,
        unit_price: scannedProduct.price,
      };

      setSale((prevSale) => ({
        ...prevSale,
        items: [...prevSale.items, newItem],
      }));

      calculateTotal([...sale.items, newItem]);
      setBarcodeInput('');
      toast.success(`Added ${scannedProduct.name} to the sale`);
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      toast.error('Failed to fetch product by barcode');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/sales/create/', sale);
      console.log('Sale created:', response.data);
      toast.success('Sale created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Failed to create sale');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="ml-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Sale</h1>
          <p className="text-sm text-gray-500">Record a new sale transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
              Customer
            </label>
            <div className="mt-1">
              <select 
                id="customer"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={sale.customer}
                onChange={(e) => setSale({ ...sale, customer: e.target.value })}
                required
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName || customer.name || `Customer #${customer.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="sale-date" className="block text-sm font-medium text-gray-700">
              Sale Date
            </label>
            <div className="mt-1">
              <input
                type="date"
                id="sale-date"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={sale.date ? format(sale.date, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <div className="mt-1">
              <select
                id="payment-method"
                name="payment_method"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={sale.payment_method}
                onChange={handleChange}
                required
              >
                <option value="">Select a payment method</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-6">
            <div className="flex items-center">
              <div className="flex-grow">
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                  Scan Barcode
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="barcode"
                    className="focus:ring-blue-500 focus:border-blue-500 flex-grow block w-full min-w-0 rounded-none rounded-l-md sm:text-sm border-gray-300"
                    value={barcodeInput}
                    onChange={handleBarcodeInputChange}
                    onKeyPress={handleBarcodeInputChange}
                  />
                  <button
                    type="button"
                    onClick={handleBarcodeSubmit}
                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                      <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="sm:col-span-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Sale Items</h2>
            <div className="space-y-4">
              {sale.items.map((item, index) => (
                <div key={index} className="flex items-center flex-wrap md:flex-nowrap space-y-2 md:space-y-0 space-x-0 md:space-x-2 p-3 border border-gray-200 rounded-md">
                  <div className="w-full md:w-1/2">
                    <label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700">
                      Product
                    </label>
                    <select
                      id={`product-${index}`}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/3 md:w-1/6">
                    <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id={`quantity-${index}`}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                      min="1"
                      required
                    />
                  </div>
                  <div className="w-1/2 md:w-1/6">
                    <label htmlFor={`price-${index}`} className="block text-sm font-medium text-gray-700">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      id={`price-${index}`}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="flex items-end justify-end w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="mt-4 inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-500 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                onClick={addItem}
                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Item
              </button>
            </div>
          </div>

          <div className="sm:col-span-6">
            <div className="py-4 border-t border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Total Amount: <span className="text-blue-600">${sale.total_amount.toFixed(2)}</span>
              </h2>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Sale
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalesForm;
