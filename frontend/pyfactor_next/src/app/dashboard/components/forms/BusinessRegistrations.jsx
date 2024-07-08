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
    <div>
      {!showPlatformSelection ? (
        <form onSubmit={handleSubmit}>
          {/* Other form fields */}
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            <option value="">Select Business Type</option>
            <option value="ecommerce">E-commerce</option>
            <option value="service">Service</option>
            {/* Add other business types */}
          </select>
          <button type="submit">Register</button>
        </form>
      ) : (
        <div>
          <h2>Select Your E-commerce Platform</h2>
          <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
            <option value="">Select Platform</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="shopify">Shopify</option>
            {/* Add other platforms */}
          </select>
          <button onClick={handlePlatformSelection}>Continue</button>
          <button onClick={() => { /* redirect to dashboard */ }}>Set Up Later</button>
        </div>
      )}
    </div>
  );
};

export default BusinessRegistration;