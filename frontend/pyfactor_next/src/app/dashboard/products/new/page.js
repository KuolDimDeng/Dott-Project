'use client';

import { useState } from 'react';
import ProductForm from '../components/ProductForm'; // Import from the new Tailwind component
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';

// Simple HTML-based fallback form with no dependencies
function FallbackForm({ onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      price: parseFloat(formData.get('price') || 0),
      stock_quantity: parseInt(formData.get('stock_quantity') || 0),
      description: formData.get('description') || '',
      sku: formData.get('sku') || '',
    };
    onSubmit(data);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-6">Create New Product (Fallback Form)</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input 
            name="name" 
            type="text" 
            required 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU *
          </label>
          <input 
            name="sku" 
            type="text" 
            required 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">$</span>
            </div>
            <input 
              name="price" 
              type="number" 
              step="0.01" 
              min="0" 
              required 
              className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Quantity
          </label>
          <input 
            name="stock_quantity" 
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea 
            name="description" 
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          ></textarea>
        </div>
        
        <button 
          type="submit"
          className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Product
        </button>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const [useStandardForm, setUseStandardForm] = useState(true);
  const [useFallbackForm, setUseFallbackForm] = useState(false);
  const [formError, setFormError] = useState('');
  
  const handleSubmit = async (productData) => {
    try {
      console.log("Submitting product data:", productData);
      
      const response = await axiosInstance.post('/api/inventory/products/', productData);
      console.log("Product created:", response.data);
      
      router.push('/dashboard/products');
    } catch (error) {
      console.error("Error creating product:", error);
      setFormError('Failed to create product. Please try again.');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mt-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Create New Product</h1>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                setUseStandardForm(!useStandardForm);
                setUseFallbackForm(false);
              }}
              className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {useStandardForm ? "Switch to Advanced Form" : "Switch to Standard Form"}
            </button>
            <button
              onClick={() => {
                setUseFallbackForm(!useFallbackForm);
                setUseStandardForm(false);
              }}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {useFallbackForm ? "Use React Forms" : "Use Fallback Form"}
            </button>
          </div>
        </div>
        
        {formError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {formError}
          </div>
        )}
        
        {useFallbackForm ? (
          <FallbackForm onSubmit={handleSubmit} />
        ) : useStandardForm ? (
          <ProductForm mode="create" />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 mb-6">
              Advanced form is not available in Tailwind version yet. Please use the standard form.
            </div>
            <ProductForm mode="create" />
          </div>
        )}
      </div>
    </div>
  );
}