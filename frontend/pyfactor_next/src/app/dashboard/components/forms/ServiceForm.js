import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const ServiceForm = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [service, setService] = useState({
    name: '',
    description: '',
    price: '',
    saleType: 'sale',
    salesTax: '',
    duration: '',
    is_recurring: false,
    charge_period: 'hour',
    charge_amount: '',
  });
  const [errors, setErrors] = useState({});
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setService((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!service.name.trim()) tempErrors.name = 'Name is required';
    if (service.saleType === 'sale' && !service.price) tempErrors.price = 'Price is required';
    return tempErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      // Using the new API endpoint from the inventory module
      const response = await axiosInstance.post('/api/inventory/services/create/', service);
      console.log('Service created successfully', response.data);
      setSnackbarSeverity('success');
      setSnackbarMessage('Service created successfully');
      setOpenSnackbar(true);
      setService({
        name: '',
        description: '',
        price: '',
        saleType: 'sale',
        salesTax: '',
        duration: '',
        is_recurring: false,
        charge_period: 'hour',
        charge_amount: '',
      });
    } catch (error) {
      logger.error('Error creating service', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Error creating service: ' + (error.response?.data?.message || error.message));
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <div className="bg-white p-3 rounded-lg">
      <div className="flex items-center mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Add a Service
          </h1>
          <p className="text-gray-500">
            Create and manage your service offerings
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={service.name}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="col-span-1">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">Service Type</legend>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="saleType"
                    value="sale"
                    checked={service.saleType === 'sale'}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">For Sale</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="saleType"
                    value="rent"
                    checked={service.saleType === 'rent'}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">For Rent</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={service.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
            ></textarea>
          </div>
          {service.saleType === 'sale' && (
            <>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={service.price}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Tax (%)
                </label>
                <input
                  type="number"
                  name="salesTax"
                  value={service.salesTax}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (in minutes)
            </label>
            <input
              type="number"
              name="duration"
              value={service.duration}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          {service.saleType === 'rent' && (
            <>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charge Period
                </label>
                <select
                  name="charge_period"
                  value={service.charge_period}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charge Amount
                </label>
                <input
                  type="number"
                  name="charge_amount"
                  value={service.charge_amount}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex justify-between items-center">
              <button 
                type="submit" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Service
              </button>
              <button 
                type="button"
                className="text-blue-600 hover:text-blue-800"
                title="Learn more about service creation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </form>

      {service.saleType === 'rent' && (
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Create a custom rental plan{' '}
            <a href="/settings/business-settings/custom-charge-settings" className="text-blue-600 hover:underline">
              here
            </a>{' '}
            and use when making a sales transaction.
          </p>
        </div>
      )}

      {openSnackbar && (
        <div className={`fixed inset-x-0 bottom-0 p-4 flex items-center justify-center z-50 ${
          snackbarSeverity === 'success' ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'
        }`}>
          <div className={`p-2 rounded-md ${
            snackbarSeverity === 'success' ? 'text-green-700' : 'text-red-700'
          }`}>
            {snackbarMessage}
            <button 
              onClick={handleCloseSnackbar}
              className="ml-4 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceForm;
