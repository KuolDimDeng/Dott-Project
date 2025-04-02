import React, { useState, useEffect, Fragment } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import DatePickerWrapper from '@/components/ui/DatePickerWrapper';

const EstimateManagement = ({ newEstimate: isNewEstimate = false }) => {
  const [activeTab, setActiveTab] = useState(isNewEstimate ? 0 : 2);
  const [estimates, setEstimates] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [newEstimate, setNewEstimate] = useState({
    title: 'Estimate',
    summary: '',
    customerRef: '',
    customer_name: '',
    date: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [],
    discount: 0,
    currency: 'USD',
    footer: '',
    totalAmount: 0, // Initialize with 0
  });
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [userSchema, setUserSchema] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      console.log('User profile:', response.data);
      
      // Check if schema_name exists, use a fallback if not
      const schemaName = response.data.schema_name || 'default_schema';
      setUserSchema(schemaName);
      console.log('User schema:', schemaName);
      
      // If we got a fallback or mock profile, log it but don't show error to user
      if (response.data._error) {
        logger.warn('Using fallback profile data:', response.data._error);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logger.error('Error fetching user profile:', error);
      
      // Set a default schema name to prevent further errors
      setUserSchema('default_schema');
      toast.warning('Using default profile settings');
    }
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    const customerData = customers.find((customer) => customer.id === selectedId);

    setNewEstimate((prevEstimate) => ({
      ...prevEstimate,
      customerRef: selectedId,
      customer: customerData
        ? {
            id: selectedId,
            name: customerData.name || `${customerData.first_name} ${customerData.last_name}`,
          }
        : null,
      customer_name: customerData
        ? customerData.customerName || `${customerData.first_name} ${customerData.last_name}`
        : '',
    }));
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userSchema) {
      console.log('Fetching data for schema:', userSchema);
      fetchEstimates(userSchema);
      fetchCustomers(userSchema);
      fetchProducts(userSchema);
      fetchServices(userSchema);
    }
  }, [userSchema]);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      setCustomersError(null);
      
      // Validate schema name
      if (!userSchema) {
        logger.warn('Missing userSchema for fetchCustomers, using default');
      }
      
      console.log('Fetching customers from schema:', userSchema || 'default_schema');
      const response = await axiosInstance.get('/api/customers/', {
        params: { schema: userSchema || 'default_schema' },
      });
      
      // Handle empty or invalid response
      if (!response.data || !Array.isArray(response.data)) {
        logger.warn('Invalid customers data format:', response.data);
        setCustomers([]);
        return;
      }
      
      console.log('Fetched customers:', response.data);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      logger.error('Error fetching customers:', error);
      setCustomersError(`Unable to load customers. Please try again later.`);
      setCustomers([]); // Set empty array to prevent rendering errors
      toast.warning(`Unable to load customers. Please try again later.`);
    } finally {
      setCustomersLoading(false);
    }
  };

  const transformEstimates = (estimates) => {
    return estimates.map((estimate) => ({
      ...estimate,
      customer: `${estimate.customer_name} (Account: ${estimate.customer_ref || ''})`,
      totalAmount: parseFloat(estimate.totalAmount || 0).toFixed(2), // Format the totalAmount
      items: estimate.items || [],
    }));
  };

  const fetchEstimates = async (schema_name) => {
    try {
      // Validate schema_name to prevent API errors
      if (!schema_name) {
        logger.warn('Missing schema_name for fetchEstimates, using default');
        schema_name = 'default_schema';
      }
      
      console.log('Fetching estimates from schema:', schema_name);

      const response = await axiosInstance.get('/api/estimates/', {
        params: { schema: schema_name },
      });

      console.log('Raw API response for estimates:', response.data);

      // Handle empty response
      if (!response.data || !Array.isArray(response.data)) {
        logger.warn('Invalid estimates data format:', response.data);
        setEstimates([]);
        return;
      }

      // Use the transformEstimates function
      const transformedEstimates = transformEstimates(response.data);

      console.log('Transformed estimates:', transformedEstimates);
      setEstimates(transformedEstimates);
    } catch (error) {
      console.error('Error fetching estimates', error);
      logger.error('Error fetching estimates:', error);
      setEstimates([]); // Set empty array to prevent rendering errors
      toast.warning('Unable to load estimates. Please try again later.');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/', {
        params: { schema: userSchema || 'default_schema' },
      });
      setProducts(response.data || []);
    } catch (error) {
      logger.error('Error fetching products', error);
      setProducts([]); // Set empty array to prevent rendering errors
      toast.warning('Unable to load products. Please try again later.');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axiosInstance.get('/api/services/', {
        params: { schema: userSchema || 'default_schema' },
      });
      setServices(response.data || []);
    } catch (error) {
      logger.error('Error fetching services', error);
      setServices([]); // Set empty array to prevent rendering errors
      toast.warning('Unable to load services. Please try again later.');
    }
  };

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewEstimate((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date, name) => {
    setNewEstimate((prev) => ({
      ...prev,
      [name]: date,
    }));
  };

  const handleItemAdd = () => {
    setNewEstimate((prev) => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    if (!items) return 0;

    const total = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const discountValue = Number(discount) || 0;
    const totalAmount = total - discountValue;

    console.log('Calculated total amount:', totalAmount);
    return totalAmount;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newEstimate.items];
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

    const updatedEstimate = {
      ...newEstimate,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, newEstimate.discount),
    };

    console.log('Updated estimate with recalculated totalAmount:', updatedEstimate);
    setNewEstimate(updatedEstimate);
  };

  const handleDiscountChange = (event) => {
    const discount = parseFloat(event.target.value) || 0;
    setNewEstimate((prev) => ({
      ...prev,
      discount: discount,
      totalAmount: calculateTotalAmount(prev.items, discount),
    }));
  };

  const handleItemRemove = (index) => {
    const updatedItems = newEstimate.items.filter((_, i) => i !== index);
    const updatedEstimate = {
      ...newEstimate,
      items: updatedItems,
      totalAmount: calculateTotalAmount(updatedItems, newEstimate.discount),
    };
    setNewEstimate(updatedEstimate);
  };

  const handleCreateEstimate = async (e) => {
    e.preventDefault();
    if (!newEstimate.customerRef) {
      toast.error('Please select a customer');
      return;
    }
    try {
      const formatDate = (date) => {
        return date instanceof Date ? date.toISOString().split('T')[0] : date;
      };

      const transformedItems = newEstimate.items.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unitPrice),
      }));

      const estimateData = {
        ...newEstimate,
        customer: newEstimate.customerRef,
        date: formatDate(newEstimate.date),
        valid_until: formatDate(newEstimate.valid_until),
        items: transformedItems,
        discount: parseFloat(newEstimate.discount),
        totalAmount: newEstimate.totalAmount, // Make sure this is included
        schema: userSchema || 'default_schema', // Add schema parameter
      };

      console.log('Estimate data being sent to create:', estimateData);

      const response = await axiosInstance.post('/api/estimates/create/', estimateData);
      console.log('Create estimate response:', response.data);

      toast.success('Estimate created successfully');

      setNewEstimate({
        title: 'Estimate',
        summary: '',
        customer_name: '',
        date: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [],
        discount: 0,
        currency: 'USD',
        footer: '',
        totalAmount: 0,
      });

      fetchEstimates(userSchema);
    } catch (error) {
      console.error('Error creating estimate', error);
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
        toast.error(`Error creating estimate: ${JSON.stringify(error.response.data)}`);
      } else {
        toast.error('Error creating estimate');
      }
    }
  };

  const handleEstimateSelect = (estimate) => {
    console.log('Selected estimate:', estimate);
    setSelectedEstimate(estimate);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEstimate({ ...selectedEstimate });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEstimate(null);
  };

  const handleSaveEdit = async () => {
    try {
      // Add schema to the edited estimate data
      const estimateWithSchema = {
        ...editedEstimate,
        schema: userSchema || 'default_schema'
      };
      
      const response = await axiosInstance.put(
        `/api/estimates/${selectedEstimate.id}/`,
        estimateWithSchema
      );
      setSelectedEstimate(response.data);
      setIsEditing(false);
      fetchEstimates(userSchema);
      toast.success('Estimate updated successfully');
    } catch (error) {
      logger.error('Error updating estimate', error);
      toast.error('Error updating estimate');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      // Include schema as a query parameter
      await axiosInstance.delete(`/api/estimates/${selectedEstimate.id}/`, {
        params: { schema: userSchema || 'default_schema' }
      });
      toast.success('Estimate deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedEstimate(null);
      fetchEstimates(userSchema);
      setActiveTab(2);
    } catch (error) {
      logger.error('Error deleting estimate', error);
      toast.error('Error deleting estimate');
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
    <div className="bg-gray-50 p-6 rounded-lg">
      <h1 className="text-2xl font-semibold mb-4">
        Estimate Management
      </h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button 
            onClick={() => handleTabChange(0)} 
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 0 
                ? 'text-blue-600 border-blue-600 bg-blue-50' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create
          </button>
          <button 
            onClick={() => handleTabChange(1)} 
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 1 
                ? 'text-blue-600 border-blue-600 bg-blue-50' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button 
            onClick={() => handleTabChange(2)} 
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              activeTab === 2 
                ? 'text-blue-600 border-blue-600 bg-blue-50' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            List
          </button>
        </nav>
      </div>

      {/* Create Estimate Form */}
      {activeTab === 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-4">
            Create Estimate
          </h2>
          <form onSubmit={handleCreateEstimate}>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newEstimate.title}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                />
              </div>
              
              <div>
                <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
                  Summary
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  rows="3"
                  value={newEstimate.summary}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                ></textarea>
              </div>

              <div className="w-full md:w-1/2">
                <label htmlFor="customerRef" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <select
                  id="customerRef"
                  name="customerRef"
                  value={newEstimate.customerRef}
                  onChange={handleCustomerChange}
                  className={`w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border ${customersError ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={String(customer.id)}>
                      {customer.customerName || `${customer.first_name} ${customer.last_name}`}
                    </option>
                  ))}
                </select>
                {customersError && (
                  <p className="mt-1 text-sm text-red-600">
                    {customersError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <DatePickerWrapper
                    id="date"
                    selected={newEstimate.date}
                    onChange={(date) => handleDateChange(date, 'date')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                  />
                </div>
                
                <div>
                  <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <DatePickerWrapper
                    id="valid_until"
                    selected={newEstimate.valid_until}
                    onChange={(date) => handleDateChange(date, 'valid_until')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium mb-2">Items</h3>
                
                {newEstimate.items.map((item, index) => (
                  <div key={index} className="flex flex-wrap items-center mb-4 gap-3">
                    <div className="grow lg:max-w-md">
                      <label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Product/Service
                      </label>
                      <select
                        id={`product-${index}`}
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                      >
                        <option value="">Select a product/service</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-24">
                      <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        id={`quantity-${index}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                      />
                    </div>
                    
                    <div className="w-32">
                      <label htmlFor={`unitPrice-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        id={`unitPrice-${index}`}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button 
                        type="button"
                        onClick={() => handleItemRemove(index)}
                        className="p-2 text-red-600 hover:text-red-800 focus:outline-none mt-5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  type="button" 
                  onClick={handleItemAdd}
                  className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <input
                    type="number"
                    id="discount"
                    name="discount"
                    value={newEstimate.discount}
                    onChange={handleDiscountChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                  />
                </div>
                
                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    type="text"
                    id="totalAmount"
                    value={newEstimate.totalAmount.toFixed(2)}
                    disabled
                    className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 sm:text-sm py-2 px-3 border"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={newEstimate.currency}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div>
                <label htmlFor="footer" className="block text-sm font-medium text-gray-700 mb-1">
                  Footer
                </label>
                <textarea
                  id="footer"
                  name="footer"
                  rows="3"
                  value={newEstimate.footer}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                ></textarea>
              </div>

              <div className="mt-4">
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Estimate
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

        {/* Estimate Details Tab */}
        {activeTab === 1 && (
          <div className="mt-6">
            <h2 className="text-lg font-medium mb-4">
              Estimate Details
            </h2>
            {selectedEstimate ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="title-view" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title-view"
                    name="title"
                    value={isEditing ? editedEstimate.title : selectedEstimate.title}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>
                
                <div>
                  <label htmlFor="summary-view" className="block text-sm font-medium text-gray-700 mb-1">
                    Summary
                  </label>
                  <textarea
                    id="summary-view"
                    name="summary"
                    rows="3"
                    value={isEditing ? editedEstimate.summary : selectedEstimate.summary}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="customer-view" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <input
                    type="text"
                    id="customer-view"
                    name="customer_name"
                    value={isEditing ? editedEstimate.customer_name : selectedEstimate.customer_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date-view" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      id="date-view"
                      name="date"
                      value={isEditing ? editedEstimate.date : selectedEstimate.date}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="valid-until-view" className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      id="valid-until-view"
                      name="valid_until"
                      value={isEditing ? editedEstimate.valid_until : selectedEstimate.valid_until}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="total-amount-view" className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{selectedEstimate.currency}</span>
                      </div>
                      <input
                        type="text"
                        id="total-amount-view"
                        name="totalAmount"
                        value={
                          isEditing
                            ? editedEstimate.totalAmount || '0.00'
                            : selectedEstimate.totalAmount
                              ? Number(selectedEstimate.totalAmount).toFixed(2)
                              : '0.00'
                        }
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full rounded-md shadow-sm sm:text-sm py-2 pl-12 pr-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="discount-view" className="block text-sm font-medium text-gray-700 mb-1">
                      Discount
                    </label>
                    <input
                      type="number"
                      id="discount-view"
                      name="discount"
                      value={isEditing ? editedEstimate.discount : selectedEstimate.discount}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="currency-view" className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      id="currency-view"
                      name="currency"
                      value={isEditing ? editedEstimate.currency : selectedEstimate.currency}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="footer-view" className="block text-sm font-medium text-gray-700 mb-1">
                    Footer
                  </label>
                  <textarea
                    id="footer-view"
                    name="footer"
                    rows="3"
                    value={isEditing ? editedEstimate.footer : selectedEstimate.footer}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${!isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  ></textarea>
                </div>
                
                <div className="flex mt-6 gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        type="button" 
                        onClick={handleSaveEdit}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Save
                      </button>
                      <button 
                        type="button" 
                        onClick={handleCancelEdit}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        onClick={handleEdit}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">Select an estimate from the list to view details</p>
            )}
          </div>
        )}

        {/* Estimate List Tab */}
        {activeTab === 2 && (
          <div className="mt-6">
            {console.log('Rendering estimate list:', estimates)}

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                Estimate List
              </h2>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={handleExportClick}
                  className="border border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                >
                  Export
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleExport('PDF')}
                      >
                        PDF
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleExport('CSV')}
                      >
                        CSV
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleExport('Excel')}
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
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
                    {estimates.map((estimate) => (
                      <tr 
                        key={estimate.id} 
                        onClick={() => handleEstimateSelect(estimate)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {estimate.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estimate.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(estimate.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {console.log('Estimate in list row:', estimate)}
                          {estimate.totalAmount
                            ? Number(estimate.totalAmount).toFixed(2)
                            : '0.00'}{' '}
                          {estimate.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteDialogOpen && (
          <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
              
              {/* This element is to trick the browser into centering the modal contents. */}
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
                          Are you sure you want to delete this estimate?
                          <br />
                          Title: {selectedEstimate?.title}
                          <br />
                          Customer: {selectedEstimate?.customer_name}
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

export default EstimateManagement;
