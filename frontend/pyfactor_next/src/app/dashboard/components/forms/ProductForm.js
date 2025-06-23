import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { inventoryService } from '@/services/inventoryService';
import { userService } from '@/services/userService';
import { useUser } from '@/contexts/UserContext';
import { fetchAuthSession  } from '@/config/amplifyUnified';
import { setTokens } from '@/utils/tenantUtils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

// This component is currently not used directly in the app
// It might be causing conflicts with ProductManagement.js
// Add a console warning to prevent accidental usage
console.warn('ProductForm.js is loaded but should not be used - use ProductManagement.js instead');

const ProductForm = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { user, loading: userLoading } = useUser();
  
  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    saleType: 'sale',
    salesTax: 0,
    stock_quantity: 0,
    reorder_level: 0,
    height: '',
    width: '',
    height_unit: 'cm',
    width_unit: 'cm',
    weight: '',
    weight_unit: 'kg',
  });
  const [error, setError] = useState('');
  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRefreshed, setSessionRefreshed] = useState(false);

  // Add debug warning
  useEffect(() => {
    console.warn('WARNING: ProductForm component mounted - this component might be conflicting with ProductManagement.js');
    return () => console.warn('ProductForm component unmounted');
  }, []);

  useEffect(() => {
    // Initialize tenant context from user data
    if (user?.tenant?.id) {
      console.log(`Product form initialized with tenant from context: ${user.tenant.id}`);
    } else if (!userLoading) {
      console.warn('No tenant context available in user data');
    }
    
    // Force session refresh when component mounts
    const refreshSession = async () => {
      try {
        logger.info('Manually refreshing session on ProductForm mount');
        const sessionResult = await fetchAuthSession({ forceRefresh: true });
        
        if (sessionResult.tokens?.idToken && sessionResult.tokens?.accessToken) {
          // Store tokens in AppCache instead of localStorage
          setCacheValue('tokens', {
            accessToken: sessionResult.tokens.accessToken.toString(),
            idToken: sessionResult.tokens.idToken.toString()
          });
          
          // Update tokens in tenant utils
          setTokens({
            accessToken: sessionResult.tokens.accessToken.toString(),
            idToken: sessionResult.tokens.idToken.toString()
          });
          
          logger.info('Session refreshed successfully on component mount');
          setSessionRefreshed(true);
          
          // Add a success snackbar
          setSnackbarSeverity('success');
          setSnackbarMessage('Session refreshed successfully');
          setOpenSnackbar(true);
        } else {
          logger.warn('Failed to refresh tokens on component mount');
          // Show warning to user
          setSnackbarSeverity('warning');
          setSnackbarMessage('Session refresh failed - try signing in again');
          setOpenSnackbar(true);
        }
      } catch (error) {
        logger.error('Error refreshing session on component mount:', error);
        setSnackbarSeverity('error');
        setSnackbarMessage('Session refresh error - please sign in again');
        setOpenSnackbar(true);
      }
    };
    
    refreshSession();
  }, [user, userLoading]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProduct((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setProduct({
      name: '',
      description: '',
      price: 0,
      saleType: 'sale',
      salesTax: 0,
      stock_quantity: 0,
      reorder_level: 0,
      height: '',
      width: '',
      height_unit: 'cm',
      width_unit: 'cm',
      weight: '',
      weight_unit: 'kg',
    });
    setError('');
  };

  // Handle authentication errors
  const handleAuthError = () => {
    setSnackbarSeverity('error');
    setSnackbarMessage('Your session has expired. Please sign in again.');
    setOpenSnackbar(true);
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '/auth/signin?error=session_expired';
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.name) {
      setError('Product name is required');
      return;
    }

    if (isSubmitting) {
      return; // Prevent multiple submissions
    }

    setIsSubmitting(true);

    try {
      // Always refresh session before submission
      logger.info('Refreshing session before product submission');
      const sessionResult = await fetchAuthSession({ forceRefresh: true });
      
      if (!sessionResult.tokens?.idToken || !sessionResult.tokens?.accessToken) {
        logger.warn('Failed to refresh tokens before submission - missing tokens');
        setSnackbarSeverity('error');
        setSnackbarMessage('Authentication failed - please sign in again');
        setOpenSnackbar(true);
        
        setTimeout(() => {
          window.location.href = '/auth/signin?error=session_expired';
        }, 2000);
        
        setIsSubmitting(false);
        return;
      }
      
      const accessToken = sessionResult.tokens.accessToken.toString();
      const idToken = sessionResult.tokens.idToken.toString();
      
      // Store tokens in AppCache instead of localStorage
      setCacheValue('tokens', {
        accessToken,
        idToken
      });
      
      // Update tokens in tenant utils
      setTokens({
        accessToken,
        idToken
      });
      
      logger.info('Session refreshed successfully before submission');
      
      // Get the tenant ID from AppCache
      if (!tenantId) {
        throw new Error('No valid tenant information available');
      }
      
      const schemaName = tenantId ? `tenant_${tenantId.replace(/-/g, '_')}` : null;
      
      logger.info('Submitting product with data:', {
        ...product,
        tenant: tenantId,
        schema: schemaName
      });
      
      // Set up headers with refreshed tokens
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Schema-Name': schemaName
      };
      
      // Make a direct fetch call to ensure all headers are sent correctly
      const response = await fetch('/api/inventory/products/', {
        method: 'POST',
        headers,
        body: JSON.stringify(product)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
        throw new Error(errorData.message || errorData.error || `Failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      
      logger.info('Product created successfully:', responseData);
      
      // Show success message
      setSnackbarSeverity('success');
      setSnackbarMessage('Product created successfully!');
      setOpenSnackbar(true);
      
      // Reset form
      resetForm();
      
      // Show print dialog if product has ID
      if (responseData.id) {
        setProduct(responseData);
        setOpenPrintDialog(true);
      }
    } catch (error) {
      logger.error('Error creating product', error);
      
      // Check for authentication errors
      if (error.response?.status === 401 || 
          error.message?.includes('session') || 
          error.message?.includes('Authentication required') ||
          error.response?.data?.code === 'session_expired' ||
          error.message?.includes('401')) {
        
        setSnackbarSeverity('error');
        setSnackbarMessage('Authentication failed - please sign in again');
        setOpenSnackbar(true);
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/auth/signin?error=session_expired';
        }, 2000);
      } else {
        // Generic error handling
        setSnackbarSeverity('error');
        setSnackbarMessage(`Error creating product: ${error.message}`);
        setOpenSnackbar(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  // Add diagnostics button
  const runDiagnostics = async () => {
    try {
      setSnackbarSeverity('info');
      setSnackbarMessage('Running authentication diagnostics...');
      setOpenSnackbar(true);
      
      // Get the tokens directly from AppCache to ensure they're the latest
      const tokens = getCacheValue('tokens');
      let accessToken, idToken;
      
      if (tokens) {
        try {
          accessToken = tokens.accessToken;
          idToken = tokens.idToken;
          logger.debug('Tokens found in AppCache:', {
            hasAccessToken: !!accessToken,
            hasIdToken: !!idToken
          });
        } catch (parseError) {
          logger.error('Error parsing tokens from AppCache:', parseError);
        }
      } else {
        logger.warn('No tokens found in AppCache');
      }
      
      // Also check regular AppCache keys as backup
      if (!accessToken) {
        accessToken = getCacheValue('accessToken') || 
                     getCacheValue('pyfactor_access_token');
      }
      
      if (!idToken) {
        idToken = getCacheValue('idToken') || 
                 getCacheValue('pyfactor_id_token');
      }
      
      // Get tenant info
      if (!tenantId) {
        setSnackbarSeverity('error');
        setSnackbarMessage('No tenant ID found in AppCache');
        setOpenSnackbar(true);
        return;
      }
      
      if (!accessToken || !idToken) {
        setSnackbarSeverity('error');
        setSnackbarMessage('No auth tokens found in AppCache');
        setOpenSnackbar(true);
        
        // Try to refresh auth session
        try {
          logger.info('Attempting to refresh missing tokens');
          const refreshResult = await fetchAuthSession({ forceRefresh: true });
          
          if (refreshResult.tokens?.accessToken && refreshResult.tokens?.idToken) {
            accessToken = refreshResult.tokens.accessToken.toString();
            idToken = refreshResult.tokens.idToken.toString();
            
            // Store in AppCache
            setCacheValue('tokens', {
              accessToken,
              idToken
            });
            
            logger.info('Successfully refreshed tokens');
            setSnackbarSeverity('success');
            setSnackbarMessage('Successfully refreshed authentication tokens');
            setOpenSnackbar(true);
          } else {
            logger.error('Failed to refresh tokens');
          }
        } catch (refreshError) {
          logger.error('Error refreshing tokens:', refreshError);
        }
      }
      
      // Make the diagnostic API call
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || ''}`,
        'X-Id-Token': idToken || '',
        };
      
      logger.info('Making diagnostic API call with headers:', {
        hasAuth: !!headers.Authorization,
        hasIdToken: !!headers['X-Id-Token'],
        hasTenant: !!headers['X-Tenant-ID']
      });
      
      const response = await fetch('/api/inventory/diagnostic', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId })
      });
      
      if (!response.ok) {
        throw new Error(`Diagnostic API returned status ${response.status}`);
      }
      
      const data = await response.json();
      logger.info('Diagnostic results:', data);
      
      if (data.diagnosticInfo?.auth) {
        const authInfo = data.diagnosticInfo.auth;
        
        if (authInfo.status === 'valid') {
          setSnackbarSeverity('success');
          setSnackbarMessage(`Authentication is valid! Token expires in ${Math.floor(authInfo.timeRemaining / 60)} minutes`);
        } else {
          setSnackbarSeverity('error');
          setSnackbarMessage(`Authentication issue: ${authInfo.message}`);
          
          // Try to refresh the tokens
          try {
            logger.info('Attempting to refresh tokens after diagnostic failure');
            const sessionResult = await fetchAuthSession({ forceRefresh: true });
            
            if (sessionResult.tokens?.idToken && sessionResult.tokens?.accessToken) {
              // Store tokens in AppCache
              setCacheValue('tokens', {
                accessToken: sessionResult.tokens.accessToken.toString(),
                idToken: sessionResult.tokens.idToken.toString()
              });
              
              // Update tokens in tenant utils
              setTokens({
                accessToken: sessionResult.tokens.accessToken.toString(),
                idToken: sessionResult.tokens.idToken.toString()
              });
              
              logger.info('Token refresh successful');
              setSnackbarSeverity('info');
              setSnackbarMessage('Session refreshed. Try product creation again.');
              setOpenSnackbar(true);
            } else {
              logger.warn('Token refresh returned incomplete data');
              setSnackbarSeverity('warning');
              setSnackbarMessage('Unable to refresh authentication. Try signing in again.');
            }
          } catch (refreshError) {
            logger.error('Failed to refresh session:', refreshError);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to refresh session. Please sign in again.');
          }
        }
      } else {
        setSnackbarSeverity('warning');
        setSnackbarMessage('Diagnostic check returned incomplete data');
      }
    } catch (error) {
      logger.error('Error running diagnostics:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage(`Diagnostic error: ${error.message}`);
      setOpenSnackbar(true);
    }
  };

  const handlePrintBarcode = async () => {
    try {
      if (!product.id) {
        console.error('Product must be saved before printing barcode');
        return;
      }

      // Check if it's a mock product
      if (product.id.toString().startsWith('mock-')) {
        // Generate a mock barcode
        const mockBarcodeData = `Mock barcode for ${product.name}`;
        
        // Create a mock download
        const blob = new Blob([mockBarcodeData], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `mock_barcode_${product.product_code}.txt`;
        link.click();
        
        setSnackbarSeverity('success');
        setSnackbarMessage('Mock barcode generated successfully');
        setOpenSnackbar(true);
        setOpenPrintDialog(false);
        resetForm(); // Reset the form after successful barcode generation
        return;
      }

      // Using inventoryService to ensure proper tenant context and authentication
      const barcodeData = await inventoryService.printProductBarcode(product.id);
      
      const blob = new Blob([barcodeData], { type: 'image/png' });

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `barcode_${product.product_code}.png`;
      link.click();

      setSnackbarSeverity('success');
      setSnackbarMessage('Barcode generated successfully');
      setOpenSnackbar(true);
      setOpenPrintDialog(false);
      resetForm(); // Reset the form after successful barcode generation
    } catch (error) {
      console.error('Error printing barcode:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Error generating barcode');
      setOpenSnackbar(true);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center mb-6">
        <div className="text-blue-600 mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800 mb-1`}>
            Add a Product
          </h1>
          <p className="text-gray-600">
            Create and manage your product inventory
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-600 mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">
              Create New Product
            </h2>
            <button 
              type="button"
              onClick={runDiagnostics}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              Check Authentication
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={product.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-1">Product Type</legend>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="saleType"
                      value="sale"
                      checked={product.saleType === 'sale'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">For Sale</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="saleType"
                      value="rent"
                      checked={product.saleType === 'rent'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">For Rent</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={product.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
          {product.saleType === 'sale' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  value={product.price}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="salesTax" className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Tax (%)
                </label>
                <input
                  id="salesTax"
                  name="salesTax"
                  type="number"
                  value={product.salesTax}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                id="stock_quantity"
                name="stock_quantity"
                type="number"
                value={product.stock_quantity}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {product.saleType === 'sale' && (
              <div>
                <label htmlFor="reorder_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Level
                </label>
                <input
                  id="reorder_level"
                  name="reorder_level"
                  type="number"
                  value={product.reorder_level}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          <div className="border border-gray-200 rounded-md">
            <div className="border-b border-gray-200 p-4 cursor-pointer" 
                 onClick={() => {
                   const el = document.getElementById('additional-info-content');
                   if (el) el.classList.toggle('hidden');
                 }}>
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium text-gray-700">Additional Information (Height, Width, Weight)</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div id="additional-info-content" className="p-4 hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                    Height
                  </label>
                  <input
                    id="height"
                    name="height"
                    type="number"
                    value={product.height}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="height_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Height Unit
                  </label>
                  <select
                    id="height_unit"
                    name="height_unit"
                    value={product.height_unit}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cm">Centimeter</option>
                    <option value="m">Meter</option>
                    <option value="in">Inch</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                    Width
                  </label>
                  <input
                    id="width"
                    name="width"
                    type="number"
                    value={product.width}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="width_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Width Unit
                  </label>
                  <select
                    id="width_unit"
                    name="width_unit"
                    value={product.width_unit}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cm">Centimeter</option>
                    <option value="m">Meter</option>
                    <option value="in">Inch</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    value={product.weight}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="weight_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight Unit
                  </label>
                  <select
                    id="weight_unit"
                    name="weight_unit"
                    value={product.weight_unit}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="kg">Kilogram</option>
                    <option value="lb">Pound</option>
                    <option value="g">Gram</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} justify-between items-center`}>
              <button
                type="submit"
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isMobile ? 'w-full mb-4' : ''} disabled:bg-blue-300`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </button>
              
              <button
                type="button"
                title="Learn more about product creation"
                className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </form>

      {product.saleType === 'rent' && (
        <p className="text-sm text-gray-600 mt-4 px-4">
          Create a custom rental plan{' '}
          <a href="/settings/business-settings/custom-charge-settings" className="text-blue-600 hover:underline">
            here
          </a>{' '}
          and use when making a sales transaction.
        </p>
      )}

      {/* Print Barcode Dialog */}
      {openPrintDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Print Barcode</h2>
            <p className="mb-6">Do you want to generate a barcode for this product?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setOpenPrintDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintBarcode}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                disabled={!product.id}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Generate Barcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast/Notification */}
      {openSnackbar && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          snackbarSeverity === 'success' ? 'bg-green-500' : 
          snackbarSeverity === 'error' ? 'bg-red-500' : 
          snackbarSeverity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white`}>
          <div className="flex items-center">
            {snackbarSeverity === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {snackbarSeverity === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {snackbarSeverity === 'warning' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {snackbarSeverity === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <span>{snackbarMessage}</span>
            <button 
              onClick={handleCloseSnackbar} 
              className="ml-4 text-white opacity-70 hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductForm;
