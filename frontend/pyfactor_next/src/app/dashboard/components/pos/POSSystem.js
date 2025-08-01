'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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
  PrinterIcon
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
    console.error('[POSSystem] Failed to load QR scanner:', err);
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
    setHasPermission(false);
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Starting camera...</p>
          </div>
        </div>
      )}
      
      {!hasPermission && !isLoading && (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('allowCameraAccess')}</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-64 object-cover rounded-lg ${hasPermission ? 'block' : 'hidden'}`}
      />
    </div>
  );
};

// Tooltip component
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Error boundary for POSSystem
class POSErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[POSSystem] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading POS System</h2>
          <p className="text-sm text-gray-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onClose && this.props.onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close POS System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const POSSystemContent = ({ isOpen, onClose, onSaleCompleted }) => {
  const { t } = useTranslation('pos');
  
  // Debug props
  console.log('[POSSystem] Rendering with props:', { isOpen, onClose: !!onClose, onSaleCompleted: !!onSaleCompleted });
  console.log('[POSSystem] Version: 2025-01-11 v4 - Fixed duplicate events with memoization');

  // Mock business info - in real app, this would come from settings/profile
  const businessInfo = {
    name: 'Your Business Name',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'info@yourbusiness.com',
    website: 'www.yourbusiness.com',
    taxId: 'TAX123456789'
  };
  
  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // Scanner status for user feedback
  const [scannerStatus, setScannerStatus] = useState('ready'); // ready, scanning, detected
  const [scannerDetected, setScannerDetected] = useState(false);
  
  // Receipt dialog state
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState(null);

  // Refs
  const productSearchRef = useRef(null);

  // Real product data from database
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      if (!isOpen) return; // Don't fetch if POS is not open
      
      try {
        setProductsLoading(true);
        console.log('[POSSystem] Fetching products from database...');
        
        const response = await fetch('/api/inventory/products', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[POSSystem] Products API response:', data);
        
        // Handle Django REST Framework response format
        let productsArray = [];
        if (data.results && Array.isArray(data.results)) {
          // Paginated response
          productsArray = data.results;
        } else if (Array.isArray(data)) {
          // Direct array response
          productsArray = data;
        } else if (data.products && Array.isArray(data.products)) {
          // Wrapped in products key
          productsArray = data.products;
        }
        
        console.log('[POSSystem] Products array:', productsArray);
        
        // Transform API data to match POS format
        const transformedProducts = productsArray.map(product => ({
          id: product.id || product.product_id || 'unknown',
          name: product.name || product.product_name || 'Unknown Product',
          price: parseFloat(product.price || 0),
          sku: product.sku || product.id || 'no-sku',
          barcode: product.barcode || product.sku || product.id || 'no-barcode',
          description: product.description || '',
          stock: parseInt(product.quantity || product.stock_quantity || product.stock || 0)
        }));
        
        setProducts(transformedProducts);
        console.log('[POSSystem] Transformed products:', transformedProducts);
        
      } catch (error) {
        console.error('[POSSystem] Error fetching products:', error);
        setProductsError(error.message);
        
        // Fallback to real products from database for testing
        console.log('[POSSystem] Using fallback products from database');
        const fallbackProducts = [
          {
            id: 'c1b9b1aa-f180-4591-ade3-2b884b2fe629',
            name: 'Hat',
            price: 21.00,
            sku: 'PROD-2025-0002',
            barcode: 'PROD-2025-0002',
            description: 'Hat product from database',
            stock: 12
          },
          {
            id: '605ae0c8-bf1d-48c5-9bc9-e883929a33ab',
            name: 'Shoes',
            price: 12.00,
            sku: 'PROD-2025-0001',
            barcode: 'PROD-2025-0001',
            description: 'Shoes product from database',
            stock: 0
          }
        ];
        setProducts(fallbackProducts);
        
        // Show error but continue with fallback data
        toast.error(
          <div>
            <div>Products API Error</div>
            <div className="text-xs mt-1">Using cached products</div>
            <div className="text-xs">Check backend connection</div>
          </div>,
          { duration: 5000 }
        );
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen]);

  const mockCustomers = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
  ];

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
    
    console.log('[POS] Raw scanned code:', scannedCode);
    
    // Try to parse as JSON first (for QR codes with full product data)
    let productData = null;
    let searchTerms = [];
    
    try {
      // Try parsing as JSON directly
      productData = JSON.parse(scannedCode);
      console.log('[POS] Parsed JSON data:', productData);
      
      // Extract search terms from JSON
      if (productData.id) searchTerms.push(productData.id);
      if (productData.sku) searchTerms.push(productData.sku);
      if (productData.name) searchTerms.push(productData.name);
      if (productData.barcode) searchTerms.push(productData.barcode);
      
    } catch (e) {
      console.log('[POS] Not valid JSON, treating as simple barcode/SKU');
      // Clean the scanned code for simple barcodes
      let cleanCode = scannedCode.trim().replace(/[{}"']/g, '');
      searchTerms.push(cleanCode, scannedCode.trim());
    }
    
    console.log('[POS] Search terms extracted:', searchTerms);
    
    // Find product using all search terms
    console.log('[POS] Available products:', products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode
    })));
    
    let product = null;
    
    // First, try exact ID match if we have JSON data
    if (productData && productData.id) {
      product = products.find(p => String(p.id) === String(productData.id));
      if (product) {
        console.log('[POS] Found product by exact ID match:', productData.id);
      }
    }
    
    // If not found by ID, try other search terms
    if (!product) {
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
          
          console.log(`[POS] Checking product "${p.name}" against term "${term}":`, matches);
          
          return matches.idMatch || matches.skuMatch || matches.barcodeMatch || 
                 matches.nameMatch || (term.length > 2 && matches.nameContains);
        });
      });
    }

    if (product) {
      addToCart(product);
      
      // Different success messages for QR vs barcode scans
      if (productData && productData.id) {
        toast.success(
          <div className="flex items-center">
            <BarcodeIcon className="h-5 w-5 mr-2" />
            <div>
              <div className="font-medium">QR Code Scanned</div>
              <div className="text-sm">{product.name} - ${product.price}</div>
            </div>
          </div>, 
          {
            duration: 3000,
            position: 'top-center',
            style: {
              background: '#10B981',
              color: 'white',
            },
          }
        );
      } else {
        toast.success(`Added ${product.name} to cart`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: 'white',
          },
        });
      }
      
      setShowScanner(false);
      
      // Clear the search field after successful scan
      setProductSearchTerm('');
    } else {
      // More informative error for JSON QR codes
      if (productData && productData.id) {
        toast.error(
          <div>
            <div className="font-medium">Product Not Found</div>
            <div className="text-xs mt-1">Product ID: {productData.id}</div>
            <div className="text-xs mt-1">SKU: {productData.sku || 'N/A'}</div>
            <div className="text-xs mt-1">Name: {productData.name || 'N/A'}</div>
            <div className="text-xs mt-2 font-medium">Make sure this product exists in your inventory</div>
          </div>, 
          {
            duration: 5000,
            position: 'top-center',
          }
        );
        // Clear search field for JSON scans since we can't search with the full JSON
        setProductSearchTerm('');
      } else {
        // Show the scanned code in the error message
        const searchTerm = searchTerms[0] || scannedCode;
        toast.error(
          <div>
            <div>Product not found</div>
            <div className="text-xs mt-1">Scanned: {searchTerm}</div>
            <div className="text-xs mt-1">Available products: {products.length}</div>
            <div className="text-xs mt-1">Try searching by product name instead</div>
          </div>, 
          {
            duration: 4000,
            position: 'top-center',
          }
        );
        
        // Set the search term in the field so user can try manual search
        setProductSearchTerm(searchTerm);
      }
    }
  }, [products, addToCart]);

  // Scanner detection with stable event handling
  useEffect(() => {
    if (!isOpen) return;
    
    let buffer = '';
    let bufferTimer = null;
    let lastKeypressTime = 0;
    let scanStartTime = 0;
    let isDetected = false; // Local variable to avoid state dependency

    // Initial status
    setScannerStatus('ready');
    console.log('[POSSystem] Scanner detection initialized, isOpen:', isOpen);

    const handleKeyPress = (event) => {
      const now = Date.now();
      
      // CRITICAL FIX: Ignore keystrokes when focused on input/textarea/select elements
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT' ||
        activeElement.contentEditable === 'true'
      );
      
      console.log('[POSSystem] Key pressed:', {
        key: event.key,
        isInputFocused,
        activeElement: activeElement?.tagName,
        activeElementId: activeElement?.id,
        activeElementClass: activeElement?.className,
        buffer: buffer,
        bufferLength: buffer.length,
        timeSinceLastKey: now - lastKeypressTime
      });
      
      // If user is typing in an input field, ignore the keystroke for scanner detection
      if (isInputFocused) {
        console.log('[POSSystem] Ignoring keystroke - user typing in input field');
        return;
      }
      
      // Handle Enter key - process complete scan
      if (event.key === 'Enter') {
        // If buffer has content, it's a scanner input
        if (buffer.length > 0) {
          console.log('[POSSystem] Scanner input detected via Enter:', buffer);
          setScannerStatus('scanning');
          handleProductScan(buffer);
          buffer = '';
          setProductSearchTerm('');
          
          // Reset to detected status after scanning
          setTimeout(() => {
            setScannerStatus(isDetected ? 'detected' : 'ready');
          }, 1000);
        } else if (productSearchTerm.length > 0) {
          // If no buffer but there's text in the search field, process it as manual input
          console.log('[POSSystem] Manual search via Enter:', productSearchTerm);
          setScannerStatus('scanning');
          handleProductScan(productSearchTerm);
          
          // Reset status after processing
          setTimeout(() => {
            setScannerStatus('ready');
          }, 1000);
        }
        return;
      }
      
      // Handle printable characters
      if (event.key.length === 1) {
        // If it's been more than 100ms since last keypress, start new buffer
        if (now - lastKeypressTime > 100) {
          console.log('[POSSystem] Starting new scanner buffer (timeout)');
          buffer = '';
          scanStartTime = now;
        }
        
        buffer += event.key;
        const timeBetweenKeys = now - lastKeypressTime;
        lastKeypressTime = now;
        
        console.log('[POSSystem] Scanner buffer updated:', {
          buffer,
          timeBetweenKeys,
          bufferLength: buffer.length,
          scannerDetected: isDetected
        });
        
        // Detect scanner based on typing speed (very fast input) or JSON pattern
        const looksLikeJsonQR = buffer.includes('{') && buffer.includes('"');
        const fastTyping = timeBetweenKeys < 50 && buffer.length > 3;
        const longFastInput = buffer.length > 10 && (now - scanStartTime) < 500; // Long input in short time
        
        if ((fastTyping || longFastInput || looksLikeJsonQR) && !isDetected) {
          console.log('[POSSystem] SCANNER DETECTED!', {
            fastTyping,
            longFastInput,
            looksLikeJsonQR,
            bufferLength: buffer.length,
            timeSpan: now - scanStartTime
          });
          isDetected = true;
          setScannerDetected(true);
          setScannerStatus('detected');
          toast.success('🔍 Barcode scanner detected!', {
            duration: 3000,
            position: 'top-center',
          });
        }
        
        // Update search term for visual feedback ONLY if not typing in input
        if (!isInputFocused) {
          setProductSearchTerm(buffer);
          console.log('[POSSystem] Updated search term to:', buffer);
        }
        
        // Clear buffer after 500ms of inactivity
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => {
          console.log('[POSSystem] Clearing scanner buffer after timeout');
          buffer = '';
          if (!isInputFocused) {
            setProductSearchTerm('');
          }
        }, 500);
      }
    };

    // Add single event listener
    window.addEventListener('keydown', handleKeyPress);
    console.log('[POSSystem] Global keydown event listener added');
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (bufferTimer) clearTimeout(bufferTimer);
      console.log('[POSSystem] Global keydown event listener removed and buffers cleared');
    };
  }, [isOpen]); // Only depend on isOpen to prevent re-render loops

  // Focus on product search when modal opens and reset when closed
  useEffect(() => {
    if (isOpen && productSearchRef.current) {
      setTimeout(() => {
        productSearchRef.current.focus();
      }, 100);
    } else if (!isOpen) {
      // Reset scanner state when POS is closed
      setScannerStatus('ready');
      setScannerDetected(false);
      setProductSearchTerm('');
    }
  }, [isOpen]);

  // Auto-process JSON QR codes when detected in search field
  useEffect(() => {
    if (!productSearchTerm || productSearchTerm.length < 10) return;
    
    // Check if it's JSON
    if (productSearchTerm.trim().startsWith('{') && productSearchTerm.includes('"id"')) {
      console.log('[POSSystem] Detected JSON in search field, auto-processing...');
      
      // Update scanner status to show processing
      setScannerStatus('scanning');
      
      // Small delay to ensure the full JSON is typed/scanned
      const timer = setTimeout(() => {
        handleProductScan(productSearchTerm);
        // Clear the search field after processing
        setProductSearchTerm('');
        
        // Reset scanner status after processing
        setTimeout(() => {
          setScannerStatus(scannerDetected ? 'detected' : 'ready');
        }, 1000);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [productSearchTerm, scannerDetected]);

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discount / 100);
    } else {
      discountAmount = discount;
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

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
      
      const saleData = {
        items: cartItems,
        customer_id: selectedCustomer,
        subtotal: totals?.subtotal || '0.00',
        discount_amount: totals?.discountAmount || '0.00',
        discount_type: discountType,
        tax_amount: totals?.taxAmount || '0.00',
        tax_rate: taxRate,
        total_amount: totals?.total || '0.00',
        payment_method: paymentMethod,
        notes,
        date: new Date().toISOString().split('T')[0],
        status: 'completed'
      };

      safeLogger.info('[POS] Processing sale with backend:', saleData);
      
      // Call actual backend API
      const response = await fetch('/api/pos/complete-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Sale failed: ${errorData}`);
      }

      const result = await response.json();
      safeLogger.info('[POS] Sale completed successfully:', result);

      // Prepare sale data for receipt
      const enhancedSaleData = {
        ...saleData,
        ...result,
        invoice_number: result.invoice_number || result.id,
        customer: selectedCustomer ? mockCustomers.find(c => c.id === selectedCustomer) : null,
      };

      // Show receipt dialog instead of just closing
      setCompletedSaleData(enhancedSaleData);
      setShowReceiptDialog(true);

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
      
      // Reset form but don't close POS yet - user will close via receipt dialog
      resetCart();
      
    } catch (error) {
      safeLogger.error('[POS] Error processing sale:', error);
      toast.error(`${t('error')}: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
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
    onClose(); // Close the main POS dialog
  };

  return (
    <>
      {/* Receipt Dialog */}
      <ReceiptDialog
        isOpen={showReceiptDialog}
        onClose={handleReceiptDialogClose}
        saleData={completedSaleData}
        businessInfo={businessInfo}
      />

      {/* Main POS Dialog */}
    <Transition appear show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={() => {
        console.log('[POSSystem] Dialog onClose triggered');
        onClose();
      }}>
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
        </Transition.Child>

        <div className="absolute inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <Dialog.Title className="text-2xl font-bold text-gray-900 flex items-center">
                    <ShoppingCartIcon className="h-8 w-8 text-blue-600 mr-3" />
                    {t('title')}
                  </Dialog.Title>
                  <button
                    onClick={() => {
                      console.log('[POSSystem] X button clicked, calling onClose');
                      onClose();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Main Content */}
                <div className="flex h-[80vh]">
                  {/* Left Panel - Product Search & Scanner */}
                  <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Product Search */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              {t('searchProducts')}
                              <FieldTooltip text={t('searchProducts')} />
                            </label>
                            {/* Scanner Status Indicator */}
                            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              scannerStatus === 'detected' 
                                ? 'bg-green-100 text-green-700'
                                : scannerStatus === 'scanning'
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                scannerStatus === 'detected'
                                  ? 'bg-green-500'
                                  : scannerStatus === 'scanning'
                                  ? 'bg-blue-500 animate-pulse'
                                  : 'bg-gray-400'
                              }`} />
                              {scannerStatus === 'detected' && 'Scanner Ready'}
                              {scannerStatus === 'scanning' && 'Scanning...'}
                              {scannerStatus === 'ready' && 'Ready'}
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            ref={productSearchRef}
                            type="text"
                            value={productSearchTerm}
                            onChange={(e) => {
                              console.log('[POSSystem] Input onChange:', {
                                newValue: e.target.value,
                                oldValue: productSearchTerm,
                                inputSource: 'manual_typing'
                              });
                              setProductSearchTerm(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              console.log('[POSSystem] Input onKeyDown:', {
                                key: e.key,
                                currentValue: productSearchTerm,
                                targetValue: e.target.value
                              });
                            }}
                            onInput={(e) => {
                              console.log('[POSSystem] Input onInput:', {
                                inputType: e.inputType,
                                data: e.data,
                                value: e.target.value
                              });
                            }}
                            placeholder={
                              scannerStatus === 'detected' ? "Scanner ready - scan or type to search"
                              : scannerStatus === 'scanning' ? "Scanning..."
                              : "Type product name or scan barcode..."
                            }
                            className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:ring-2 text-lg transition-all ${
                              scannerStatus === 'detected'
                                ? 'border-green-400 focus:ring-green-500 focus:border-green-500'
                                : scannerStatus === 'scanning'
                                ? 'border-blue-400 focus:ring-blue-500 focus:border-blue-500'
                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                          <BarcodeIcon className={`absolute right-3 top-3 h-6 w-6 ${
                            scannerStatus === 'detected' ? 'text-green-500'
                            : scannerStatus === 'scanning' ? 'text-blue-500 animate-pulse'
                            : 'text-gray-400'
                          }`} />
                        </div>
                        
                        {/* Scanner Status Messages */}
                        {scannerStatus === 'detected' && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-green-800">{t('scannerDetection')} ✓</p>
                                <p className="text-xs text-green-700">{t('scannerDetectionMessage')}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {scannerStatus === 'ready' && !scannerDetected && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-blue-800">{t('scannerDetection')}</p>
                                <p className="text-xs text-blue-700">{t('scannerDetectionMessage')}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>




                      {/* Products Loading State */}
                      {productsLoading && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            <span className="text-sm text-blue-700">{t('loadingProducts')}</span>
                          </div>
                        </div>
                      )}

                      {/* Products Error State */}
                      {productsError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-red-900 mb-1">{t('errorLoadingProducts')}</h4>
                          <p className="text-xs text-red-700">{productsError}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                          >
                            {t('reload')}
                          </button>
                        </div>
                      )}

                      {/* Product Quick Add (if searching) */}
                      {productSearchTerm && !showScanner && !productsLoading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">
                              {(() => {
                                try {
                                  // Check if it's JSON being processed
                                  if (productSearchTerm.trim().startsWith('{') && productSearchTerm.includes('"id"')) {
                                    return t('processingQRCode');
                                  }
                                  
                                  const searchTerm = String(productSearchTerm || '').toLowerCase();
                                  const filtered = products.filter(product => {
                                    if (!product) return false;
                                    const name = String(product.name || '').toLowerCase();
                                    const sku = String(product.sku || '').toLowerCase();
                                    const barcode = String(product.barcode || '');
                                    return name.includes(searchTerm) || sku.includes(searchTerm) || barcode.includes(searchTerm);
                                  });
                                  return filtered.length > 0 ? t('searchResults') : t('noProductsFound');
                                } catch (error) {
                                  console.error('[POSSystem] Filter error:', error);
                                  return t('noProductsFound');
                                }
                              })()}
                            </h3>
                            {(productSearchTerm || '').length > 0 && (
                              <button
                                onClick={() => {
                                  setProductSearchTerm('');
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                {t('clearSearch')}
                              </button>
                            )}
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {(() => {
                              try {
                                // Don't show product list if processing JSON
                                if (productSearchTerm.trim().startsWith('{') && productSearchTerm.includes('"id"')) {
                                  return (
                                    <div className="p-4 text-center">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                      <p className="text-sm text-gray-500 mt-2">{t('processingQRCode')}</p>
                                    </div>
                                  );
                                }
                                
                                const searchTerm = String(productSearchTerm || '').toLowerCase();
                                const filtered = products.filter(product => {
                                  if (!product) return false;
                                  const name = String(product.name || '').toLowerCase();
                                  const sku = String(product.sku || '').toLowerCase();
                                  const barcode = String(product.barcode || '');
                                  return name.includes(searchTerm) || sku.includes(searchTerm) || barcode.includes(searchTerm);
                                });
                                return filtered.slice(0, 5).map(product => (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    addToCart(product);
                                    setProductSearchTerm('');
                                    toast.success(t('productAdded'));
                                  }}
                                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-gray-900 group-hover:text-blue-600">{product.name}</p>
                                      <p className="text-sm text-gray-500">{t('sku')}: {product.sku}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-gray-900">${product.price}</p>
                                      <p className="text-sm text-gray-500">{t('stock')}: {product.stock}</p>
                                    </div>
                                  </div>
                                </div>
                              ));
                              } catch (error) {
                                console.error('[POSSystem] Filter error:', error);
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Panel - Cart & Checkout */}
                  <div className="w-1/2 p-6 flex flex-col">
                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">{t('title')} ({cartItems.length})</h3>
                      
                      {cartItems.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCartIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">{t('emptyCart')}</p>
                          <p className="text-sm text-gray-400">{t('searchProducts')}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cartItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                <p className="text-sm text-gray-500">${item.price} each</p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </button>
                                <span className="w-12 text-center font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                                <div className="w-20 text-right font-medium">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Checkout Section */}
                    {cartItems.length > 0 && (
                      <div className="border-t border-gray-200 pt-6 space-y-4">
                        {/* Customer Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('customer')}
                            <FieldTooltip text={t('selectCustomer')} />
                          </label>
                          <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">{t('walkInCustomer')}</option>
                            {mockCustomers.map(customer => (
                              <option key={customer.id} value={customer.id}>
                                {customer.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Discount & Tax */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('discount')}
                              <FieldTooltip text={t('applyDiscount')} />
                            </label>
                            <div className="flex">
                              <input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                              />
                              <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value)}
                                className="border border-l-0 border-gray-300 rounded-r-md px-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="percentage">%</option>
                                <option value="amount">$</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('taxRate')}
                              <FieldTooltip text={t('taxRateTooltip')} />
                            </label>
                            <input
                              type="number"
                              value={taxRate}
                              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('paymentMethod')}
                            <FieldTooltip text={t('paymentMethodTooltip')} />
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="cash">{t('cash')}</option>
                            <option value="credit_card">{t('creditCard')}</option>
                            <option value="debit_card">{t('debitCard')}</option>
                            <option value="mobile_money">{t('mobilePayment')}</option>
                            <option value="bank_transfer">{t('other')}</option>
                            <option value="check">{t('other')}</option>
                          </select>
                        </div>

                        {/* Totals */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{t('subtotal')}:</span>
                            <span>${totals?.subtotal || '0.00'}</span>
                          </div>
                          {parseFloat(totals?.discountAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>{t('discount')}:</span>
                              <span>-${totals?.discountAmount || '0.00'}</span>
                            </div>
                          )}
                          {parseFloat(totals?.taxAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>{t('tax')}:</span>
                              <span>${totals?.taxAmount || '0.00'}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                            <span>{t('total')}:</span>
                            <span>${totals?.total || '0.00'}</span>
                          </div>
                        </div>

                        {/* Process Sale Button */}
                        <button
                          onClick={handleProcessSale}
                          disabled={isProcessing}
                          className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {isProcessing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t('processing')}...
                            </>
                          ) : (
                            <>
                              <CreditCardIcon className="h-5 w-5 mr-2" />
                              {t('processSale')} - ${totals?.total || '0.00'}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
    </>
  );
};

// Memoize POSSystemContent to prevent unnecessary re-renders
const MemoizedPOSSystemContent = React.memo(POSSystemContent);

// Wrap POSSystemContent with Error Boundary
const POSSystem = (props) => {
  return (
    <POSErrorBoundary onClose={props.onClose}>
      <MemoizedPOSSystemContent {...props} />
    </POSErrorBoundary>
  );
};

export default POSSystem;