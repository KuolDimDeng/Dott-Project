'use client';

import React, { useState } from 'react';

/**
 * ProductForm - A clean Tailwind CSS-based form using React's controlled components
 * instead of direct DOM manipulation
 */
export default function ProductForm({ onSubmit }) {
  // Use React state for form values instead of refs
  const [formState, setFormState] = useState({
    name: '',
    price: '',
    stock_quantity: '',
    description: ''
  });
  
  // Form submission and UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    try {
      setIsSubmitting(true);
      
      // Validate form
      if (!formState.name.trim()) {
        throw new Error('Product name is required');
      }
      
      // Format data for submission
      const productData = {
        name: formState.name.trim(),
        price: parseFloat(formState.price) || 0,
        stock_quantity: parseInt(formState.stock_quantity) || 0,
        description: formState.description.trim()
      };
      
      // Call the submit handler
      await onSubmit(productData);
      
      // Show success and reset form
      setSuccessMessage('Product created successfully!');
      setFormState({
        name: '',
        price: '',
        stock_quantity: '',
        description: ''
      });
    } catch (error) {
      setError(error.message || 'An error occurred while creating the product');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Create New Product
      </h1>
      
      <div className="bg-white shadow rounded-lg p-6 mt-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
            <p>{successMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Enter product name"
                disabled={isSubmitting}
                value={formState.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  disabled={isSubmitting}
                  value={formState.price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  disabled={isSubmitting}
                  value={formState.stock_quantity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                placeholder="Enter product description"
                disabled={isSubmitting}
                value={formState.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              ></textarea>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Product...
                  </>
                ) : (
                  'Create Product'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}