'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCartIcon, 
  XMarkIcon, 
  PlusIcon, 
  MinusIcon,
  CameraIcon,
  TrashIcon,
  UserIcon,
  CreditCardIcon,
  PrinterIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

// Custom Barcode Icon as it might not exist in Heroicons
const BarcodeIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 7h8m0 0v10a1 1 0 01-1 1H9a1 1 0 01-1-1V7m8 0V5a1 1 0 00-1-1H9a1 1 0 00-1 1v2" />
  </svg>
);
import { logger } from '@/utils/logger';
import ReceiptDialog from './ReceiptDialog';

// Ensure logger exists
const safeLogger = logger || { info: console.log, error: console.error };

// QR Scanner library - import dynamically to avoid SSR issues
let QrScannerLib = null;
if (typeof window !== 'undefined') {
  import('qr-scanner').then(module => {
    QrScannerLib = module.default;
  }).catch(err => {
    console.error('[POSSystemInline] Failed to load QR scanner:', err);
  });
}

const QRScanner = ({ isActive, onScan, onError, t }) => {
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isActive]);

  const startCamera = async () => {
    setIsLoading(true);
    try {
      if (!videoRef.current) {
        setIsLoading(false);
        return;
      }

      // Initialize QR Scanner only if library is loaded
      if (!QrScannerLib) {
        console.error('[QRScanner] QR Scanner library not loaded yet');
        setIsLoading(false);
        onError && onError(new Error('QR Scanner library not loaded'));
        return;
      }

      qrScannerRef.current = new QrScannerLib(
        videoRef.current,
        (result) => {
          safeLogger.info('[QRScanner] QR Code detected:', result.data);
          onScan(result.data);
        },
        {
          preferredCamera: 'environment', // Use rear camera
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();
      setHasPermission(true);
      
    } catch (error) {
      console.error('Camera access denied:', error);
      onError(t('allowCameraAccess'));
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-gray-900 rounded-lg">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white">{t('loadingCamera')}</div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
      />
      
      {!hasPermission && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <CameraIcon className="w-12 h-12 mx-auto mb-2" />
            <p>{t('cameraPermissionRequired')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Main POS Component
export default function POSSystemInline({ onBack, onSaleCompleted }) {
  const { t } = useTranslation('pos');
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // percentage or amount
  const [taxRate, setTaxRate] = useState(0);
  const [defaultTaxRate, setDefaultTaxRate] = useState(0); // Business default tax rate
  const [taxJurisdiction, setTaxJurisdiction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [useShippingAddress, setUseShippingAddress] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    county: '',
    postcode: '',
    country: 'US'
  });
  
  // Location dropdown states
  const [countries, setCountries] = useState([]);
  const [shippingStates, setShippingStates] = useState([]);
  const [shippingCounties, setShippingCounties] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  // USB/Keyboard barcode scanner handler
  const scannerTimeoutRef = useRef(null);
  const scannerBufferRef = useRef('');

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Clear existing timeout
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }

      // Add character to buffer
      if (e.key === 'Enter') {
        // Process the barcode when Enter is pressed
        if (scannerBufferRef.current.trim()) {
          safeLogger.info('[POS] USB Scanner input detected:', scannerBufferRef.current);
          handleProductScan(scannerBufferRef.current.trim());
          scannerBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        // Only add printable characters
        scannerBufferRef.current += e.key;
      }

      // Set timeout to clear buffer if no input for 100ms
      scannerTimeoutRef.current = setTimeout(() => {
        scannerBufferRef.current = '';
      }, 100);
    };

    // Add event listener
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, []);

  // Load products and business info
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        // Fetch from backend
        const response = await fetch('/api/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('[POS] Response is not JSON:', contentType);
          const text = await response.text();
          console.error('[POS] Response text:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response. Please check your authentication.');
        }
        
        const data = await response.json();
        console.log('[POS] Products API response:', data);
        console.log('[POS] Response structure - has products:', !!data.products, 'has results:', !!data.results, 'is array:', Array.isArray(data));
        
        if (data.products) {
          // Map the product fields to match what POS expects
          const mappedProducts = data.products.map(product => {
            const mapped = {
              id: product.id,
              name: product.name || product.product_name,
              sku: product.sku || product.product_code || '',
              barcode: product.barcode || '',
              price: parseFloat(product.price || product.unit_price || 0),
              quantity_in_stock: product.stockQuantity || product.stock_quantity || 0,
              description: product.description || ''
            };
            console.log('[POS] Mapped product:', mapped);
            return mapped;
          });
          console.log('[POS] Total products loaded:', mappedProducts.length);
          setProducts(mappedProducts);
        } else if (data.results) {
          setProducts(data.results);
        } else if (Array.isArray(data)) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        safeLogger.error('[POS] Error fetching products:', error);
        setProductsError(error.message);
        
        // More specific error message based on error type
        if (error.message.includes('JSON')) {
          toast.error('Unable to load products. Please check your authentication.');
        } else {
          toast.error(
            t('failedToLoadProducts', 'Failed to load products. Please check your inventory.')
          );
        }
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [t]);

  // Load customers from backend
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Call the backend CRM customers endpoint directly
        const response = await fetch('/api/crm/customers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        console.log('[POS] Customer fetch response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[POS] Customer data received:', data);
          
          // The proxy endpoint returns an array directly
          if (Array.isArray(data)) {
            setCustomers(data);
            console.log('[POS] Set customers from array:', data.length);
            console.log('[POS] Customer names:', data.map(c => c.name || c.company_name));
          } else if (data.results) {
            setCustomers(data.results);
            console.log('[POS] Set customers from results:', data.results.length);
          } else if (data.customers) {
            setCustomers(data.customers);
            console.log('[POS] Set customers from customers field:', data.customers.length);
          } else {
            console.log('[POS] Unexpected customer data format:', data);
            setCustomers([]);
          }
        }
      } catch (error) {
        console.error('[POS] Error fetching customers:', error);
        // Don't show error toast for customers as it's optional
      }
    };
    
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/taxes/location/countries/', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCountries(data.countries || []);
        }
      } catch (error) {
        console.error('[POS] Error fetching countries:', error);
      }
    };

    fetchCustomers();
    fetchCountries();
  }, []);

  // Load business info and tax rate
  const [businessCountry, setBusinessCountry] = useState('');
  
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setBusinessInfo({
            name: data.business_name || data.businessName || 'Business Name',
            address: data.business_address || '',
            phone: data.business_phone || '',
            email: data.email || '',
            country: data.country || '',
            state: data.state || '',
            county: data.county || ''
          });
          // Store business location for tax calculations
          setBusinessCountry(data.country || '');
          console.log('[POS] Business location:', {
            country: data.country,
            state: data.state,
            county: data.county
          });
        }
      } catch (error) {
        console.error('[POS] Error fetching business info:', error);
      }
    };

    const fetchEstimatedTaxRate = async () => {
      console.log('[POS] 🔍 Fetching tax rate from tenant settings...');
      try {
        const response = await fetch('/api/taxes/tenant-settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const taxData = await response.json();
          console.log('[POS] 📊 Tax settings received:', taxData);
          
          // Check if user has tax settings (either custom or from global)
          if (taxData.settings && taxData.settings.sales_tax_rate !== undefined) {
            // Convert from decimal to percentage (0.0875 → 8.75)
            const taxRatePercentage = parseFloat(taxData.settings.sales_tax_rate) * 100;
            setTaxRate(taxRatePercentage);
            setDefaultTaxRate(taxRatePercentage); // Save as default for when no customer is selected
            
            // Show notification based on source
            const source = taxData.source === 'tenant' ? 'your custom settings' : 'default rates';
            const location = taxData.settings.country_name || taxData.settings.country || '';
            const region = taxData.settings.region_name || taxData.settings.region_code || '';
            const fullLocation = region ? `${location}, ${region}` : location;
            
            toast.success(
              `Default tax rate set to ${taxRatePercentage.toFixed(2)}% from ${source}` + 
              (fullLocation ? ` (${fullLocation})` : ''),
              { duration: 4000 }
            );
            
            console.log(`[POS] ✅ Default tax rate set to ${taxRatePercentage}% from ${taxData.source}`);
          } else {
            console.log('[POS] ⚠️ No tax settings found, defaulting to 0%');
            setTaxRate(0);
            toast.warning(
              'No tax rate configured. Please set it in Settings → Taxes.',
              { duration: 5000 }
            );
          }
        } else {
          console.error('[POS] ❌ Failed to fetch tax settings:', response.status);
          setTaxRate(0);
          toast.error(
            'Could not load tax settings. Please check your settings.',
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.error('[POS] ❌ Error fetching tax rate:', error);
        toast.error('Error loading tax rate. Please set it manually.');
      }
    };

    fetchBusinessInfo();
    fetchEstimatedTaxRate();
  }, []);

  // Update tax rate when customer is selected
  
  useEffect(() => {
    const fetchCustomerTaxRate = async () => {
      if (!selectedCustomer) {
        // No customer selected, revert to default business tax rate
        console.log('[POS] No customer selected, reverting to default tax rate:', defaultTaxRate);
        setTaxRate(defaultTaxRate);
        setTaxJurisdiction(null);
        return;
      }

      console.log('[POS] 🔍 Fetching tax rate for customer ID:', selectedCustomer);
      
      // Find the customer object
      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) {
        console.log('[POS] Customer not found in list');
        return;
      }
      
      // Calculate tax for this customer
      await calculateCustomerTax(customer);
    };

    if (businessCountry) {
      // Only fetch if we have the business country loaded
      fetchCustomerTaxRate();
    }
  }, [selectedCustomer, businessCountry, customers, defaultTaxRate]);

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prev, { ...product, quantity }];
      }
    });
  };

  // Handle product scanning (both USB and camera)
  const handleProductScan = useCallback((scannedCode) => {
    safeLogger.info('[POS] Product scanned:', scannedCode);
    console.log('[POS] Available products:', products);
    console.log('[POS] Products count:', products.length);
    
    // Try to parse as JSON first (for QR codes with full product data)
    let productData = null;
    let searchTerms = [];
    
    try {
      // Only try to parse as JSON if it looks like JSON
      if (scannedCode.trim().startsWith('{') || scannedCode.trim().startsWith('[')) {
        productData = JSON.parse(scannedCode);
        console.log('[POS] Parsed product data:', productData);
        
        // If we have full product data from scanner, add it directly to cart
        if (productData.id && productData.name && productData.price) {
          // Transform scanned product to match cart format
          const scannedProduct = {
            id: productData.id,
            name: productData.name,
            sku: productData.sku || '',
            barcode: productData.barcode || '',
            price: parseFloat(productData.price) || 0,
            quantity_in_stock: productData.quantity_in_stock || 0,
            description: productData.description || ''
          };
          
          console.log('[POS] Using scanned product directly:', scannedProduct);
          addToCart(scannedProduct);
          toast.success(`${scannedProduct.name} ${t('addedToCart')}`);
          
          // Keep scanner open for continuous scanning
          if (showScanner) {
            setTimeout(() => {
              // Ready for next scan
            }, 1000);
          }
          return;
        }
        
        // Extract search terms from JSON
        if (productData.id) searchTerms.push(productData.id);
        if (productData.sku) searchTerms.push(productData.sku);
        if (productData.name) searchTerms.push(productData.name);
        if (productData.barcode) searchTerms.push(productData.barcode);
      } else {
        // Not JSON, treat as simple barcode
        searchTerms.push(scannedCode.trim());
      }
    } catch (e) {
      // If JSON parsing fails, treat as simple barcode
      console.log('[POS] Not valid JSON, treating as simple barcode:', scannedCode);
      let cleanCode = scannedCode.trim().replace(/[{}"']/g, '');
      searchTerms.push(cleanCode, scannedCode.trim());
    }
    
    console.log('[POS] Search terms:', searchTerms);
    
    // Find product using all search terms
    let product = null;
    
    // First, try exact ID match if we have JSON data
    if (productData && productData.id) {
      product = products.find(p => String(p.id) === String(productData.id));
      console.log('[POS] ID match result:', product);
    }
    
    // If not found by ID, try other search terms
    if (!product && searchTerms.length > 0) {
      product = products.find(p => {
        // Check each search term against all product fields
        return searchTerms.some(term => {
          const matches = {
            idMatch: String(p.id || '') === String(term || ''),
            skuMatch: String(p.sku || '') === String(term || ''),
            barcodeMatch: String(p.barcode || '') === String(term || ''),
            nameMatch: String(p.name || '').toLowerCase() === String(term || '').toLowerCase(),
            nameContains: String(p.name || '').toLowerCase().includes(String(term || '').toLowerCase())
          };
          
          console.log(`[POS] Checking product ${p.name} against term ${term}:`, matches);
          
          return matches.idMatch || matches.skuMatch || matches.barcodeMatch || 
                 matches.nameMatch || (term.length > 2 && matches.nameContains);
        });
      });
    }
    
    if (product) {
      console.log('[POS] Found product in list:', product);
      addToCart(product);
      toast.success(`${product.name} ${t('addedToCart')}`);
      
      // If using the camera scanner, keep it open for continuous scanning
      if (showScanner) {
        // Just show a success message, don't close scanner
        setTimeout(() => {
          // Ready for next scan
        }, 1000);
      }
    } else {
      // If product not found in loaded list but we have scanned data with ID, try to fetch it
      if (productData && productData.id) {
        console.log('[POS] Product not in loaded list, attempting to fetch by ID:', productData.id);
        
        // Fetch specific product by ID
        fetch(`/api/products/${productData.id}`)
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Product not found');
          })
          .then(fetchedProduct => {
            console.log('[POS] Fetched product by ID:', fetchedProduct);
            // Add to products list for future reference
            setProducts(prev => [...prev, fetchedProduct]);
            // Add to cart
            addToCart(fetchedProduct);
            toast.success(`${fetchedProduct.name} ${t('addedToCart')}`);
          })
          .catch(error => {
            console.error('[POS] Failed to fetch product by ID:', error);
            toast.error(t('productNotFound'));
          });
      } else {
        toast.error(t('productNotFound'));
      }
    }
  }, [products, t, showScanner]);

  // Helper function to get customer display name
  const getCustomerDisplayName = (customerId) => {
    if (!customerId) return '';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return '';
    
    // Try multiple fields for customer name
    return customer.name || 
           customer.business_name || 
           customer.company_name || 
           `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
           customer.email ||
           '';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.customer-selection-container')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = discountType === 'percentage' 
      ? (subtotal * discount / 100)
      : discount;
    const discountedAmount = subtotal - discountAmount;
    const taxAmount = discountedAmount * taxRate / 100;
    const total = discountedAmount + taxAmount;
    
    console.log('[POS] 💰 Calculating totals:', {
      subtotal,
      discountAmount,
      discountedAmount,
      taxRate: taxRate + '%',
      taxAmount,
      total
    });

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Process sale
  const handleProcessSale = async () => {
    if (cartItems.length === 0) {
      toast.error(t('emptyCart'));
      return;
    }

    setIsProcessing(true);
    try {
      const totals = calculateTotals();
      
      console.log('[POS] Cart items before mapping:', cartItems);
      
      // Map cart items to backend format
      const mappedItems = cartItems.map(item => ({
        id: item.id,
        type: 'product', // Currently only supporting products
        quantity: item.quantity || 1,
        unit_price: parseFloat(item.price || 0)
      }));

      // Debug logging for tax calculation
      console.log('[POS] 🧮 Processing sale with tax info:', {
        customer_id: selectedCustomer,
        taxRate: taxRate,
        businessCountry: businessCountry,
        customer: selectedCustomer ? customers.find(c => c.id === selectedCustomer) : 'Walk-in',
        totals: totals
      });

      const saleData = {
        items: mappedItems,
        customer_id: selectedCustomer || null,
        discount_percentage: discountType === 'percentage' ? discount : 0,
        payment_method: paymentMethod,
        use_shipping_address: useShippingAddress,
        notes,
        tax_rate: taxRate, // Include tax rate in sale data
        tax_amount: totals.taxAmount
      };

      // Add shipping address if using it
      if (useShippingAddress && selectedCustomer) {
        saleData.shipping_address = shippingAddress;
      }

      console.log('[POS] Submitting sale data:', JSON.stringify(saleData, null, 2));
      
      // Call actual backend API
      const response = await fetch('/api/pos/complete-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(saleData),
      });

      console.log('[POS] Complete sale response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[POS] Complete sale error:', errorData);
        throw new Error(`Sale failed: ${errorData}`);
      }

      const result = await response.json();
      console.log('[POS] Sale completed successfully:', result);

      // Store tax jurisdiction info if provided
      if (result.transaction && result.transaction.tax_jurisdiction) {
        setTaxJurisdiction({
          tax_calculation_method: result.transaction.tax_calculation_method,
          tax_jurisdiction: result.transaction.tax_jurisdiction
        });
      }

      // Prepare sale data for receipt
      const enhancedSaleData = {
        ...saleData,
        ...result,
        invoice_number: result.invoice_number || result.transaction?.transaction_number || result.id,
        customer: selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null,
        tax_jurisdiction: result.transaction?.tax_jurisdiction,
        tax_calculation_method: result.transaction?.tax_calculation_method
      };

      console.log('[POS] Enhanced sale data for receipt:', enhancedSaleData);
      console.log('[POS] Setting showReceiptDialog to true...');
      
      // Show receipt dialog instead of just closing
      setCompletedSaleData(enhancedSaleData);
      setShowReceiptDialog(true);
      
      console.log('[POS] Receipt dialog should now be visible');

      // Show success details
      if (result.inventory_updated) {
        toast.success(t('inventoryUpdated'));
      }
      if (result.accounting_entries_created) {
        toast.success(t('accountingEntriesCreated'));
      }
      
      // Notify parent
      if (onSaleCompleted) {
        onSaleCompleted(result);
      }
      
      // Reset form
      resetCart();
      
    } catch (error) {
      safeLogger.error('[POS] Error processing sale:', error);
      toast.error(`${t('error')}: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate tax based on customer location
  const calculateCustomerTax = async (customer) => {
    console.log('[POS] 🧮 === START TAX CALCULATION ===');
    console.log('[POS] Customer data:', {
      id: customer.id,
      name: customer.first_name + ' ' + customer.last_name,
      billing_country: customer.billing_country,
      billing_state: customer.billing_state,
      billing_county: customer.billing_county,
      shipping_country: customer.shipping_country,
      shipping_state: customer.shipping_state,
      shipping_county: customer.shipping_county
    });
    
    // If customer has no location info, use business default
    if (!customer.billing_country && !customer.shipping_country) {
      console.log('[POS] ⚠️ Customer has no location, using business default tax rate:', defaultTaxRate);
      setTaxRate(defaultTaxRate || 0);
      return;
    }
    
    // Use billing address first, fall back to shipping address
    const country = customer.billing_country || customer.shipping_country || '';
    const state = customer.billing_state || customer.shipping_state || '';
    const county = customer.billing_county || customer.shipping_county || '';
    
    console.log('[POS] 📍 Using location for tax calculation:', { country, state, county });
    
    // If it's an international sale (customer country != business country)
    if (businessCountry && country && country !== businessCountry) {
      console.log('[POS] 🌍 International sale detected! Business:', businessCountry, 'Customer:', country);
      setTaxRate(0);
      toast.success(`International sale - 0% tax applied`);
      return;
    }
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (country) params.append('country', country);
      if (state) params.append('state', state);
      if (county) params.append('county', county);
      
      console.log('[POS] 🔄 Fetching tax rate from API');
      console.log('[POS] API URL:', `/api/taxes/calculate?${params.toString()}`);
      
      // Call the tax calculation API
      const response = await fetch(`/api/taxes/calculate?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('[POS] API Response status:', response.status);
      
      if (response.ok) {
        const taxData = await response.json();
        console.log('[POS] ✅ Tax calculation successful:', taxData);
        
        const taxRatePercentage = parseFloat(taxData.tax_rate || 0) * 100;
        setTaxRate(taxRatePercentage);
        
        // Show location in toast
        const location = taxData.county_name || taxData.state_name || taxData.country_name || 'Unknown';
        toast.success(`Tax rate: ${taxRatePercentage.toFixed(2)}% for ${location}`);
        
        console.log('[POS] ✅ Tax rate set to', taxRatePercentage, '% for customer in', location);
      } else {
        console.error('[POS] Failed to calculate tax, response status:', response.status);
        console.error('[POS] ❌ Using default tax rate:', defaultTaxRate);
        
        // Try to get error details
        try {
          const errorText = await response.text();
          console.error('[POS] Error response text:', errorText);
        } catch (e) {
          console.error('[POS] Could not read error response');
        }
        
        setTaxRate(defaultTaxRate || 0);
        
        // Still show a message so user knows what's happening
        toast.warning(`Using default tax rate: ${(defaultTaxRate || 0).toFixed(2)}%`);
      }
    } catch (error) {
      console.error('[POS] ❌ Exception calculating customer tax:', error);
      console.error('[POS] Error stack:', error.stack);
      setTaxRate(defaultTaxRate || 0);
      toast.error('Could not calculate tax rate');
    }
    
    console.log('[POS] === END TAX CALCULATION ===');
  };

  // Reset cart
  const resetCart = () => {
    setCartItems([]);
    setSelectedCustomer('');
    setDiscount(0);
    setTaxRate(0);
    setNotes('');
    setProductSearchTerm('');
  };

  const totals = calculateTotals();

  // Handle receipt dialog close
  const handleReceiptDialogClose = () => {
    setShowReceiptDialog(false);
    setCompletedSaleData(null);
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.includes(productSearchTerm))
  );

  // Fetch states for a country
  const fetchStates = async (country) => {
    if (!country) return;
    
    try {
      setLocationLoading(true);
      const response = await fetch(`/api/taxes/location/states/?country=${country}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setShippingStates(data.states || []);
        setShippingCounties([]); // Reset counties when country changes
      }
    } catch (error) {
      console.error('[POS] Error fetching states:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch counties for a state
  const fetchCounties = async (country, state) => {
    if (!country || !state) return;
    
    try {
      setLocationLoading(true);
      const response = await fetch(`/api/taxes/location/counties/?country=${country}&state=${state}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setShippingCounties(data.counties || []);
      }
    } catch (error) {
      console.error('[POS] Error fetching counties:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Handle country change
  const handleCountryChange = (e) => {
    const { value } = e.target;
    setShippingAddress({...shippingAddress, country: value, state: '', county: ''});
    fetchStates(value);
  };

  // Handle state change
  const handleStateChange = (e) => {
    const { value } = e.target;
    setShippingAddress({...shippingAddress, state: value, county: ''});
    fetchCounties(shippingAddress.country, value);
  };

  return (
    <div className="h-full bg-gray-100">
      {/* Receipt Dialog */}
      <ReceiptDialog
        isOpen={showReceiptDialog}
        onClose={handleReceiptDialogClose}
        saleData={completedSaleData}
        businessInfo={businessInfo}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ShoppingCartIcon className="h-6 w-6 mr-2" />
              {t('title')}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowScanner(!showScanner)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                showScanner
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              {showScanner ? t('stopScanning') : t('scanWithCamera')}
            </button>
            <div className="flex items-center text-sm text-gray-500">
              <BarcodeIcon className="h-5 w-5 mr-2" />
              {t('usbScannerReady')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100%-73px)]">
        {/* Left Side - Product Selection */}
        <div className="w-1/2 p-6 overflow-auto">
          {showScanner ? (
            <div className="mb-6 h-64">
              <QRScanner
                isActive={showScanner}
                onScan={handleProductScan}
                onError={(error) => toast.error(error)}
                t={t}
              />
            </div>
          ) : null}

          {/* Product Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('searchProducts')}
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Products List */}
          {productsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">{t('loadingProducts')}</p>
            </div>
          ) : productsError ? (
            <div className="text-center py-8">
              <p className="text-red-600">{productsError}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[calc(100%-60px)]">
              <div className="overflow-auto h-full">
                <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{product.sku || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">${product.price}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-right">
                          {product.quantity_in_stock !== undefined ? product.quantity_in_stock : 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => addToCart(product)}
                            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Cart and Checkout */}
        <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
          {/* Cart Items */}
          <div className="flex-1 p-6 overflow-auto">
            <h2 className="text-lg font-semibold mb-4">{t('shoppingCart')}</h2>
            
            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('cartEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-500">${item.price} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 hover:bg-gray-200 rounded text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-right text-sm font-medium mt-2">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Customer Selection */}
            <div className="mt-6 relative customer-selection-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectCustomer')} {customers.length > 0 && `(${customers.length})`}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(true);
                    // Clear selection if user is typing
                    if (selectedCustomer && e.target.value !== getCustomerDisplayName(selectedCustomer)) {
                      setSelectedCustomer('');
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder={selectedCustomer ? getCustomerDisplayName(selectedCustomer) : t('walkInCustomer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {selectedCustomer && (
                  <button
                    onClick={() => {
                      setSelectedCustomer('');
                      setCustomerSearchTerm('');
                    }}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Customer Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div
                    onClick={() => {
                      setSelectedCustomer('');
                      setCustomerSearchTerm('');
                      setShowCustomerDropdown(false);
                      // Reset to business default tax for walk-in customer
                      setTaxRate(defaultTaxRate || 0);
                      console.log('[POS] Reset to default tax rate for walk-in customer:', defaultTaxRate);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                  >
                    <div className="font-medium">{t('walkInCustomer')}</div>
                    <div className="text-sm text-gray-500">No customer record</div>
                  </div>
                  {customers
                    .filter(customer => {
                      const searchLower = customerSearchTerm.toLowerCase();
                      // Build display name using same logic as getCustomerDisplayName
                      const displayName = (
                        customer.name || 
                        customer.business_name || 
                        customer.company_name || 
                        `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
                        customer.email ||
                        ''
                      ).toLowerCase();
                      const email = (customer.email || '').toLowerCase();
                      return displayName.includes(searchLower) || email.includes(searchLower);
                    })
                    .map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer.id);
                          setCustomerSearchTerm(getCustomerDisplayName(customer.id));
                          setShowCustomerDropdown(false);
                          // Calculate tax for this customer
                          calculateCustomerTax(customer);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="font-medium">
                          {customer.name || 
                           customer.business_name || 
                           customer.company_name || 
                           `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
                           customer.email}
                        </div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                    ))}
                  {customers.filter(customer => {
                    const searchLower = customerSearchTerm.toLowerCase();
                    const displayName = (
                      customer.name || 
                      customer.business_name || 
                      customer.company_name || 
                      `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
                      customer.email ||
                      ''
                    ).toLowerCase();
                    const email = (customer.email || '').toLowerCase();
                    return displayName.includes(searchLower) || email.includes(searchLower);
                  }).length === 0 && customerSearchTerm && (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Address Toggle */}
            {selectedCustomer && (
              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useShippingAddress}
                    onChange={(e) => setUseShippingAddress(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {t('useShippingAddress', 'Use different shipping address')}
                  </span>
                </label>
                
                {/* Shipping Address Fields */}
                {useShippingAddress && (
                  <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <input
                        type="text"
                        placeholder={t('streetAddress', 'Street Address')}
                        value={shippingAddress.street}
                        onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder={t('city', 'City')}
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <select
                        value={shippingAddress.state}
                        onChange={handleStateChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled={!shippingAddress.country || locationLoading}
                      >
                        <option value="">{t('selectState', 'Select State')}</option>
                        {shippingStates.map(state => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={shippingAddress.county}
                        onChange={(e) => setShippingAddress({...shippingAddress, county: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled={!shippingAddress.state || locationLoading}
                      >
                        <option value="">{t('selectCounty', 'Select County')}</option>
                        {shippingCounties.map(county => (
                          <option key={county.code} value={county.code}>
                            {county.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder={t('zipCode', 'Zip Code')}
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({...shippingAddress, postcode: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <select
                      value={shippingAddress.country}
                      onChange={handleCountryChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select Country</option>
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Discount */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('discount')}
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('type')}
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="percentage">%</option>
                  <option value="amount">$</option>
                </select>
              </div>
            </div>

            {/* Tax Information (Read-Only) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('taxInformation', 'Tax Information')}
              </label>
              <div className="relative">
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Total Rate: {taxRate.toFixed(2)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {taxJurisdiction?.source === 'tenant_override' ? 'Custom Rate' : 'Automatic'}
                    </span>
                  </div>
                  
                  {taxJurisdiction?.is_custom_rate && (
                    <div className="mt-1 text-xs text-blue-600">
                      <span className="font-medium">Custom Override:</span> {taxJurisdiction?.override_reason || 'Custom tax rate applied'}
                    </div>
                  )}
                </div>
                
                <div className="mt-1 text-xs text-gray-500 flex items-center">
                  <svg className="w-3 h-3 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Tax rates are configured in Settings → Taxes (Admin access required)
                </div>
                
                {/* Tax Jurisdiction Display */}
                {taxJurisdiction && (
                  <div className={`mt-2 p-3 rounded-lg text-xs border ${
                    taxJurisdiction.tax_calculation_method === 'international_export' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className={`font-medium mb-2 flex items-center justify-between ${
                      taxJurisdiction.tax_calculation_method === 'international_export' 
                        ? 'text-green-900' 
                        : 'text-blue-900'
                    }`}>
                      <span>
                        Tax Source: {taxJurisdiction.tax_calculation_method === 'destination' ? 'Customer Shipping Address' :
                                    taxJurisdiction.tax_calculation_method === 'billing' ? 'Customer Billing Address' :
                                    taxJurisdiction.tax_calculation_method === 'origin' ? 'Business Location' :
                                    taxJurisdiction.tax_calculation_method === 'international_export' ? 'International Sale (Tax-Free Export)' :
                                    taxJurisdiction.tax_calculation_method}
                      </span>
                      {taxJurisdiction.tax_jurisdiction?.source === 'tenant_override' && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                          CUSTOM
                        </span>
                      )}
                    </div>
                    
                    {/* International Export Message */}
                    {taxJurisdiction.tax_calculation_method === 'international_export' && (
                      <div className="mb-2 p-2 bg-green-100 border border-green-300 rounded text-green-800 font-medium">
                        🌍 International Export - Zero Tax Applied
                        <div className="text-xs font-normal mt-1">
                          Export sales are typically tax-free in most jurisdictions
                        </div>
                      </div>
                    )}
                    
                    {taxJurisdiction.tax_jurisdiction && (
                      <div className="space-y-1">
                        <div className="text-blue-800 font-medium">
                          Location: {taxJurisdiction.tax_jurisdiction.country}
                          {taxJurisdiction.tax_jurisdiction.state && `, ${taxJurisdiction.tax_jurisdiction.state}`}
                          {taxJurisdiction.tax_jurisdiction.county && `, ${taxJurisdiction.tax_jurisdiction.county}`}
                        </div>
                        
                        <div className="text-blue-700 space-y-1 mt-2">
                          <div className="font-medium text-blue-800 mb-1">Tax Breakdown:</div>
                          
                          {taxJurisdiction.tax_jurisdiction.components?.map((component, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="capitalize">{component.type}: {component.name}</span>
                              <span className="font-medium">{(parseFloat(component.rate) * 100).toFixed(2)}%</span>
                            </div>
                          ))}
                          
                          <div className="border-t border-blue-200 pt-1 mt-2">
                            <div className="flex justify-between font-medium text-blue-900">
                              <span>Total Rate:</span>
                              <span>{taxJurisdiction.tax_jurisdiction.total_rate ? (parseFloat(taxJurisdiction.tax_jurisdiction.total_rate) * 100).toFixed(2) : '0.00'}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-1 flex items-start space-x-1">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-gray-500">
                    Leave blank for automatic destination-based tax calculation. Enter a value to override.
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('paymentMethod')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="cash">{t('cash')}</option>
                <option value="card">{t('creditCard')}</option>
                <option value="mobile">{t('mobileMoney')}</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Totals and Checkout */}
          <div className="border-t border-gray-200 p-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>{t('subtotal')}:</span>
                <span>${totals.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>{t('discount')}:</span>
                <span>-${totals.discountAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('tax')}:</span>
                <span>${totals.taxAmount}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>{t('total')}:</span>
                <span>${totals.total}</span>
              </div>
            </div>

            <button
              onClick={handleProcessSale}
              disabled={isProcessing || cartItems.length === 0}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
                isProcessing || cartItems.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('processing')}
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  {t('completeSale')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}