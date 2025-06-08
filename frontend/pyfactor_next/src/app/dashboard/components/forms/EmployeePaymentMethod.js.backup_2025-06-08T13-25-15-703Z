// src/app/dashboard/components/forms/EmployeePaymentMethod.js
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const EmployeePaymentMethod = ({ employeeId, countryCode }) => {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (countryCode) {
      fetchPaymentProviders(countryCode);
    }
  }, [countryCode]);

  useEffect(() => {
    if (selectedProvider) {
      fetchProviderForm(selectedProvider);
    }
  }, [selectedProvider]);

  const fetchPaymentProviders = async (country) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/payments/providers/country/${country}/`);
      setProviders(response.data.providers);
      
      // Auto-select primary provider
      if (response.data.primary_provider) {
        setSelectedProvider(response.data.primary_provider);
      }
    } catch (error) {
      console.error('Error fetching payment providers:', error);
      setError('Failed to load payment providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderForm = async (provider) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/payments/providers/${provider}/form/`);
      setFormFields(response.data.fields);
      
      // Initialize form values
      const initialValues = {};
      response.data.fields.forEach(field => {
        initialValues[field.name] = '';
      });
      setFormValues(initialValues);
    } catch (error) {
      console.error('Error fetching provider form:', error);
      setError('Failed to load payment form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await axiosInstance.post(`/api/employees/${employeeId}/payment-method/`, {
        provider: selectedProvider,
        details: formValues
      });
      
      setSuccess(true);
    } catch (error) {
      console.error('Error saving payment method:', error);
      setError(error.response?.data?.error || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Payment Method Setup
      </h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Payment method saved successfully
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="paymentProvider" className="block text-sm font-medium text-gray-700 mb-1">
          Payment Provider
        </label>
        <select
          id="paymentProvider"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          disabled={loading}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">Select a provider</option>
          {providers.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedProvider && formFields.length > 0 && (
        <form className="space-y-4" noValidate autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map(field => (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  value={formValues[field.name] || ''}
                  onChange={handleInputChange}
                  required={field.required}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {field.help_text && (
                  <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Save Payment Method'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EmployeePaymentMethod;