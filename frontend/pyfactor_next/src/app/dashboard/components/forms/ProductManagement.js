'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useReducer, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import { useTable, usePagination, useSortBy } from 'react-table';
import PropTypes from 'prop-types';
import { useNotification } from '@/context/NotificationContext';
import { productApi } from '@/utils/apiClient';
import { useMemoryOptimizer } from '@/utils/memoryManager';
import { apiClient } from '@/utils/apiClient';
import axios from 'axios';
import { logger } from '@/utils/logger';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { getCacheValue } from '@/utils/appCache';

// Import UI components needed for the Tailwind version
const Typography = ({ variant, component, className, color, children, gutterBottom, ...props }) => {
  let baseClasses = '';
  
  // Handle variants
  if (variant === 'h4' || (component === 'h1' && !variant)) {
    baseClasses = 'text-2xl font-bold';
  } else if (variant === 'h5') {
    baseClasses = 'text-xl font-semibold';
  } else if (variant === 'h6') {
    baseClasses = 'text-lg font-medium';
  } else if (variant === 'subtitle1' || variant === 'subtitle2') {
    baseClasses = 'text-sm font-medium';
  } else if (variant === 'body1') {
    baseClasses = 'text-base';
  } else if (variant === 'body2') {
    baseClasses = 'text-sm';
  }
  
  // Handle colors
  if (color === 'textSecondary') {
    baseClasses += ' text-gray-500';
  } else if (color === 'primary') {
    baseClasses += ' text-blue-600';
  } else if (color === 'error') {
    baseClasses += ' text-red-600';
  }
  
  // Handle gutterBottom
  if (gutterBottom) {
    baseClasses += ' mb-2';
  }
  
  const Tag = component || 'p';
  
  return (
    <Tag className={`${baseClasses} ${className || ''}`} {...props}>
      {children}
    </Tag>
  );
};

const Alert = ({ severity, className, children }) => {
  let bgColor = 'bg-blue-50';
  let borderColor = 'border-blue-400';
  let textColor = 'text-blue-800';
  
  if (severity === 'error') {
    bgColor = 'bg-red-50';
    borderColor = 'border-red-400';
    textColor = 'text-red-800';
  } else if (severity === 'warning') {
    bgColor = 'bg-yellow-50';
    borderColor = 'border-yellow-400';
    textColor = 'text-yellow-800';
  } else if (severity === 'success') {
    bgColor = 'bg-green-50';
    borderColor = 'border-green-400';
    textColor = 'text-green-800';
  } else if (severity === 'info') {
    bgColor = 'bg-blue-50';
    borderColor = 'border-blue-400';
    textColor = 'text-blue-800';
  }
  
  return (
    <div className={`p-4 mb-4 ${bgColor} border-l-4 ${borderColor} ${textColor} ${className || ''}`}>
      {children}
    </div>
  );
};

const Paper = ({ elevation, className, children }) => {
  const shadowClass = elevation === 3 ? 'shadow-md' : 'shadow-sm';
  
  return (
    <div className={`bg-white rounded-lg ${shadowClass} ${className || ''}`}>
      {children}
    </div>
  );
};

const FormControl = ({ component, fullWidth, className, children }) => {
  const width = fullWidth ? 'w-full' : '';
  const Tag = component || 'div';
  
  return (
    <Tag className={`${width} ${className || ''}`}>
      {children}
    </Tag>
  );
};

const FormGroup = ({ row, className, children }) => {
  const direction = row ? 'flex flex-row' : 'flex flex-col';
  
  return (
    <div className={`${direction} ${className || ''}`}>
      {children}
    </div>
  );
};

const FormControlLabel = ({ control, label }) => {
  return (
    <label className="inline-flex items-center">
      {control}
      <span className="ml-2">{label}</span>
    </label>
  );
};

const TextField = ({ label, fullWidth, multiline, rows, value, onChange, required, placeholder, name, type, inputProps, variant, className, onClick, autoComplete }) => {
  const width = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`mb-4 ${width} ${className || ''}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          rows={rows || 3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      ) : (
        <input
          type={type || 'text'}
          name={name}
          value={value}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          {...inputProps}
        />
      )}
    </div>
  );
};

const Button = ({ variant, color, size, onClick, disabled, type, className, startIcon, children }) => {
  let baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  if (size === 'small') {
    baseClasses += ' px-2.5 py-1.5 text-xs';
  } else if (size === 'large') {
    baseClasses += ' px-6 py-3 text-base';
  } else {
    baseClasses += ' px-4 py-2 text-sm'; // Medium (default)
  }
  
  // Variant and color classes
  if (variant === 'contained') {
    if (color === 'primary') {
      baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
    } else if (color === 'info') {
      baseClasses += ' bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500';
    } else {
      baseClasses += ' bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
    }
  } else if (variant === 'outlined') {
    if (color === 'primary') {
      baseClasses += ' border border-blue-500 text-blue-700 hover:bg-blue-50 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' border border-purple-500 text-purple-700 hover:bg-purple-50 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' border border-red-500 text-red-700 hover:bg-red-50 focus:ring-red-500';
    } else if (color === 'info') {
      baseClasses += ' border border-sky-500 text-sky-700 hover:bg-sky-50 focus:ring-sky-500';
    } else {
      baseClasses += ' border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500';
    }
  } else {
    // Text variant
    if (color === 'primary') {
      baseClasses += ' text-blue-700 hover:bg-blue-50 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' text-purple-700 hover:bg-purple-50 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' text-red-700 hover:bg-red-50 focus:ring-red-500';
    } else {
      baseClasses += ' text-gray-700 hover:bg-gray-50 focus:ring-gray-500';
    }
  }
  
  // Disabled state
  if (disabled) {
    baseClasses = baseClasses.replace(/hover:[^ ]*/g, '');
    baseClasses += ' opacity-50 cursor-not-allowed';
  }
  
  return (
    <button
      type={type || 'button'}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClasses} ${className || ''}`}
    >
      {startIcon && <span className="mr-2">{startIcon}</span>}
      {children}
    </button>
  );
};

const CircularProgress = ({ size, color, className }) => {
  const sizeClass = size === 'small' ? 'h-4 w-4' : 'h-6 w-6';
  const colorClass = color === 'inherit' ? 'text-current' : 'text-blue-600';
  
  return (
    <svg className={`animate-spin ${sizeClass} ${colorClass} ${className || ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};

// Simple fallback checkbox in case we need it
const FallbackCheckbox = ({ checked, onChange, name, label }) => {
  return (
    <div className="flex items-center">
      <input
        id={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label && (
        <label htmlFor={name} className="ml-2 text-sm text-gray-700">
          {label}
        </label>
      )}
    </div>
  );
};

// Dialog components to match MUI's Dialog components
const DialogTitle = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 border-b ${className || ''}`}>
      <h3 className="text-lg font-medium text-gray-900">{children}</h3>
    </div>
  );
};

const DialogContent = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 ${className || ''}`}>
      {children}
    </div>
  );
};

const DialogActions = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 border-t flex justify-end space-x-2 ${className || ''}`}>
      {children}
    </div>
  );
};

// Custom QR code icon using SVG
const QrCodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
    <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
  </svg>
);

// Modern Form Layout component using Tailwind classes
const ModernFormLayout = ({ children, title, subtitle, onSubmit, isLoading, submitLabel }) => {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (typeof onSubmit === 'function') {
        onSubmit(e);
      }
    }} className="shadow-lg rounded-lg bg-white p-6 w-full">
      {title && (
        <div className="mb-6 border-b pb-3">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
      
      <div className="mb-6">
        {children}
      </div>
      
      <div className="flex justify-end mt-4 pt-3 border-t">
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          className={`relative overflow-hidden ${isLoading ? 'bg-blue-500 cursor-not-allowed opacity-80' : 'bg-blue-700 hover:bg-blue-800'}`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Processing...</span>
            </div>
          ) : (
            <span>{submitLabel || 'Submit'}</span>
          )}
        </Button>
      </div>
    </form>
  );
};

// Tailwind checkbox component
const TailwindCheckbox = ({ checked, onChange, name, label }) => {
  return (
    <div className="flex items-center">
      <input
        id={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label && (
        <label htmlFor={name} className="ml-2 text-sm text-gray-700">
          {label}
        </label>
      )}
    </div>
  );
};

// Component for tabbed product management
const ProductManagement = ({ isNewProduct = false, mode = 'list', product = null, onUpdate, onCancel, salesContext }) => {
  const notifySuccess = (message) => toast.success(message);
  const notifyError = (message) => toast.error(message);
  const notifyInfo = (message) => toast.loading(message);
  const notifyWarning = (message) => toast.error(message, { icon: '⚠️' });
  
  // Add isMounted ref to track component mounting status
  const isMounted = useRef(true);
  // Add refs for tracking network requests and timeouts
  const fetchRequestRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  
  // Effect to track component mount status
  useEffect(() => {
    // Set to true on mount (though it's already initialized as true)
    isMounted.current = true;
    // Cleanup function sets to false when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // State for managing component behavior
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState(() => []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editedProduct, setEditedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdProductId, setCreatedProductId] = useState(null);
  const [isBarcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [currentBarcodeProduct, setCurrentBarcodeProduct] = useState(null);
  const [apiHealthStatus, setApiHealthStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [dbInitializing, setDbInitializing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [displayMessage, setDisplayMessage] = useState('');
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    cost: '',
    stockQuantity: '',
    reorderLevel: '',
    forSale: true,
    forRent: false
  });

  // Initialize tenantId from AppCache
  const getTenantId = () => {
    try {
      return typeof window !== 'undefined' ? 
        getCacheValue('tenantId') || getCacheValue('businessid') || 'default' :
        'default';
    } catch (e) {
      console.error('Error accessing AppCache for tenantId:', e);
      return 'default';
    }
  };
  
  const [tenantId, setTenantId] = useState(getTenantId());
  
  // State for form fields - use a single object for better state preservation during hot reloading
  const [formState, setFormState] = useState(() => ({
    name: '',
    description: '',
    price: '',
    forSale: true,
    forRent: false,
    stockQuantity: '',
    reorderLevel: ''
  }));
  
  // For edited product state - also use a single object
  const [editFormState, setEditFormState] = useState(() => ({
    name: '',
    description: '',
    price: '',
    forSale: true,
    forRent: false,
    stockQuantity: '',
    reorderLevel: ''
  }));

  // Modify the fetchProducts function to use getSecureTenantId
  const fetchProducts = useCallback(async (page = 0, shouldRetry = true, retryCount = 0) => {
    try {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Cancel any in-flight request
      if (fetchRequestRef.current) {
        fetchRequestRef.current.abort();
      }
      
      // Create a new AbortController
      const controller = new AbortController();
      fetchRequestRef.current = controller;
      
      // Debounce the fetch call
      fetchTimeoutRef.current = setTimeout(async () => {
        if (isMounted.current) {
          setIsLoading(true);
          setFetchError(null);
          
          try {
            // Get tenant ID securely from Cognito only
            const tenantId = await getSecureTenantId();
            console.log('[ProductManagement] Fetching products with secure Cognito tenant ID:', tenantId);
            
            if (!tenantId) {
              console.error('[ProductManagement] No secure tenant ID found in Cognito, cannot fetch products');
              setFetchError('Authentication error: Unable to verify your organization. Please log out and sign in again.');
              setIsLoading(false);
              return;
            }
            
            const response = await axios.get('/api/inventory/products', {
              params: { page },
              headers: { 'x-tenant-id': tenantId },
              signal: controller.signal
            });
            
            if (isMounted.current) {
              // Check for newer API response format (data property)
              if (response.data && response.data.data && Array.isArray(response.data.data)) {
                console.log('[ProductManagement] Found products in data property:', response.data.data.length);
                setProducts(response.data.data);
              } 
              // Handle legacy format - direct array
              else if (response.data && Array.isArray(response.data)) {
                console.log('[ProductManagement] Found products in direct array:', response.data.length);
                setProducts(response.data);
              } 
              // Handle object with products array
              else if (response.data && response.data.products && Array.isArray(response.data.products)) {
                console.log('[ProductManagement] Found products in products property:', response.data.products.length);
                setProducts(response.data.products);
              } 
              else {
                // Set an empty array if the response doesn't contain valid data
                console.warn('API response does not contain a valid products array:', response.data);
                setProducts([]);
              }
              setIsLoading(false);
            }
          } catch (error) {
            // Handle only if component is still mounted and request wasn't canceled
            if (isMounted.current && !axios.isCancel(error)) {
              console.error('Error fetching products:', error);
              
              // Check for database initialization error
              if (error.response && error.response.status === 500 && 
                  error.response.data && 
                  (typeof error.response.data === 'string' ? 
                    error.response.data.includes('still initializing') : 
                    error.response.data.message && typeof error.response.data.message === 'string' && 
                    error.response.data.message.includes('still initializing'))) {
                setFetchError('Database is initializing. Please wait a moment...');
                
                // Retry with exponential backoff if needed
                if (shouldRetry && retryCount < 3) {
                  const backoffTime = Math.pow(2, retryCount) * 1000;
                  setTimeout(() => {
                    if (isMounted.current) {
                      fetchProducts(page, true, retryCount + 1);
                    }
                  }, backoffTime);
                }
              } else {
                // Get the most accurate error message available
                const errorMessage = 
                  (error.response && error.response.data && error.response.data.message) ? 
                    error.response.data.message : 
                  (error.response && error.response.data && typeof error.response.data === 'string') ?
                    error.response.data :
                  (error.message) ? 
                    error.message : 
                    'Failed to load products. Please try again.';
                    
                setFetchError(errorMessage);
              }
              
              setIsLoading(false);
            }
          }
        }
      }, 300); // Debounce for 300ms
    } catch (error) {
      console.error('Error in fetchProducts:', error);
    }
  }, [isMounted]);

  // Update useEffect cleanup to cancel pending requests
  useEffect(() => {
    fetchProducts();
    
    return () => {
      // Clean up any pending requests or timeouts
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (fetchRequestRef.current) {
        fetchRequestRef.current.abort();
      }
    };
  }, [fetchProducts]);

  // Ensure we always return the same number of hooks by keeping all hook calls unconditional
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset editing state when tab changes to Create - keeping this unconditional
  useEffect(() => {
    if (activeTab === 0) {
      setIsEditing(false);
    }
  }, [activeTab]);
  
  // Load products on mount
  useEffect(() => {
    if (mounted) {
      // Load products on component mount 
      fetchProducts();
    }
  }, [mounted, fetchProducts]);
  
  // Add an effect to reload products when needed - e.g., after creating a product
  useEffect(() => {
    // Listen for changes in successMessage - a sign we should refresh data
    if (successMessage && successMessage.includes('created successfully')) {
      console.log('[ProductManagement] Product created, refreshing product list');
      fetchProducts();
    }
  }, [successMessage, fetchProducts]);

  // Update the getUserTenantId function
  const getUserTenantId = useCallback(async () => {
    // Get tenant ID securely from Cognito only
    const secureTenantId = await getSecureTenantId();
    
    if (secureTenantId) {
      logger.info(`[ProductManagement] Using secure Cognito tenant ID for RLS: ${secureTenantId}`);
      return secureTenantId;
    }
    
    logger.error('[ProductManagement] No secure tenant ID found in Cognito');
    return null;
  }, []);

  // Handle edit product and view details with memoized functions
  const handleEditClick = useCallback((product) => {
    // First update the state
    setEditedProduct(product);
    setSelectedProduct(product);
    setIsEditing(true);
    
    // Set edit form state
    setEditFormState({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      forSale: product.for_sale !== false,
      forRent: !!product.for_rent,
      stockQuantity: product.stock_quantity || '',
      reorderLevel: product.reorder_level || ''
    });
    
    // Then switch to the create tab for editing
    setActiveTab(0);
  }, []);

  const handleViewDetails = useCallback((product) => {
    // Update the selected product first
    setSelectedProduct(product);
    
    // Then switch to the details tab
    setActiveTab(1);
  }, []);
  
  const handleGenerateBarcode = useCallback((product) => {
    setCurrentBarcodeProduct(product);
    setBarcodeDialogOpen(true);
  }, []);

  // Add a handler for form field changes
  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);
  
  // Handle edit form field changes
  const handleEditFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setEditFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Initialize edit form when editing a product
  useEffect(() => {
    if (editedProduct) {
      setEditFormState({
        name: editedProduct.name || '',
        description: editedProduct.description || '',
        price: editedProduct.price || '',
        forSale: editedProduct.for_sale !== false,
        forRent: !!editedProduct.for_rent,
        stockQuantity: editedProduct.stock_quantity || '',
        reorderLevel: editedProduct.reorder_level || ''
      }, [/* TODO: Add dependencies */]);
    }
  }, [editedProduct]);

  // Check API health
  const checkApiHealth = useCallback(async () => {
    try {
      // First try to ping the base API 
      const healthCheck = await productApi.getHealth();
      
      console.log('API health check:', healthCheck.status, healthCheck.data);
      
      return {
        status: healthCheck.status < 400 ? 'ok' : 'error',
        message: `API health check: ${healthCheck.status} ${healthCheck.statusText}`,
        details: healthCheck.data
      };
    } catch (error) {
      console.error('API health check error:', error);
      return {
        status: 'error',
        message: `API unreachable: ${error.message}`,
        error
      };
    }
  }, []);

  // Add a mock products array for fallback when API fails
  const mockProducts = [
    {
      id: 'mock-1',
      name: 'Sample Product 1',
      description: 'This is a sample product for demonstration',
      price: 99.99,
      for_sale: true,
      for_rent: false,
      stock_quantity: 10,
      reorder_level: 5,
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-2',
      name: 'Sample Product 2',
      description: 'Another sample product for demonstration',
      price: 149.99,
      for_sale: true,
      for_rent: true,
      stock_quantity: 5,
      reorder_level: 2,
      created_at: new Date().toISOString()
    }
  ];

  // Create handlers for form field updates with useCallback
  const handleNameChange = useCallback((e) => setFormState(prev => ({ ...prev, name: e.target.value })), []);
  const handleDescriptionChange = useCallback((e) => setFormState(prev => ({ ...prev, description: e.target.value })), []);
  const handlePriceChange = useCallback((e) => setFormState(prev => ({ ...prev, price: e.target.value })), []);
  const handleForSaleChange = useCallback((e) => setFormState(prev => ({ ...prev, forSale: e.target.checked })), []);
  const handleForRentChange = useCallback((e) => setFormState(prev => ({ ...prev, forRent: e.target.checked })), []);
  const handleStockQuantityChange = useCallback((e) => setFormState(prev => ({ ...prev, stockQuantity: e.target.value })), []);
  const handleReorderLevelChange = useCallback((e) => setFormState(prev => ({ ...prev, reorderLevel: e.target.value })), []);
  
  // Create handlers for edit form field updates
  const handleEditNameChange = useCallback((e) => setEditFormState(prev => ({ ...prev, name: e.target.value })), []);
  const handleEditDescriptionChange = useCallback((e) => setEditFormState(prev => ({ ...prev, description: e.target.value })), []);
  const handleEditPriceChange = useCallback((e) => setEditFormState(prev => ({ ...prev, price: e.target.value })), []);
  const handleEditForSaleChange = useCallback((e) => setEditFormState(prev => ({ ...prev, forSale: e.target.checked })), []);
  const handleEditForRentChange = useCallback((e) => setEditFormState(prev => ({ ...prev, forRent: e.target.checked })), []);
  const handleEditStockQuantityChange = useCallback((e) => setEditFormState(prev => ({ ...prev, stockQuantity: e.target.value })), []);
  const handleEditReorderLevelChange = useCallback((e) => setEditFormState(prev => ({ ...prev, reorderLevel: e.target.value })), []);

  // Create memoized tab navigation handlers
  const handleCreateTab = useCallback(() => {
    setActiveTab(0);
  }, []);
  
  const handleDetailsTab = useCallback(() => {
    if (selectedProduct) {
      setActiveTab(1);
    }
  }, [selectedProduct]);
  
  const handleListTab = useCallback(() => {
    setActiveTab(2);
  }, []);

  // Handle product deletion
  const handleDeleteProduct = useCallback(async (productId) => {
    if (!productId || !window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`[ProductManagement] Attempting to delete product with ID: ${productId}`);
      
      const tenantId = await getUserTenantId();
      
      // Use RLS for deletion with tenant ID in headers
      await axios.delete(`/api/inventory/products/${productId}`, {
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      console.log(`[ProductManagement] Successfully deleted product with ID: ${productId}`);
      setSuccessMessage('Product deleted successfully');
      
      // Refresh the product list
      fetchProducts();
      
      // If the deleted product was selected, clear selection
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct(null);
        setActiveTab(2); // Go back to list view
      }
    } catch (error) {
      console.error('[ProductManagement] Error deleting product:', error);
      setErrorMessage(`Failed to delete product: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProduct, fetchProducts, setActiveTab, setSelectedProduct, setSuccessMessage, setErrorMessage, setIsLoading]);

  // Create a FallbackComponent to show when the database has issues
  const DatabaseErrorFallback = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Database connection in progress</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>The product database is currently being initialized with Row-Level Security. You're seeing demo data for now.</p>
            <p className="mt-1">You can still try out all features, but data will be properly secured by tenant when saved.</p>
          </div>
          <div className="mt-3">
            <button
              onClick={fetchProducts}
              className="inline-flex items-center px-3 py-1.5 border border-yellow-600 text-xs font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size="small" className="mr-2" />
              ) : (
                <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Update the handleCreateProduct function
  const handleCreateProduct = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      
      // Get tenant ID securely from Cognito only
      const tenantId = await getSecureTenantId();
      
      if (!tenantId) {
        setCreateError(new Error('Authentication error: Unable to verify your organization. Please log out and sign in again.'));
        setErrorMessage('Authentication error: Unable to verify your organization. Please log out and sign in again.');
        return;
      }
      
      console.log('[ProductManagement] Creating product with secure Cognito tenant ID:', tenantId);
      
      // Create product object with tenant ID
      const newProduct = {
        name: formState.name,
        description: formState.description,
        sku: formState.sku || `SKU-${Date.now()}`,
        price: parseFloat(formState.price) || 0,
        cost: parseFloat(formState.cost) || 0,
        stock_quantity: parseInt(formState.stockQuantity) || 0,
        reorder_level: parseInt(formState.reorderLevel) || 0,
        for_sale: formState.forSale || false,
        for_rent: formState.forRent || false,
        tenant_id: tenantId  // Include tenant ID in the request body
      };
      
      // Send request with tenant ID in headers
      const response = await axios.post('/api/inventory/products', newProduct, {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      setProducts(prevProducts => [...prevProducts, response.data.product]);
      resetForm();
      setShowForm(false);
      setDisplayMessage('Product created successfully!');
      setSuccessMessage('Product created successfully!');
    } catch (error) {
      console.error('[ProductManagement] Error creating product:', error);
      setCreateError(error);
      setErrorMessage(`Failed to create product: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Reset form after successful submission
  const resetForm = () => {
    setFormState({
      name: '',
      description: '',
      price: '',
      forSale: true,
      forRent: false,
      stockQuantity: '',
      reorderLevel: ''
    });
  };

  // Success Dialog component
  const SuccessDialog = useCallback(() => {
    return (
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle className="border-b pb-2">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            Product Created Successfully
          </div>
        </DialogTitle>
        <DialogContent className="pt-4">
          <Typography variant="h6" className="mb-2">Your product has been created successfully!</Typography>
          <Typography variant="body1" className="mb-4">
            Your product is now saved in the inventory system and can be managed from the Products List.
          </Typography>
          <Alert severity="info" className="mb-2">
            <div className="flex items-center">
              <QrCodeIcon className="mr-2" />
              <Typography variant="body1" className="font-medium">
                Print QR Code for Inventory Management
              </Typography>
            </div>
            <Typography variant="body2" className="mt-1">
              You can now generate and print a QR code label for this product to streamline your inventory management.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions className="border-t p-3">
          <Button onClick={() => setSuccessDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }, [successDialogOpen]);

  // Render the create product form
  const renderCreateForm = () => {
    return (
      <ModernFormLayout 
        title="Create New Product" 
        subtitle="Add a new product to your inventory"
        onSubmit={handleCreateProduct}
        isLoading={isSubmitting}
        submitLabel="Create Product"
      >
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <p className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {errorMessage}
            </p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
            <p className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <TextField
              label="Product Name"
              name="name"
              value={formState.name}
              onChange={handleFormChange}
              fullWidth
              required
            />
          </div>
          
          <div className="col-span-2">
            <TextField
              label="Description"
              name="description"
              value={formState.description}
              onChange={handleFormChange}
              multiline
              rows={3}
              fullWidth
            />
          </div>
          
          <div>
            <TextField
              label="Price"
              name="price"
              type="number"
              value={formState.price}
              onChange={handleFormChange}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </div>
          
          <div>
            <TextField
              label="Stock Quantity"
              name="stockQuantity"
              type="number"
              value={formState.stockQuantity}
              onChange={handleFormChange}
              fullWidth
              inputProps={{ min: 0, step: 1 }}
            />
          </div>
          
          <div>
            <TextField
              label="Reorder Level"
              name="reorderLevel"
              type="number"
              value={formState.reorderLevel}
              onChange={handleFormChange}
              fullWidth
              inputProps={{ min: 0, step: 1 }}
            />
          </div>
          
          <div className="flex items-center pt-4">
            <FormGroup row>
              <FormControlLabel
                control={
                  <TailwindCheckbox
                    checked={formState.forSale}
                    onChange={(e) => 
                      setFormState(prev => ({ ...prev, forSale: e.target.checked }))
                    }
                    name="forSale"
                  />
                }
                label="Available for Sale"
              />
              
              <FormControlLabel
                control={
                  <TailwindCheckbox
                    checked={formState.forRent}
                    onChange={(e) => 
                      setFormState(prev => ({ ...prev, forRent: e.target.checked }))
                    }
                    name="forRent"
                  />
                }
                label="Available for Rent"
              />
            </FormGroup>
          </div>
        </div>
      </ModernFormLayout>
    );
  };

  // Render the product details view
  const renderProductDetails = () => {
    if (!selectedProduct) {
      return (
        <Paper elevation={3} className="p-3 mt-2 text-center">
          <Typography>Please select a product to view details</Typography>
        </Paper>
      );
    }
    
    return (
      <ModernFormLayout 
        title={isEditing ? "Edit Product" : "Product Details"} 
        subtitle={`Product Code: ${selectedProduct.product_code || 'N/A'}`}
        onSubmit={e => {
          e.preventDefault();
          if (isEditing) handleSaveEdit();
        }}
        isLoading={isSubmitting}
        submitLabel="Save Changes"
      >
        <div className="statusBar">
          <div>
            <Typography variant="h5" className="mb-2">
              {selectedProduct.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedProduct.description || 'No description available'}
            </Typography>
          </div>
          
          <div>
            <span className={`statusTag ${selectedProduct.stock_quantity > 0 ? 'active' : 'inactive'}`}>
              {selectedProduct.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Price</Typography>
            <Typography variant="body1">${selectedProduct.price}</Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Stock Quantity</Typography>
            <Typography variant="body1">{selectedProduct.stock_quantity}</Typography>
          </div>
          
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Reorder Level</Typography>
            <Typography variant="body1">{selectedProduct.reorder_level || 'Not set'}</Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Available for</Typography>
            <Typography variant="body1">
              {[
                selectedProduct.for_sale && 'Sale',
                selectedProduct.for_rent && 'Rent'
              ].filter(Boolean).join(', ') || 'Not available'}
            </Typography>
          </div>
        </div>
        
        <div className="formActions">
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              handleEditClick(selectedProduct);
            }}
          >
            Edit Product
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<QrCodeIcon fontSize="small" />}
            onClick={() => {
              handleGenerateBarcode(selectedProduct);
            }}
          >
            Generate QR Code
          </Button>
        </div>
      </ModernFormLayout>
    );
  };

  // Define all memoized values consistently at the top level of the component
  const columns = React.useMemo(
    () => [
      {
        Header: 'Code',
        accessor: row => row.product_code || row.productCode || `P-${row.id}`,
        id: 'product_code',
      },
      { 
        Header: 'Name', 
        accessor: row => row.name || 'Unnamed Product',
        id: 'name',
      },
      { 
        Header: 'Price',
        accessor: 'price',
        Cell: ({ value }) => `$${value || 0}`,
      },
      {
        Header: 'Stock',
        accessor: row => row.stock_quantity || row.stockQuantity || 0,
        id: 'stock_quantity',
      },
      {
        Header: 'Actions',
        id: 'actions',
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <button 
              className="px-2 py-1 text-xs font-medium rounded border border-blue-700 text-blue-700 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(row.original);
              }}
            >
              View
            </button>
            <button 
              className="px-2 py-1 text-xs font-medium rounded border border-purple-700 text-purple-700 hover:bg-purple-50"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(row.original);
              }}
            >
              Edit
            </button>
            <button 
              className="px-2 py-1 text-xs font-medium rounded border border-red-700 text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProduct(row.original.id);
              }}
            >
              Delete
            </button>
            <button 
              className="px-2 py-1 text-xs font-medium rounded border border-green-700 text-green-700 hover:bg-green-50 flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateBarcode(row.original);
              }}
            >
              <span className="mr-1">QR</span>
            </button>
          </div>
        ),
      },
    ],
    // Adding empty dependency array - these don't depend on props or state
    []
  );

  // Memoize products data to avoid recreating on each render
  const tableData = React.useMemo(() => {
    // Ensure products is always an array, even if it's null or undefined
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return products;
  }, [products]);

  // Table hooks need to be at component level, not inside render functions
  // But we need to handle the case when there are no products
  const tableInstance = useTable(
    { 
      columns, 
      data: tableData, 
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  // Get all the table props we need
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = tableInstance;

  // Render the products list using react-table and Tailwind
  const renderProductsList = () => {
    // Show loading state
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <CircularProgress className="mb-4" />
            <Typography variant="body1">Loading products...</Typography>
          </div>
        </div>
      );
    }
    
    // Show empty state with helpful message if no products
    if (!products || products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-gray-300 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
              />
            </svg>
            <Typography variant="h5" className="mb-2">No Products Yet</Typography>
            <Typography variant="body2" color="textSecondary" className="max-w-md">
              You haven't added any products to your inventory yet. Get started by clicking the "Create New Product" button above.
            </Typography>
          </div>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setActiveTab(0)}
          >
            Create Your First Product
          </Button>
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Products List
          </h2>
          <button 
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleCreateTab}
          >
            + Create New Product
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {(headerGroups || []).map(headerGroup => {
                  const { key, ...headerGroupProps } = headerGroup.getHeaderGroupProps();
                  return (
                    <tr key={key} {...headerGroupProps}>
                      {(headerGroup.headers || []).map(column => {
                        const { key, ...columnProps } = column.getHeaderProps(column.getSortByToggleProps());
                        return (
                          <th
                            key={key}
                            {...columnProps}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column.render('Header')}
                            <span>
                              {column.isSorted
                                ? column.isSortedDesc
                                  ? ' ▼'
                                  : ' ▲'
                                : ''}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  );
                })}
              </thead>
              <tbody
                {...getTableBodyProps()}
                className="bg-white divide-y divide-gray-200"
              >
                {(page || []).map((row, i) => {
                  prepareRow(row);
                  const { key, ...rowProps } = row.getRowProps();
                  return (
                    <tr
                      key={key}
                      {...rowProps}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(row.original);
                      }}
                    >
                      {(row.cells || []).map(cell => {
                        const { key, ...cellProps } = cell.getCellProps();
                        return (
                          <td
                            key={key}
                            {...cellProps}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {cell.render('Cell')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => {
                  previousPage();
                }}
                disabled={!canPreviousPage}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  !canPreviousPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => {
                  nextPage();
                }}
                disabled={!canNextPage}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  !canNextPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pageIndex * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min((pageIndex + 1) * pageSize, tableData.length)}
                  </span>{' '}
                  of <span className="font-medium">{tableData.length}</span> products
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => {
                      gotoPage(0);
                    }}
                    disabled={!canPreviousPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      !canPreviousPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">First</span>
                    {'<<'}
                  </button>
                  <button
                    onClick={() => {
                      previousPage();
                    }}
                    disabled={!canPreviousPage}
                    className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      !canPreviousPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    {'<'}
                  </button>
                  <button
                    onClick={() => {
                      nextPage();
                    }}
                    disabled={!canNextPage}
                    className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      !canNextPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    {'>'}
                  </button>
                  <button
                    onClick={() => {
                      gotoPage(pageCount - 1);
                    }}
                    disabled={!canNextPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      !canNextPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Last</span>
                    {'>>'}
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Simple QR Code component that doesn't require external dependencies
  const SimpleQRCode = ({ value, size = 200, foreground = '#000', background = '#fff' }) => {
    const [qrCodeSvg, setQrCodeSvg] = useState('');
    
    useEffect(() => {
      if (!value) return;
      
      const generateQRCode = async () => {
        try {
          // Generate QR code on the fly using a data URL
          const encodedValue = encodeURIComponent(value);
          const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}`;
          
          setQrCodeSvg(qrCodeURL);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      };
      
      generateQRCode();
    }, [value, size, foreground, background]);
    
    return (
      <div className="simple-qr-code" style={{ width: size, height: size, margin: '0 auto' }}>
        {qrCodeSvg ? (
          <img 
            src={qrCodeSvg} 
            alt="QR Code" 
            style={{ width: '100%', height: '100%' }}
            onError={(e) => {
              console.error('Error loading QR code image');
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%', 
            height: '100%', 
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            Loading QR Code...
          </div>
        )}
      </div>
    );
  };

  // Barcode Dialog with Headless UI
  const renderBarcodeDialog = () => {
    return (
      <Transition.Root show={isBarcodeDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setBarcodeDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto pt-16"> {/* Added pt-16 to push content below the appbar */}
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  {/* Header */}
                  <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
                    <div className="flex items-center">
                      <QrCodeIcon />
                      <Dialog.Title as="h3" className="ml-2 text-base font-semibold leading-6 text-gray-900">
                        Product QR Code
                      </Dialog.Title>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-4 py-5 sm:px-6">
                    {currentBarcodeProduct && (
                      <div className="print-container">
                        <div className="text-center">
                          <h3 className="text-lg font-bold mb-1">
                            {currentBarcodeProduct.name}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            Code: {currentBarcodeProduct.product_code || currentBarcodeProduct.id}
                          </p>
                          
                          {currentBarcodeProduct.description && (
                            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                              {currentBarcodeProduct.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex justify-center my-6">
                          <div className="qr-code-container p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                            <SimpleQRCode 
                              value={currentBarcodeProduct.id.toString()}
                              size={250}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 print-details">
                          <div>
                            <p className="text-xs text-gray-500">Price</p>
                            <p className="font-medium">${currentBarcodeProduct.price}</p>
                          </div>
                          {currentBarcodeProduct.stock_quantity !== undefined && (
                            <div>
                              <p className="text-xs text-gray-500">Stock</p>
                              <p className="font-medium">{currentBarcodeProduct.stock_quantity}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="print-instructions mt-6 border-t border-gray-200 pt-4">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Scan Instructions:</span> Scan this code with any QR reader to quickly access product information for inventory management.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                      onClick={handlePrintQRCode}
                    >
                      <span role="img" aria-label="print" className="mr-1">🖨️</span>
                      Print QR Code
                    </button>
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={() => {
                        setBarcodeDialogOpen(false);
                      }}
                    >
                      Close
                    </button>
                    <p className="text-xs text-gray-500 mr-auto hidden-print mt-2 sm:mt-0 sm:flex sm:items-center">
                      Click Print to save or print this QR code
                    </p>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    );
  };

  // Handle the QR code printing
  const handlePrintQRCode = useCallback(() => {
    try {
      // Add printing class to body to apply print styles
      document.body.classList.add('printing-qr-code');
      
      // Delay printing slightly to ensure styles are applied
      setTimeout(() => {
        window.print();
        
        // Remove the class after printing
        setTimeout(() => {
          document.body.classList.remove('printing-qr-code');
        }, 500);
      }, 100);
    } catch (error) {
      console.error('Error printing QR code:', error);
      notifyError('Failed to print QR code. Please try again.');
    }
  }, [notifyError]);

  const renderProductListTab = () => {
    return (
      <div className="mt-4">
        {apiHealthStatus?.status === 'error' && <DatabaseErrorFallback />}
        
        {products.length === 0 && !isLoading && apiHealthStatus?.status !== 'error' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">No products found</h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>No products have been added yet. Click the "Create New Product" button to add one.</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={handleCreateTab}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="overflow-hidden mt-1 ring-1 ring-black ring-opacity-5 md:rounded-lg">
          {renderProductsList()}
        </div>
      </div>
    );
  };

  // Ensure we're rendering the barcode dialog and success dialog correctly
  return (
    <div className="w-full pt-6">
      <div className="bg-white rounded-lg shadow-sm w-full overflow-hidden">
        <div className="border-b">
          <nav className="flex justify-between">
            <button
              type="button"
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={handleCreateTab}
            >
              {isEditing ? "Edit Product" : "Create Product"}
            </button>
            <button
              type="button"
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                !selectedProduct
                  ? 'text-gray-400 border-transparent cursor-not-allowed'
                  : activeTab === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={handleDetailsTab}
              disabled={!selectedProduct}
            >
              Product Details
            </button>
            <button
              type="button"
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={handleListTab}
            >
              Products List
            </button>
          </nav>
        </div>
      </div>
      
      <div className="mt-6">
        {/* Always render all components but hide the ones we don't need */}
        <div className={activeTab === 0 ? 'block' : 'hidden'}>
          {renderCreateForm()}
        </div>
        <div className={activeTab === 1 ? 'block' : 'hidden'}>
          {renderProductDetails()}
        </div>
        <div className={activeTab === 2 ? 'block' : 'hidden'}>
          {renderProductListTab()}
        </div>
      </div>
      
      {/* Always render these components to ensure hook call consistency */}
      <SuccessDialog />
      {renderBarcodeDialog()}
    </div>
  );
};

ProductManagement.propTypes = {
  isNewProduct: PropTypes.bool,
  mode: PropTypes.string,
  product: PropTypes.object,
  onUpdate: PropTypes.func,
  onCancel: PropTypes.func,
  salesContext: PropTypes.bool
};

export default ProductManagement;