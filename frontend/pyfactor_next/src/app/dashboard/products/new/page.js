'use client';

import { useState } from 'react';
import ProductForm from '../components/ProductForm'; // Import from the new Tailwind component
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { useNotification } from '@/context/NotificationContext'; // Import the notification hook

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
  const [loading, setLoading] = useState(false);
  const { notifySuccess, notifyError } = useNotification(); // Add the notification hook
  
  const handleSubmit = async (productData) => {
    try {
      console.log("Starting product submission with data:", productData);
      setLoading(true);
      
      // Get tenant ID from localStorage
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || localStorage.getItem('businessid') : null;
      console.log("Using tenant ID for product creation:", tenantId);
      
      // Include detailed debugging
      console.log("User entered product price:", productData.price);
      console.log("User entered stock quantity:", productData.stock);
      
      // Map the form data to the expected structure for inventory_product table
      // The server expects stock_quantity but our form provides 'stock'
      const mappedProductData = {
        name: productData.name,
        product_name: productData.name,
        description: productData.description || '',
        price: parseFloat(productData.price) || 0,
        stock_quantity: parseInt(productData.stock) || 0, // Map 'stock' from form to 'stock_quantity'
        sku: productData.sku || `SKU-${Date.now().toString().substring(9)}`,
        is_for_sale: true,
        category: productData.category || '',
        tax_rate: parseFloat(productData.taxRate) || 0, // Include tax rate
        status: productData.status || 'Active',
        tenant_id: tenantId // Include tenant ID for RLS
      };
      
      console.log("Submitting mapped product data to API:", mappedProductData);
      console.log("API endpoint: /api/inventory/products");
      
      // Set headers with tenant ID
      const headers = { 'x-tenant-id': tenantId };
      
      // Make an API request to the proper inventory endpoint
      const response = await axiosInstance.post('/api/inventory/products', mappedProductData, { headers });
      
      console.log("Product created successfully:", response.data);
      
      // Show success notification
      notifySuccess(`Product "${productData.name}" created successfully!`);
      
      // Navigate to products list
      router.push('/dashboard/products');
    } catch (error) {
      console.error("Error creating product:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      // Check for specific error types and provide better messages
      let errorMessage = 'Failed to create product. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The server is taking too long to respond.';
      } else if (error.response) {
        if (error.response.status === 400) {
          errorMessage = `Invalid data: ${error.response.data?.message || 'Please check your inputs'}`;
        } else if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'You do not have permission to create products';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      }
      
      // Set form error state
      setFormError(errorMessage);
      
      // Show error notification
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create New Product</h1>
        
        {/* Debugging button */}
        <button 
          onClick={() => {
            console.log("Debug button clicked");
            notifySuccess("Notification test - this should appear as a toast");
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Notification
        </button>
      </div>
      
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {formError}
        </div>
      )}
      
      {useStandardForm && (
        <ProductForm 
          mode="create" 
          onSubmit={handleSubmit} 
          error={formError} 
          loading={loading}
        />
      )}
      
      {useFallbackForm && (
        <FallbackForm onSubmit={handleSubmit} />
      )}
    </div>
  );
}