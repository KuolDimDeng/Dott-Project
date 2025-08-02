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
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // percentage or amount
  const [taxRate, setTaxRate] = useState(0);
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
        const response = await fetch('/api/products/', {
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
        const response = await fetch('/api/customers/', {
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
          
          if (data.results) {
            setCustomers(data.results);
            console.log('[POS] Set customers from results:', data.results.length);
          } else if (Array.isArray(data)) {
            setCustomers(data);
            console.log('[POS] Set customers from array:', data.length);
          } else if (data.customers) {
            setCustomers(data.customers);
            console.log('[POS] Set customers from customers field:', data.customers.length);
          }
        }
      } catch (error) {
        console.error('[POS] Error fetching customers:', error);
        // Don't show error toast for customers as it's optional
      }
    };

    fetchCustomers();
  }, []);

  // Load business info
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const response = await fetch('/api/users/me/', {
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
            email: data.email || ''
          });
        }
      } catch (error) {
        console.error('[POS] Error fetching business info:', error);
      }
    };

    fetchBusinessInfo();
  }, []);

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

      console.log('[POS] Submitting sale data:', saleData);
      
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

      // Prepare sale data for receipt
      const enhancedSaleData = {
        ...saleData,
        ...result,
        invoice_number: result.invoice_number || result.id,
        customer: selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null,
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
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectCustomer')} {customers.length > 0 && `(${customers.length})`}
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t('walkInCustomer')}</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </option>
                ))}
              </select>
            </div>

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

            {/* Tax */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('taxRate')} (%)
              </label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
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