'use client';


import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

/*
 * SimpleServiceForm - A basic form for service management
 * Using the same approach as SimpleProductForm that works correctly
 */
export default function SimpleServiceForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!name || !price) {
      toast.error('Name and price are required');
      return;
    }
    
    // Show success
    toast.success(`Service created: ${name}`);
    
    // Clear form
    setName('');
    setPrice('');
    setDescription('');
    setDuration('');
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '20px auto', 
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Simple Service Form</h2>
      
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This form uses standard HTML elements with minimal styling and no complex event handling.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="service-name" 
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Service Name*
          </label>
          <input
            id="service-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="service-price" 
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Price*
          </label>
          <input
            id="service-price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="service-description" 
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Description
          </label>
          <textarea
            id="service-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ccc',
              borderRadius: '4px',
              minHeight: '100px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="service-duration" 
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Duration (minutes)
          </label>
          <input
            id="service-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: '#0a3977',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isLoading ? 'Creating...' : 'Create Service'}
        </button>
      </form>
    </div>
  );
}