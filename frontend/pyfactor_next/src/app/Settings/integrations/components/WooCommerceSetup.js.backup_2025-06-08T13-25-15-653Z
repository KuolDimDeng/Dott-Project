import React, { useState } from 'react';
import axios from 'axios';

const WooCommerceSetup = () => {
  const [formData, setFormData] = useState({
    site_url: '',
    consumer_key: '',
    consumer_secret: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/integrations/setup/woocommerce/', formData);
      // Handle successful setup (e.g., show success message, redirect)
      console.log('WooCommerce integration set up successfully', response.data);
    } catch (error) {
      // Handle error (e.g., show error message)
      console.error('Error setting up WooCommerce integration', error);
    }
  };

  return (
    <div>
      <h2>Set up WooCommerce Integration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="site_url">WooCommerce Site URL:</label>
          <input
            type="url"
            id="site_url"
            name="site_url"
            value={formData.site_url}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="consumer_key">Consumer Key:</label>
          <input
            type="text"
            id="consumer_key"
            name="consumer_key"
            value={formData.consumer_key}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="consumer_secret">Consumer Secret:</label>
          <input
            type="password"
            id="consumer_secret"
            name="consumer_secret"
            value={formData.consumer_secret}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Connect WooCommerce</button>
      </form>
    </div>
  );
};

export default WooCommerceSetup;
