'use client';


import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

/*
 * SimpleProductForm - Converted to use Tailwind CSS
 * Using proper controlled input components
 */
export default function SimpleProductForm() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!name || !price) {
      toast.error('Name and price are required');
      return;
    }
    
    // Show success
    toast.success(`Product created: ${name}`);
    
    // Clear form
    setName('');
    setPrice('');
    setDescription('');
    setStock('');
  };

  return (
    <div className="max-w-lg mx-auto px-4">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mt-6 mb-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          Simple Product Form
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This form uses Tailwind CSS styling with controlled inputs.
        </p>
        
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Name *
            </label>
            <input
              id="product-name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-primary-main dark:bg-gray-700 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price *
            </label>
            <input
              id="product-price"
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-primary-main dark:bg-gray-700 dark:text-white"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="product-description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-primary-main dark:bg-gray-700 dark:text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Quantity
            </label>
            <input
              id="product-stock"
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-primary-main dark:bg-gray-700 dark:text-white"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Product'}
          </button>
        </form>
      </div>
    </div>
  );
}