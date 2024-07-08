import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const EcommercePlatformSelection = ({ platforms }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/ecommerce-platform-selection/', {
        platform: selectedPlatform,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error selecting platform:', error);
    }
  };

  return (
    <div>
      <h2>Select Your E-commerce Platform</h2>
      <form onSubmit={handleSubmit}>
        <select 
          value={selectedPlatform} 
          onChange={(e) => setSelectedPlatform(e.target.value)}
        >
          <option value="">Select a platform</option>
          {platforms.map(([value, name]) => (
            <option key={value} value={value}>{name}</option>
          ))}
        </select>
        <button type="submit">Continue</button>
      </form>
      <p>Don't see your platform? <a href="/dashboard">Set up later</a></p>
    </div>
  );
};

export default EcommercePlatformSelection;