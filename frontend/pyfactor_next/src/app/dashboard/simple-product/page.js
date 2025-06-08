'use client';


import React from 'react';
import SimpleProductForm from '../components/forms/fixed/SimpleProductForm';
import { createTestInput } from '@/utils/eventMonitor';
import { Toaster } from 'react-hot-toast';

export default function SimpleProductPage() {
  // Function to create a test input overlay
  const handleCreateTestInput = () => {
    createTestInput();
  };

  return (
    <div>
      <h1 style={{ 
        textAlign: 'center', 
        margin: '20px 0', 
        color: '#0a3977' 
      }}>
        Simple Product Form Test
      </h1>
      
      <p style={{ 
        textAlign: 'center', 
        maxWidth: '800px', 
        margin: '0 auto 30px',
        color: '#555'
      }}>
        This page tests a simplified product form with basic HTML inputs and no complex event handling.
      </p>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={handleCreateTestInput}
          style={{
            backgroundColor: '#555',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Test Input
        </button>
      </div>
      
      <SimpleProductForm />
      
      <Toaster position="bottom-center" />
    </div>
  );
}