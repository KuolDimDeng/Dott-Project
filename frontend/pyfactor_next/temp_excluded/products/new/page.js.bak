'use client';

import { useState } from 'react';
import ProductForm from '../components/ProductForm'; // Import from the new Tailwind component
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { useNotification } from '@/context/NotificationContext'; // Import the notification hook
import { getCacheValue, setCacheValue } from '@/utils/appCache';

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
  const [debugLog, setDebugLog] = useState([]);
  const { notifySuccess, notifyError } = useNotification();
  
  // Helper function to log debug information
  const logDebug = (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage, data || '');
    
    setDebugLog(prev => [...prev, { 
      timestamp, 
      message, 
      data: data ? JSON.stringify(data).substring(0, 500) : null 
    }]);
  };
  
  // Add error recovery function
  const switchToFallbackForm = () => {
    logDebug("Switching to fallback form due to errors");
    setUseStandardForm(false);
    setUseFallbackForm(true);
    notifyError("Experiencing network issues. Switched to simplified form.");
  };
  
  const handleSubmit = async (productData) => {
    try {
      logDebug("Starting product submission with data", productData);
      setLoading(true);
      
      // Get tenant ID
      let tenantId = getCacheValue('tenantId') || getCacheValue('businessid');
      logDebug("Using tenant ID for product creation", { tenantId });
      
      // Debug every field
      logDebug("Product data fields", {
        name: productData.name,
        sku: productData.sku,
        price: typeof productData.price,
        priceValue: productData.price,
        stock: typeof productData.stock,
        stockValue: productData.stock,
        description: productData.description ? productData.description.length : 0
      });
      
      // Set timeout to prevent hanging request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logDebug("Request timeout triggered, aborting fetch");
        controller.abort();
      }, 10000); // 10 second timeout
      
      // Map the form data to the expected structure for inventory_product table
      // The server expects stock_quantity but our form provides 'stock'
      const mappedProductData = {
        name: productData.name,
        product_name: productData.name,
        description: productData.description || '',
        price: parseFloat(productData.price) || 0,
        stock_quantity: parseInt(productData.stock || productData.stock_quantity) || 0, // Handle both field names
        sku: productData.sku || `SKU-${Date.now().toString().substring(9)}`,
        is_for_sale: true,
        category: productData.category || '',
        tax_rate: parseFloat(productData.taxRate) || 0, // Include tax rate
        status: productData.status || 'Active',
        tenant_id: tenantId // Include tenant ID for RLS
      };
      
      logDebug("Mapped product data for API", mappedProductData);
      
      // Try direct API endpoint first with native fetch
      try {
        logDebug("Attempting direct API call to /api/inventory/products");
        // Set headers with tenant ID
        const headers = { 
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        };
        
        logDebug("Request headers", headers);
        
        // Make API request with a timeout
        logDebug("Sending fetch request...");
        const response = await fetch('/api/inventory/products', {
          method: 'POST',
          headers,
          body: JSON.stringify(mappedProductData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout
        
        logDebug("Received response", { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logDebug("Response not OK", { errorText });
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        logDebug("Product created successfully", data);
        
        // Show success notification
        notifySuccess(`Product "${productData.name}" created successfully!`);
        
        // Navigate to products list
        logDebug("Navigating to products list");
        router.push('/dashboard/products');
        return;
      } catch (fetchError) {
        // Log error but try alternative endpoint
        logDebug("Direct API call failed", { 
          message: fetchError.message,
          code: fetchError.code,
          name: fetchError.name,
          stack: fetchError.stack
        });
        clearTimeout(timeoutId); // Ensure timeout is cleared
        
        // Try alternative endpoint with alternative method
        logDebug("Trying alternative endpoint: /api/products");
        const headers = { 
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        };
        
        try {
          // Create a new abort controller for this request
          const altController = new AbortController();
          const altTimeoutId = setTimeout(() => {
            logDebug("Alternative request timeout triggered, aborting fetch");
            altController.abort();
          }, 10000);
          
          logDebug("Sending alternative fetch request...");
          const altResponse = await fetch('/api/products', {
            method: 'POST',
            headers,
            body: JSON.stringify(mappedProductData),
            signal: altController.signal
          });
          
          clearTimeout(altTimeoutId);
          
          logDebug("Received alternative response", { 
            status: altResponse.status, 
            statusText: altResponse.statusText,
            ok: altResponse.ok
          });
          
          if (!altResponse.ok) {
            const errorText = await altResponse.text();
            logDebug("Alternative response not OK", { errorText });
            throw new Error(`Alternative server responded with ${altResponse.status}: ${errorText}`);
          }
          
          const altData = await altResponse.json();
          logDebug("Product created successfully via alternative endpoint", altData);
          
          // Show success notification
          notifySuccess(`Product "${productData.name}" created successfully!`);
          
          // Navigate to products list
          logDebug("Navigating to products list after alternative success");
          router.push('/dashboard/products');
          return;
        } catch (altError) {
          logDebug("Alternative API call also failed", { 
            message: altError.message,
            code: altError.code,
            name: altError.name,
            stack: altError.stack
          });
          throw altError; // Let the outer try/catch handle it
        }
      }
    } catch (error) {
      logDebug("Error creating product (outer catch)", {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        response: error.response?.data || null
      });
      
      // Try local storage fallback for completely offline mode
      try {
        logDebug("Attempting local storage fallback");
        if (typeof window !== 'undefined') {
          // Get existing products
          const existingProducts = JSON.parse(getCacheValue('offlineProducts') || '[]');
          
          // Add the new product with a local ID
          const offlineProduct = {
            ...productData,
            id: `offline-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'offline'
          };
          
          // Save to localStorage
          setCacheValue('offlineProducts', [...existingProducts, offlineProduct]);
          
          logDebug("Saved product to offline storage", offlineProduct);
          notifySuccess(`Product saved offline. Will sync when connection is restored.`);
          
          // Navigate to products list
          router.push('/dashboard/products');
          return;
        }
      } catch (storageError) {
        logDebug("Failed to save product offline", {
          message: storageError.message,
          stack: storageError.stack
        });
      }
      
      // Check for specific error types and provide better messages
      let errorMessage = 'Failed to create product. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
        errorMessage = 'Request timed out. The server is taking too long to respond.';
        logDebug("Timeout error detected", { errorMessage });
        switchToFallbackForm(); // Switch to fallback form on timeout
      } else if (error.response) {
        logDebug("Response error detected", { 
          status: error.response.status,
          data: error.response.data 
        });
        
        if (error.response.status === 400) {
          errorMessage = `Invalid data: ${error.response.data?.message || 'Please check your inputs'}`;
        } else if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'You do not have permission to create products';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
          switchToFallbackForm(); // Switch to fallback form on server error
        }
      } else if (error.message && error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection.';
        logDebug("Network error detected", { errorMessage });
        switchToFallbackForm(); // Switch to fallback form on network error
      }
      
      // Set form error state
      setFormError(errorMessage);
      
      // Show error notification
      notifyError(errorMessage);
    } finally {
      setLoading(false);
      logDebug("Product submission handling completed");
    }
  };
  
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create New Product</h1>
        
        {/* Debugging info */}
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              console.log("Full debug log:", debugLog);
              const logText = debugLog.map(entry => 
                `[${entry.timestamp}] ${entry.message} ${entry.data ? `\n${entry.data}` : ''}`
              ).join('\n\n');
              
              // Create blob and download
              const blob = new Blob([logText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'product-creation-debug.log';
              a.click();
            }}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
          >
            Download Debug Log
          </button>
          
          <button 
            onClick={() => {
              logDebug("Test notification triggered");
              notifySuccess("Notification test - this should appear as a toast");
            }}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          >
            Test Notification
          </button>
        </div>
      </div>
      
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {formError}
        </div>
      )}
      
      {/* Debug information panel */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded overflow-auto max-h-40 text-xs">
        <h3 className="font-bold mb-2">Debug Log (Last 5 entries)</h3>
        {debugLog.slice(-5).map((entry, index) => (
          <div key={index} className="mb-1">
            <span className="text-gray-500">[{entry.timestamp.split('T')[1].split('.')[0]}]</span>{' '}
            <span className="font-medium">{entry.message}</span>
            {entry.data && (
              <div className="pl-5 text-gray-600 break-all">{entry.data}</div>
            )}
          </div>
        ))}
      </div>
      
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