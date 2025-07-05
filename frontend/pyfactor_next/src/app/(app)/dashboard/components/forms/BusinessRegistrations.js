import React, { useState } from 'react';
import axios from 'axios';

const BusinessRegistration = () => {
  const [businessType, setBusinessType] = useState('');
  const [showPlatformSelection, setShowPlatformSelection] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/business-registration/', {
        // other form data
        business_type: businessType,
      });
      if (response.data.redirect_to_platform_selection) {
        setShowPlatformSelection(true);
      } else {
        // redirect to dashboard or next step
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handlePlatformSelection = async () => {
    try {
      await axios.post('/api/ecommerce-platform-selection/', {
        platform: selectedPlatform,
      });
      // redirect to dashboard or next step
    } catch (error) {
      console.error('Error selecting platform:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {!showPlatformSelection ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Other form fields */}
          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <select 
              id="businessType"
              value={businessType} 
              onChange={(e) => setBusinessType(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Select Business Type</option>
              <option value="ecommerce">E-commerce</option>
              <option value="service">Service</option>
              {/* Add other business types */}
            </select>
          </div>
          <div>
            <button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Register
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900">Select Your E-commerce Platform</h2>
          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
              E-commerce Platform
            </label>
            <select 
              id="platform"
              value={selectedPlatform} 
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Select Platform</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="shopify">Shopify</option>
              {/* Add other platforms */}
            </select>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={handlePlatformSelection}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Continue
            </button>
            <button
              onClick={() => {
                /* redirect to dashboard */
              }}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Set Up Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessRegistration;