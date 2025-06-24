'use client';


import React, { useState, useEffect, Fragment, useRef, useCallback, useReducer, useMemo, memo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import ProductQRCode from '@/components/ProductQRCode';
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
  const router = useRouter();
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
  
  // Determine if we're creating a new product based on props
  const isCreatingNewProduct = isNewProduct || mode === "create" || false;
  // Set initial tab based on whether we're creating a product
  const initialTab = isCreatingNewProduct ? 0 : 2;
  
  // State for managing component behavior
  const [activeTab, setActiveTab] = useState(initialTab);
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
  const [isQRDialogOpen, setQRDialogOpen] = useState(false);
  const [currentQRProduct, setCurrentQRProduct] = useState(null);
  const [apiHealthStatus, setApiHealthStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [dbInitializing, setDbInitializing] = useState(false);
  const [isCreating, setIsCreating] = useState(isCreatingNewProduct);
  const [createError, setCreateError] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [displayMessage, setDisplayMessage] = useState('');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    cost: '',
    stockQuantity: '',
    reorderLevel: '',
    forSale: true,
    forRent: false,
    search: '',
    supplier_id: '',  // Add supplier_id field
    location_id: ''   // Add location_id field
  });

  // Initialize tenantId from session
  const [tenantId, setTenantId] = useState(null);
  
  // Get tenant ID on mount and check for pending product data
  useEffect(() => {
    const fetchTenantId = async () => {
      const secureTenantId = await getSecureTenantId();
      if (secureTenantId) {
        setTenantId(secureTenantId);
      }
    };
    fetchTenantId();
    
    // Check if there's pending product data from before navigation
    const pendingData = localStorage.getItem('pendingProductData');
    if (pendingData) {
      try {
        const parsedData = JSON.parse(pendingData);
        setProductData(parsedData);
        // Clear the stored data
        localStorage.removeItem('pendingProductData');
        // Show a message to the user
        toast.loading('Restored your product form data', { duration: 3000 });
      } catch (error) {
        console.error('Error restoring pending product data:', error);
      }
    }
  }, []);
  
  // State for form fields - use a single object for better state preservation during hot reloading
  const [formState, setFormState] = useState(() => ({
    name: '',
    description: '',
    price: '',
    forSale: true,
    forRent: false,
    stockQuantity: '',
    reorderLevel: '',
    supplier_id: '',  // Add supplier_id field
    location_id: ''   // Add location_id field
  }));
  
  // For edited product state - also use a single object
  const [editFormState, setEditFormState] = useState(() => ({
    name: '',
    description: '',
    price: '',
    forSale: true,
    forRent: false,
    stockQuantity: '',
    reorderLevel: '',
    supplier_id: '',  // Add supplier_id field
    location_id: ''   // Add location_id field
  }));

  // State for supplier dropdown
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierError, setSupplierError] = useState(null);

  // State for location dropdown
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Fetch suppliers for dropdown
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoadingSuppliers(true);
      setSupplierError(null);
      
      // Get the tenant ID securely from Auth0 session
      const tenantIdValue = await getSecureTenantId();
      
      // Check if we have a valid tenant ID
      if (!tenantIdValue) {
        throw new Error('Authentication required. Valid tenant ID is required.');
      }
      
      // Make API call to get suppliers using the proxy route
      const response = await fetch('/api/inventory/suppliers', {
        headers: {
          'x-tenant-id': tenantIdValue
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suppliers: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle Django pagination if present
      let supplierList = [];
      if (Array.isArray(data)) {
        supplierList = data;
      } else if (data && Array.isArray(data.results)) {
        supplierList = data.results;
      } else if (data && Array.isArray(data.data)) {
        supplierList = data.data;
      }
      
      setSuppliers(supplierList);
    } catch (error) {
      console.error('[ProductManagement] Error fetching suppliers:', error);
      setSupplierError(error.message || 'Failed to load suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  // Fetch locations for dropdown
  const fetchLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      setLocationError(null);
      
      // Get the tenant ID securely from Auth0 session
      const tenantIdValue = await getSecureTenantId();
      
      // Check if we have a valid tenant ID
      if (!tenantIdValue) {
        throw new Error('Authentication required. Valid tenant ID is required.');
      }
      
      // Make API call to get locations using the proxy route
      const response = await fetch('/api/inventory/locations', {
        headers: {
          'x-tenant-id': tenantIdValue
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle Django pagination if present
      let locationList = [];
      if (Array.isArray(data)) {
        locationList = data;
      } else if (data && Array.isArray(data.results)) {
        locationList = data.results;
      }
      
      setLocations(locationList);
    } catch (error) {
      console.error('[ProductManagement] Error fetching locations:', error);
      setLocationError(error.message || 'Failed to fetch locations');
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  // Fetch suppliers and locations on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchLocations();
  }, [fetchSuppliers, fetchLocations]);

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
        // Check if component is still mounted before updating state
        if (!isMounted.current) return;
        
        setIsLoading(true);
        setFetchError(null);
        
        try {
          // Get tenant ID securely from Auth0 session only
          console.log('[ProductManagement] Fetching products with secure Auth0 tenant ID:', tenantId);
          
          if (!tenantId) {
            console.error('[ProductManagement] No secure tenant ID found in Auth0 session, cannot fetch products');
            // Check if component is still mounted before updating state
            if (!isMounted.current) return;
            
            setFetchError('Authentication error: Unable to verify your organization. Please log out and sign in again.');
            setIsLoading(false);
            return;
          }
          
          const response = await axios.get('/api/inventory/products', {
            params: { page },
            headers: { 'x-tenant-id': tenantId },
            signal: controller.signal
          });
          
          // Handle the response data structure
          let productsData = [];
          if (response.data) {
            if (Array.isArray(response.data)) {
              productsData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              productsData = response.data.data;
            } else if (response.data.results && Array.isArray(response.data.results)) {
              productsData = response.data.results;
            }
          }
          
          logger.info('[ProductManagement] Found products:', productsData.length || 0);
          
          // Check if component is still mounted before updating state
          if (!isMounted.current) return;
          
          setProducts(productsData);
          setFetchError(null);
        } catch (error) {
          // Only handle the error if it's not an abort error and component is mounted
          if (error.name !== 'AbortError' && isMounted.current) {
            console.error('[ProductManagement] Error fetching products:', error);
            setFetchError(error.message || 'Failed to load products');
          }
        } finally {
          // Only update loading state if component is still mounted
          if (isMounted.current) {
            setIsLoading(false);
          }
        }
      }, 300); // Debounce for 300ms
    } catch (error) {
      console.error('[ProductManagement] Error in fetchProducts:', error);
      // Only update state if component is still mounted
      if (isMounted.current) {
        setFetchError(error.message || 'An unexpected error occurred');
        setIsLoading(false);
      }
    }
  }, []);

  // Update useEffect cleanup to cancel pending requests
  useEffect(() => {
    // Only fetch products if we have a valid tenant ID
    if (tenantId) {
      fetchProducts();
    }
    
    return () => {
      // Clean up any pending requests or timeouts
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (fetchRequestRef.current) {
        fetchRequestRef.current.abort();
      }
    };
  }, [fetchProducts, tenantId]);

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
    if (mounted && tenantId) {
      // Load products on component mount 
      fetchProducts();
    }
  }, [mounted, fetchProducts, tenantId]);
  
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
    // Get tenant ID securely from Auth0 session only
    const secureTenantId = await getSecureTenantId();
    
    if (secureTenantId) {
      logger.info(`[ProductManagement] Using secure Auth0 tenant ID for RLS: ${secureTenantId}`);
      return secureTenantId;
    }
    
    logger.error('[ProductManagement] No secure tenant ID found in Auth0 session');
    return null;
  }, []);

  // Function to fetch supplier name based on supplier_id
  const fetchSupplierName = useCallback(async (supplierId) => {
    if (!supplierId) return '';
    
    try {
      // Get the tenant ID securely from Auth0 session
      const tenantIdValue = await getSecureTenantId();
      
      // Make API call to get supplier details using the proxy route
      const response = await fetch(`/api/inventory/suppliers/${supplierId}`, {
        headers: {
          'x-tenant-id': tenantIdValue
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch supplier: ${response.status}`);
      }
      
      const data = await response.json();
      return data?.name || 'Unknown Supplier';
    } catch (error) {
      console.error(`[ProductManagement] Error fetching supplier ${supplierId}:`, error);
      return 'Unknown Supplier';
    }
  }, []);
  
  // State to store supplier name for selected product
  const [supplierName, setSupplierName] = useState('');
  
  // State to store location name for selected product
  const [locationName, setLocationName] = useState('');
  
  // Function to fetch location name based on location_id
  const fetchLocationName = useCallback(async (locationId) => {
    if (!locationId) return '';
    
    try {
      // Get the tenant ID securely from Auth0 session
      const tenantIdValue = await getSecureTenantId();
      
      // Make API call to get location details using the proxy route
      const response = await fetch(`/api/inventory/locations/${locationId}`, {
        headers: {
          'x-tenant-id': tenantIdValue
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch location: ${response.status}`);
      }
      
      const data = await response.json();
      return data?.name || 'Unknown Location';
    } catch (error) {
      console.error(`[ProductManagement] Error fetching location ${locationId}:`, error);
      return 'Unknown Location';
    }
  }, []);
  
  // Fetch supplier name when selected product changes
  useEffect(() => {
    if (selectedProduct?.supplier_id) {
      fetchSupplierName(selectedProduct.supplier_id).then(name => {
        setSupplierName(name);
      });
    } else {
      setSupplierName('');
    }
  }, [selectedProduct, fetchSupplierName]);
  
  // Fetch location name when selected product changes
  useEffect(() => {
    if (selectedProduct?.location_id) {
      fetchLocationName(selectedProduct.location_id).then(name => {
        setLocationName(name);
      });
    } else {
      setLocationName('');
    }
  }, [selectedProduct, fetchLocationName]);

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
      reorderLevel: product.reorder_level || '',
      supplier_id: product.supplier_id || ''
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
  
  // Add this function after fetchProducts
  const handleGenerateBarcode = useCallback((product) => {
    if (!product || !product.id) {
      notifyError('Unable to generate QR code for this product');
      return;
    }
    
    // Set the product for which we're generating a QR code
    setCurrentQRProduct(product);
    
    // Open the QR dialog
    setQRDialogOpen(true);
  }, [notifyError]);

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
        reorderLevel: editedProduct.reorder_level || '',
        supplier_id: editedProduct.supplier_id || ''
      });
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
  }, [fetchProducts, selectedProduct]);

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

  // Update the handleCreateProduct function to fix the API error
  const handleCreateProduct = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      
      // Validate required fields
      if (!productData.name || !productData.price) {
        setCreateError('Please fill in required fields (Name, Price)');
        setIsCreating(false);
        return;
      }
      
      // Get secure tenant ID from Auth0 session
      const secureTenantId = await getSecureTenantId();
      
      // Validate tenant ID
      if (!secureTenantId) {
        setCreateError('Authentication required. Valid tenant ID is required for product creation.');
        setIsCreating(false);
        return;
      }
      
      // Prepare product data for API
      const apiData = {
        name: productData.name,
        description: productData.description || '',
        sku: productData.sku || '',
        price: parseFloat(productData.price) || 0,
        cost: parseFloat(productData.cost) || 0,
        stock_quantity: parseInt(productData.stockQuantity) || 0,
        reorder_level: parseInt(productData.reorderLevel) || 0,
        for_sale: productData.forSale,
        for_rent: productData.forRent,
        supplier_id: productData.supplier_id || null,  // Add supplier_id to the API data
        location_id: productData.location_id || null,  // Add location_id to the API data
        tenant_id: secureTenantId  // Use secure tenant ID explicitly
      };
      
      console.log('Creating product with data:', apiData);
      
      // Send the API request
      const response = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': secureTenantId
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      
      // Add the new product to the state
      setProducts(prevProducts => [...prevProducts, responseData.product || responseData]);
      
      // Reset form and show success message
      setProductData({
        name: '',
        description: '',
        sku: '',
        price: '',
        cost: '',
        stockQuantity: '',
        reorderLevel: '',
        forSale: true,
        forRent: false,
        search: '',
        supplier_id: '',  // Add supplier_id field
        location_id: ''   // Add location_id field
      });
      
      setShowForm(false);
      setDisplayMessage('Product created successfully!');
      setSuccessMessage('Product created successfully!');
      
      // Show success notification
      notifySuccess('Product created successfully!');
      
      // Refresh products list
      fetchProducts();
      
    } catch (error) {
      console.error('[ProductManagement] Error creating product:', error);
      setCreateError(error.message || 'Failed to create product');
      setErrorMessage(error.message || 'Failed to create product');
      notifyError(`Failed to create product: ${error.message || 'Unknown error'}`);
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
      <div>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-black">Create New Product</h2>
          {isCreating && (
            <button 
              onClick={() => {
                setIsCreating(false);
                setShowForm(false);
                setSelectedProduct(null);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              &larr; Back to Products List
            </button>
          )}
        </div>
        
        {createError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{createError}</span>
          </div>
        )}
        
        <form onSubmit={(e) => {
          e.preventDefault();
          handleCreateProduct();
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black mb-1">
                Product Name *
              </label>
              <input
                id="name"
              name="name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.name || ''}
                onChange={(e) => setProductData({...productData, name: e.target.value})}
              required
            />
          </div>
          
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-black mb-1">
                SKU / Product Code
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                placeholder="Auto-generated if left blank"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.sku || ''}
                onChange={(e) => setProductData({...productData, sku: e.target.value})}
            />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to auto-generate (e.g., PROD-2025-0001)
              </p>
          </div>
          
          <div>
              <label htmlFor="price" className="block text-sm font-medium text-black mb-1">
                Price *
              </label>
              <input
                id="price"
              name="price"
              type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.price || ''}
                onChange={(e) => setProductData({...productData, price: e.target.value})}
                required
            />
          </div>
          
          <div>
              <label htmlFor="cost" className="block text-sm font-medium text-black mb-1">
                Cost
              </label>
              <input
                id="cost"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.cost || ''}
                onChange={(e) => setProductData({...productData, cost: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="stockQuantity" className="block text-sm font-medium text-black mb-1">
                Stock Quantity
              </label>
              <input
                id="stockQuantity"
              name="stockQuantity"
              type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.stockQuantity || ''}
                onChange={(e) => setProductData({...productData, stockQuantity: e.target.value})}
            />
          </div>
          
          <div>
              <label htmlFor="reorderLevel" className="block text-sm font-medium text-black mb-1">
                Reorder Level
              </label>
              <input
                id="reorderLevel"
              name="reorderLevel"
              type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.reorderLevel || ''}
                onChange={(e) => setProductData({...productData, reorderLevel: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="supplier_id" className="block text-sm font-medium text-black mb-1">
                Supplier
              </label>
              <select
                id="supplier_id"
                name="supplier_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.supplier_id || ''}
                onChange={(e) => setProductData({...productData, supplier_id: e.target.value})}
              >
                <option value="">Select a supplier</option>
                {loadingSuppliers ? (
                  <option disabled>Loading suppliers...</option>
                ) : suppliers.length > 0 ? (
                  suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))
                ) : (
                  <option disabled>{supplierError || 'No suppliers available'}</option>
                )}
              </select>
              {!loadingSuppliers && suppliers.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    No suppliers found. 
                    <button
                      onClick={() => {
                        // Navigate to suppliers management
                        if (tenantId) {
                          // Save current form data to localStorage to restore later
                          localStorage.setItem('pendingProductData', JSON.stringify(productData));
                          // Navigate to suppliers page
                          window.location.href = `/${tenantId}/dashboard?view=inventory-suppliers`;
                        }
                      }}
                      className="ml-1 text-yellow-900 underline hover:text-yellow-700 font-medium"
                    >
                      Create a supplier
                    </button>
                    first to assign products to them.
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="location_id" className="block text-sm font-medium text-black mb-1">
                Location
              </label>
              <select
                id="location_id"
                name="location_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={productData.location_id || ''}
                onChange={(e) => setProductData({...productData, location_id: e.target.value})}
              >
                <option value="">Select a location</option>
                {loadingLocations ? (
                  <option disabled>Loading locations...</option>
                ) : locations.length > 0 ? (
                  locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))
                ) : (
                  <option disabled>{locationError || 'No locations available'}</option>
                )}
              </select>
              {!loadingLocations && locations.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    No locations/warehouses found. 
                    <button
                      onClick={() => {
                        // Navigate to locations management
                        if (tenantId) {
                          // Save current form data to localStorage to restore later
                          localStorage.setItem('pendingProductData', JSON.stringify(productData));
                          // Navigate to locations page
                          window.location.href = `/${tenantId}/dashboard?view=inventory-locations`;
                        }
                      }}
                      className="ml-1 text-yellow-900 underline hover:text-yellow-700 font-medium"
                    >
                      Create a location
                    </button>
                    first to track where products are stored.
                  </p>
                </div>
              )}
            </div>
            
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-black mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={productData.description || ''}
              onChange={(e) => setProductData({...productData, description: e.target.value})}
            ></textarea>
          </div>
          
          <div className="mb-4 flex items-center">
            <input
              id="forSale"
                    name="forSale"
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={productData.forSale}
              onChange={(e) => setProductData({...productData, forSale: e.target.checked})}
            />
            <label htmlFor="forSale" className="ml-2 text-sm text-black">
              Available for Sale
            </label>
          </div>
          
          <div className="mb-6 flex items-center">
            <input
              id="forRent"
                    name="forRent"
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={productData.forRent}
              onChange={(e) => setProductData({...productData, forRent: e.target.checked})}
            />
            <label htmlFor="forRent" className="ml-2 text-sm text-black">
              Available for Rent
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setShowForm(false);
                setSelectedProduct(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                  Creating...
        </div>
              ) : (
                'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Render the product details view
  const renderProductDetails = () => {
    if (!selectedProduct) {
      return (
        <div className="flex justify-center items-center h-48">
          <p className="text-gray-600">Please select a product to view details</p>
        </div>
      );
    }
    
    // Get supplier and location names
    const supplierName = selectedProduct.supplier_id 
      ? suppliers.find(s => s.id === selectedProduct.supplier_id)?.name 
      : null;
    const locationName = selectedProduct.location_id 
      ? locations.find(l => l.id === selectedProduct.location_id)?.name 
      : null;
    
    return (
          <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-black mb-2">Product Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-gray-500">Product Name:</div>
              <div className="text-sm text-black">{selectedProduct.name}</div>
              
              <div className="text-sm text-gray-500">SKU:</div>
              <div className="text-sm text-black">{selectedProduct.sku || 'N/A'}</div>
              
              <div className="text-sm text-gray-500">Description:</div>
              <div className="text-sm text-black">{selectedProduct.description || 'N/A'}</div>
              
              <div className="text-sm text-gray-500">Supplier:</div>
              <div className="text-sm text-black">{supplierName || 'None assigned'}</div>
              
              <div className="text-sm text-gray-500">Location:</div>
              <div className="text-sm text-black">{locationName || 'None assigned'}</div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-black mb-2">Inventory Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-gray-500">Price:</div>
              <div className="text-sm text-black">${parseFloat(selectedProduct.price || 0).toFixed(2)}</div>
              
              <div className="text-sm text-gray-500">Cost:</div>
              <div className="text-sm text-black">${parseFloat(selectedProduct.cost || 0).toFixed(2)}</div>
              
              <div className="text-sm text-gray-500">Stock Quantity:</div>
              <div className="text-sm text-black">{selectedProduct.stock_quantity || 0}</div>
              
              <div className="text-sm text-gray-500">Reorder Level:</div>
              <div className="text-sm text-black">{selectedProduct.reorder_level || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-black mb-2">Product Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${selectedProduct.stock_quantity > 0 ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
              <span className="text-sm text-black">{selectedProduct.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
          </div>
            
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${selectedProduct.for_sale ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
              <span className="text-sm text-black">{selectedProduct.for_sale ? 'Available for Sale' : 'Not for Sale'}</span>
          </div>
          
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full ${selectedProduct.for_rent ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
              <span className="text-sm text-black">{selectedProduct.for_rent ? 'Available for Rent' : 'Not for Rent'}</span>
          </div>
          </div>
        </div>
        
        {selectedProduct.barcode && (
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-black mb-2">Barcode</h3>
            <button
            onClick={() => {
                setCurrentBarcodeProduct(selectedProduct);
                setBarcodeDialogOpen(true);
              }}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              View Barcode
            </button>
        </div>
        )}
      </div>
    );
  };
  
  // Render the product edit form
  const renderEditForm = () => {
    if (!selectedProduct || !editedProduct) return null;
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSaveEdit();
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-black mb-1">
              Product Name *
            </label>
            <input
              id="edit-name"
              name="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.name || ''}
              onChange={(e) => setEditedProduct({...editedProduct, name: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label htmlFor="edit-sku" className="block text-sm font-medium text-black mb-1">
              SKU / Product Code
            </label>
            <input
              id="edit-sku"
              name="sku"
              type="text"
              placeholder="Auto-generated if left blank"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.sku || ''}
              onChange={(e) => setEditedProduct({...editedProduct, sku: e.target.value})}
            />
            <p className="mt-1 text-xs text-gray-500">
              Current: {editedProduct.sku || editedProduct.product_code || 'Auto-generated'}
            </p>
          </div>
          
          <div>
            <label htmlFor="edit-price" className="block text-sm font-medium text-black mb-1">
              Price *
            </label>
            <input
              id="edit-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.price || ''}
              onChange={(e) => setEditedProduct({...editedProduct, price: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label htmlFor="edit-cost" className="block text-sm font-medium text-black mb-1">
              Cost
            </label>
            <input
              id="edit-cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.cost || ''}
              onChange={(e) => setEditedProduct({...editedProduct, cost: e.target.value})}
            />
          </div>
          
          <div>
            <label htmlFor="edit-stockQuantity" className="block text-sm font-medium text-black mb-1">
              Stock Quantity
            </label>
            <input
              id="edit-stockQuantity"
              name="stockQuantity"
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.stockQuantity || editedProduct.stock_quantity || ''}
              onChange={(e) => setEditedProduct({...editedProduct, stockQuantity: e.target.value})}
            />
          </div>
          
          <div>
            <label htmlFor="edit-reorderLevel" className="block text-sm font-medium text-black mb-1">
              Reorder Level
            </label>
            <input
              id="edit-reorderLevel"
              name="reorderLevel"
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.reorderLevel || editedProduct.reorder_level || ''}
              onChange={(e) => setEditedProduct({...editedProduct, reorderLevel: e.target.value})}
            />
          </div>

          <div>
            <label htmlFor="edit-supplier_id" className="block text-sm font-medium text-black mb-1">
              Supplier
            </label>
            <select
              id="edit-supplier_id"
              name="supplier_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.supplier_id || ''}
              onChange={(e) => setEditedProduct({...editedProduct, supplier_id: e.target.value})}
            >
              <option value="">Select a supplier</option>
              {loadingSuppliers ? (
                <option disabled>Loading suppliers...</option>
              ) : suppliers.length > 0 ? (
                suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))
              ) : (
                <option disabled>{supplierError || 'No suppliers available'}</option>
              )}
            </select>
            {!loadingSuppliers && suppliers.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  No suppliers found. 
                  <button
                    onClick={() => {
                      if (tenantId) {
                        window.location.href = `/${tenantId}/dashboard?view=inventory-suppliers`;
                      }
                    }}
                    className="ml-1 text-yellow-900 underline hover:text-yellow-700 font-medium"
                  >
                    Create a supplier
                  </button>
                  first.
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="edit-location_id" className="block text-sm font-medium text-black mb-1">
              Location
            </label>
            <select
              id="edit-location_id"
              name="location_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={editedProduct.location_id || ''}
              onChange={(e) => setEditedProduct({...editedProduct, location_id: e.target.value})}
            >
              <option value="">Select a location</option>
              {loadingLocations ? (
                <option disabled>Loading locations...</option>
              ) : locations.length > 0 ? (
                locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))
              ) : (
                <option disabled>{locationError || 'No locations available'}</option>
              )}
            </select>
            {!loadingLocations && locations.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  No locations/warehouses found. 
                  <button
                    onClick={() => {
                      if (tenantId) {
                        window.location.href = `/${tenantId}/dashboard?view=inventory-locations`;
                      }
                    }}
                    className="ml-1 text-yellow-900 underline hover:text-yellow-700 font-medium"
                  >
                    Create a location
                  </button>
                  first.
                </p>
              </div>
            )}
          </div>

        </div>
        
        <div className="mb-4">
          <label htmlFor="edit-description" className="block text-sm font-medium text-black mb-1">
            Description
          </label>
          <textarea
            id="edit-description"
            name="description"
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={editedProduct.description || ''}
            onChange={(e) => setEditedProduct({...editedProduct, description: e.target.value})}
          ></textarea>
        </div>
        
        <div className="mb-4 flex items-center">
          <input
            id="edit-forSale"
            name="for_sale"
            type="checkbox"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={editedProduct.for_sale}
            onChange={(e) => setEditedProduct({...editedProduct, for_sale: e.target.checked})}
          />
          <label htmlFor="edit-forSale" className="ml-2 text-sm text-black">
            Available for Sale
          </label>
        </div>
        
        <div className="mb-6 flex items-center">
          <input
            id="edit-forRent"
            name="for_rent"
            type="checkbox"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={editedProduct.for_rent}
            onChange={(e) => setEditedProduct({...editedProduct, for_rent: e.target.checked})}
          />
          <label htmlFor="edit-forRent" className="ml-2 text-sm text-black">
            Available for Rent
          </label>
        </div>
      </form>
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
              <QrCodeIcon />
              <span className="ml-1">QR</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Memoize products data to avoid recreating on each render
  const tableData = React.useMemo(() => {
    // Ensure products is always an array, even if it's null or undefined
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    // Apply search filter within the memoized function instead of in the render function
    // This prevents re-renders that could cause the infinite loop
    if (productData.search) {
      return products.filter(product => 
        (product.name || '').toLowerCase().includes(productData.search.toLowerCase()) ||
        (product.sku || '').toLowerCase().includes(productData.search.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(productData.search.toLowerCase())
      );
    }
    
    return products;
  }, [products, productData.search]);

  // Memoize table options to prevent recreation on each render
  const tableOptions = React.useMemo(() => ({
    columns, 
    data: tableData, 
    initialState: { pageIndex: 0, pageSize: 10 },
    autoResetPage: false,
    autoResetSortBy: false,
    autoResetFilters: false,
  }), [columns, tableData]);

  // Table hooks need to be at component level, not inside render functions
  const tableInstance = useTable(
    tableOptions,
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
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      );
    }
    
    // Show fetch error message if there is one
    if (fetchError) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-red-800 font-medium text-lg mb-2">Error Loading Products</h3>
            <p className="text-red-700 mb-4">{fetchError}</p>
            <button 
              onClick={() => fetchProducts()} 
              className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    
    // Show empty state with helpful message if no products
    if (!products || products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg p-6">
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10l-8 4" 
              />
            </svg>
            <h3 className="text-xl font-medium text-black mb-2">No Products Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't added any products to your inventory yet. Get started by clicking the "Add Product" button above.
            </p>
          </div>
          <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              setIsCreating(true);
              setSelectedProduct(null);
              setIsEditing(false);
              setShowForm(true);
              setShowCustomerDetails(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Product
          </button>
        </div>
      );
    }
    
    // If no products match the search criteria (use tableData directly which already has the filtering applied)
    if (tableData.length === 0 && productData.search) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg p-6">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
            <h3 className="text-xl font-medium text-black mb-2">No Matching Products</h3>
            <p className="text-gray-500 max-w-md">
              No products match your search criteria "{productData.search}". Try a different search term or clear the search.
            </p>
          </div>
          <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => setProductData(prev => ({...prev, search: ''}))}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Search
          </button>
        </div>
      );
    }
    
    // Render table with the memoized tableData
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">SKU</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Price</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Stock</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tableData.map((product) => (
            <tr key={product.id || `temp-${Math.random()}`} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">{product.name || 'Unnamed Product'}</div>
                <div className="text-xs text-gray-500">
                  {product.description ? 
                    (product.description.length > 40 ? 
                      `${product.description.substring(0, 40)}...` : 
                      product.description) : 
                    'No description'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{product.sku || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">${parseFloat(product.price || 0).toFixed(2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{product.stock_quantity || 0}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  product.stock_quantity > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowCustomerDetails(true);
                    setIsCreating(false);
                    setIsEditing(false);
                    setEditedProduct(null);
                  }}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowCustomerDetails(true);
                    setIsCreating(false);
                    setIsEditing(true);
                    setEditedProduct({...product});
                  }}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className="text-red-600 hover:text-red-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => handleGenerateBarcode(product)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        
        {(!Array.isArray(products) || products.length === 0) && !isLoading && apiHealthStatus?.status !== 'error' && (
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

  // Handle closing the product details view
  const handleCloseProductDetails = () => {
    setShowCustomerDetails(false);
    setSelectedProduct(null);
    setIsEditing(false);
    setEditedProduct(null);
  };

  // Add the missing renderProductDetailsView function
  const renderProductDetailsView = () => {
    if (!selectedProduct) {
  return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">No product selected</p>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">{selectedProduct.name}</h2>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
            <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
            </button>
            <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedProduct(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                >
                  Cancel
            </button>
              </>
            ) : (
              <>
            <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditedProduct({...selectedProduct});
                  }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Edit
            </button>
                <button
                  onClick={() => setShowCustomerDetails(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </button>
              </>
            )}
        </div>
      </div>
      
        {isEditing ? renderEditForm() : renderProductDetails()}
        </div>
    );
  };

  // Function to handle saving edits
  const handleSaveEdit = async () => {
    if (!editedProduct || !selectedProduct) return;
    
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const apiData = {
        id: editedProduct.id,
        name: editedProduct.name,
        description: editedProduct.description || '',
        sku: editedProduct.sku || '',
        price: parseFloat(editedProduct.price) || 0,
        cost: parseFloat(editedProduct.cost) || 0,
        stock_quantity: parseInt(editedProduct.stockQuantity || editedProduct.stock_quantity) || 0,
        reorder_level: parseInt(editedProduct.reorderLevel || editedProduct.reorder_level) || 0,
        for_sale: editedProduct.forSale || editedProduct.for_sale,
        for_rent: editedProduct.forRent || editedProduct.for_rent,
        supplier_id: editedProduct.supplier_id || null,
        location_id: editedProduct.location_id || null
      };

      console.log('Saving edited product:', apiData);

      const response = await fetch(`/api/inventory/products/${editedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update product. Status: ${response.status}`);
      }
      
      const updatedProduct = await response.json();
      
      // Update the products list
      setProducts(Array.isArray(products) ? products.map(p => 
        p.id === selectedProduct.id ? { ...p, ...updatedProduct } : p
      ) : [updatedProduct]);
      
      // Update the selected product
      setSelectedProduct({ ...selectedProduct, ...updatedProduct });
      
      // Show success notification
      notifySuccess(`Product "${updatedProduct.name}" updated successfully`);
      
      // Exit edit mode
      setIsEditing(false);
      setEditedProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      notifyError(`Failed to update product: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the main render function
  return (
    <div className="p-6 bg-gray-50">
      {/* Print styles for QR code printing */}
      <style jsx global>{`
        @media print {
          body.printing-qr-code * {
            visibility: hidden;
          }
          body.printing-qr-code .print-container,
          body.printing-qr-code .print-container * {
            visibility: visible;
          }
          body.printing-qr-code .hidden-print {
            display: none !important;
          }
          body.printing-qr-code .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      
      <h1 className="text-2xl font-bold text-black mb-4">
        Product Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Total Products
          </h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {Array.isArray(products) ? products.length : 0}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            In Stock
          </h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {Array.isArray(products) ? products.filter(p => p.stock_quantity > 0).length : 0}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Out of Stock
          </h2>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {Array.isArray(products) ? products.filter(p => !p.stock_quantity || p.stock_quantity <= 0).length : 0}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search Products"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={productData.search || ''}
            onChange={(e) => setProductData({...productData, search: e.target.value})}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              // Implement filter functionality
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              setIsCreating(true);
              setSelectedProduct(null);
              setIsEditing(false);
              setShowForm(true);
              setShowCustomerDetails(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Product
          </button>
        </div>
      </div>
      
      {showCustomerDetails && selectedProduct ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">{selectedProduct.name}</h2>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedProduct(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditedProduct({...selectedProduct});
                    }}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowCustomerDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Back to List
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? renderEditForm() : renderProductDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          {renderCreateForm()}
        </div>
      ) : (
        <>
          {/* Products Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              {renderProductsList()}
            </div>
          </div>
        </>
      )}
      
      {/* Success Dialog and Barcode Dialog - keep these unchanged */}
      <SuccessDialog />
      {renderBarcodeDialog()}
      
      {/* QR Code Dialog */}
      {isQRDialogOpen && currentQRProduct && (
        <ProductQRCode
          product={currentQRProduct}
          onClose={() => {
            setQRDialogOpen(false);
            setCurrentQRProduct(null);
          }}
        />
      )}
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

// Make sure component is properly exported with memo to prevent unnecessary re-renders
const MemoizedProductManagement = memo(ProductManagement);
export default MemoizedProductManagement;