// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/integrations/components/ShopifySetup.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ShopifySetup = () => {
  const [formData, setFormData] = useState({
    shopName: '',
    accessToken: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/integrations/shopify/setup', formData);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Shopify Setup</h2>
      <input
        type="text"
        name="shopName"
        value={formData.shopName}
        onChange={handleChange}
        placeholder="Shopify Shop Name"
        required
      />
      <input
        type="password"
        name="accessToken"
        value={formData.accessToken}
        onChange={handleChange}
        placeholder="Access Token"
        required
      />
      <button type="submit">Connect Shopify</button>
    </form>
  );
};

export default ShopifySetup;