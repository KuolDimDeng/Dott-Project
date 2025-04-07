'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fixInputFields, monitorInputEvents } from '@/utils/inputDebug';

export default function ProductForm({ product, mode = 'create', onSubmit, error: externalError, loading: externalLoading }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    status: 'Active',
    cost: '',
    minStock: '',
    maxStock: '',
    unit: 'piece',
    taxRate: '',
    ...product,
  });

  // Update error state when external error changes
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("ProductForm handleSubmit triggered");
    
    // Don't set loading state if parent component is handling it
    if (!externalLoading) {
      setLoading(true);
    }
    
    setError('');

    try {
      // Validate required fields
      if (!formData.name || !formData.sku || !formData.price) {
        throw new Error('Please fill in all required fields.');
      }

      // Convert numeric strings to numbers
      const processedData = {
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock, 10),
        minStock: formData.minStock ? parseInt(formData.minStock, 10) : undefined,
        maxStock: formData.maxStock ? parseInt(formData.maxStock, 10) : undefined,
        taxRate: parseFloat(formData.taxRate)
      };

      console.log("ProductForm submitting data:", processedData);
      
      if (onSubmit) {
        // Use the onSubmit handler from parent component if provided
        await onSubmit(processedData);
      } else {
        // Default behavior if no onSubmit handler is provided
        console.log("No onSubmit handler provided, using default behavior");
        const url = mode === 'create' ? '/api/products' : `/api/products/${product.id}`;
        const method = mode === 'create' ? 'POST' : 'PUT';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(processedData),
        });

        if (!response.ok) {
          throw new Error('Failed to save product');
        }

        router.push('/dashboard/products');
      }
    } catch (err) {
      console.error("ProductForm error:", err);
      // Only set error if not handled by parent component
      if (!externalError) {
        setError(err.message);
      }
    } finally {
      // Only reset loading if not handled by parent component
      if (!externalLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Fix input fields initially
    fixInputFields('.product-form');
    
    // Monitor input events
    const cleanup = monitorInputEvents();
    
    // Set an interval to periodically reapply fixes (handles dynamically loaded content)
    const intervalId = setInterval(() => {
      fixInputFields('.product-form');
    }, 2000);
    
    return () => {
      cleanup();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="p-3 product-form">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">
          {mode === 'create' ? 'Add New Product' : 'Edit Product'}
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              required
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1">
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <input
              required
              id="sku"
              name="sku"
              type="text"
              value={formData.sku}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                required
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
              Cost *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                required
                id="cost"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleChange}
                className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">
              Tax Rate *
            </label>
            <div className="relative">
              <input
                required
                id="taxRate"
                name="taxRate"
                type="number"
                value={formData.taxRate}
                onChange={handleChange}
                className="w-full pr-8 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500">%</span>
              </div>
            </div>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Current Stock *
            </label>
            <input
              required
              id="stock"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Stock
            </label>
            <input
              id="minStock"
              name="minStock"
              type="number"
              value={formData.minStock}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="maxStock" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Stock
            </label>
            <input
              id="maxStock"
              name="maxStock"
              type="number"
              value={formData.maxStock}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="food">Food</option>
              <option value="furniture">Furniture</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="piece">Piece</option>
              <option value="kg">Kilogram</option>
              <option value="g">Gram</option>
              <option value="l">Liter</option>
              <option value="m">Meter</option>
              <option value="box">Box</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="OutOfStock">Out of Stock</option>
              <option value="Discontinued">Discontinued</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.push('/dashboard/products')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || externalLoading}
            className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {(loading || externalLoading) ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </div>
            ) : mode === 'create' ? (
              'Create Product'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}