'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ShoppingCartIcon, 
  XMarkIcon, 
  PlusIcon, 
  MinusIcon,
  CameraIcon,
  BarcodeIcon,
  TrashIcon,
  UserIcon,
  CreditCardIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

// QR Scanner library - import the actual library
import QrScannerLib from 'qr-scanner';

const QRScanner = ({ isActive, onScan, onError }) => {
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

      // Initialize QR Scanner
      qrScannerRef.current = new QrScannerLib(
        videoRef.current,
        (result) => {
          logger.info('[QRScanner] QR Code detected:', result.data);
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
      onError('Camera access denied. Please allow camera permissions and ensure you are using HTTPS.');
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
            <p className="text-sm text-gray-600">Camera access required for scanning</p>
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

const POSSystem = ({ isOpen, onClose, onSaleCompleted }) => {
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
  const [scannerType, setScannerType] = useState('usb'); // 'usb' or 'camera'
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Refs
  const productSearchRef = useRef(null);
  const usbScannerRef = useRef('');

  // Mock product data - replace with actual API call
  const mockProducts = [
    { id: 'PROD-001', name: 'Widget A', price: 29.99, sku: 'WID-A-001', description: 'Premium widget', stock: 50 },
    { id: 'PROD-002', name: 'Widget B', price: 39.99, sku: 'WID-B-002', description: 'Deluxe widget', stock: 30 },
    { id: 'PROD-003', name: 'Gadget X', price: 15.99, sku: 'GAD-X-003', description: 'Compact gadget', stock: 100 },
    { id: 'PROD-004', name: 'Tool Pro', price: 89.99, sku: 'TOL-P-004', description: 'Professional tool', stock: 25 },
  ];

  const mockCustomers = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  // USB Scanner support (keyboard wedge)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!isSearchFocused || !isOpen) return;

      // USB scanners typically send data very quickly followed by Enter
      if (event.key === 'Enter' && usbScannerRef.current.length > 0) {
        handleProductScan(usbScannerRef.current);
        usbScannerRef.current = '';
        setProductSearchTerm('');
        return;
      }

      // Build up the scanned code
      if (event.key.length === 1) {
        usbScannerRef.current += event.key;
        setProductSearchTerm(usbScannerRef.current);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [isSearchFocused, isOpen]);

  // Focus on product search when modal opens
  useEffect(() => {
    if (isOpen && productSearchRef.current) {
      setTimeout(() => {
        productSearchRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle product scanning (both USB and camera)
  const handleProductScan = useCallback((scannedCode) => {
    logger.info('[POS] Product scanned:', scannedCode);
    
    // Find product by ID or SKU
    const product = mockProducts.find(p => 
      p.id === scannedCode || 
      p.sku === scannedCode ||
      p.name.toLowerCase().includes(scannedCode.toLowerCase())
    );

    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name} to cart`);
      setShowScanner(false);
    } else {
      toast.error(`Product not found: ${scannedCode}`);
    }
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
      toast.error('Please add items to cart');
      return;
    }

    setIsProcessing(true);
    try {
      const totals = calculateTotals();
      
      const saleData = {
        items: cartItems,
        customer_id: selectedCustomer,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        discount_type: discountType,
        tax_amount: totals.taxAmount,
        tax_rate: taxRate,
        total_amount: totals.total,
        payment_method: paymentMethod,
        notes,
        date: new Date().toISOString().split('T')[0],
        status: 'completed'
      };

      logger.info('[POS] Processing sale with backend:', saleData);
      
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
      logger.info('[POS] Sale completed successfully:', result);

      toast.success(`Sale completed! Invoice #${result.invoice_number || result.id}`);
      
      // Show success details
      if (result.inventory_updated) {
        toast.success('Inventory updated automatically');
      }
      if (result.accounting_entries_created) {
        toast.success('Accounting entries recorded');
      }
      
      // Notify parent and reset
      if (onSaleCompleted) {
        onSaleCompleted(result);
      }
      
      // Reset form
      resetCart();
      onClose();
      
    } catch (error) {
      logger.error('[POS] Error processing sale:', error);
      toast.error(`Failed to process sale: ${error.message}`);
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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
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
                    Point of Sale System
                  </Dialog.Title>
                  <button
                    onClick={onClose}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Search / Barcode Scanner
                          <FieldTooltip text="Type product name, scan barcode with USB scanner, or use camera to scan QR codes" />
                        </label>
                        <div className="relative">
                          <input
                            ref={productSearchRef}
                            type="text"
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            placeholder="Scan barcode or type product name..."
                            className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                          />
                          <BarcodeIcon className="absolute right-3 top-3 h-6 w-6 text-gray-400" />
                        </div>
                      </div>

                      {/* Scanner Controls */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setScannerType('camera');
                            setShowScanner(!showScanner);
                          }}
                          className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border transition-colors ${
                            showScanner && scannerType === 'camera'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <CameraIcon className="h-5 w-5 mr-2" />
                          Camera Scanner
                        </button>
                      </div>

                      {/* Camera Scanner */}
                      {showScanner && scannerType === 'camera' && (
                        <div className="space-y-4">
                          <QRScanner
                            isActive={showScanner && scannerType === 'camera'}
                            onScan={handleProductScan}
                            onError={(error) => {
                              toast.error(error);
                              setShowScanner(false);
                            }}
                          />
                          <p className="text-sm text-gray-600 text-center">
                            Point camera at QR code to scan product
                          </p>
                        </div>
                      )}

                      {/* Product Quick Add (if searching) */}
                      {productSearchTerm && !showScanner && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-gray-700">Quick Add Products:</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {mockProducts
                              .filter(product =>
                                product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                                product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
                              )
                              .map(product => (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    addToCart(product);
                                    setProductSearchTerm('');
                                    toast.success(`Added ${product.name} to cart`);
                                  }}
                                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-gray-900">{product.name}</p>
                                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-gray-900">${product.price}</p>
                                      <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Panel - Cart & Checkout */}
                  <div className="w-1/2 p-6 flex flex-col">
                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Shopping Cart ({cartItems.length} items)</h3>
                      
                      {cartItems.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCartIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Cart is empty</p>
                          <p className="text-sm text-gray-400">Scan or search for products to add them</p>
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
                            Customer
                            <FieldTooltip text="Select customer for this sale (optional)" />
                          </label>
                          <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Walk-in Customer</option>
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
                              Discount
                              <FieldTooltip text="Apply discount to subtotal" />
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
                              Tax Rate (%)
                              <FieldTooltip text="Tax rate applied to discounted subtotal" />
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
                            Payment Method
                            <FieldTooltip text="How customer is paying for this purchase" />
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="cash">Cash</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="debit_card">Debit Card</option>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="check">Check</option>
                          </select>
                        </div>

                        {/* Totals */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${totals.subtotal}</span>
                          </div>
                          {parseFloat(totals.discountAmount) > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Discount:</span>
                              <span>-${totals.discountAmount}</span>
                            </div>
                          )}
                          {parseFloat(totals.taxAmount) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Tax:</span>
                              <span>${totals.taxAmount}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                            <span>Total:</span>
                            <span>${totals.total}</span>
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
                              Processing Sale...
                            </>
                          ) : (
                            <>
                              <CreditCardIcon className="h-5 w-5 mr-2" />
                              Process Sale - ${totals.total}
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
  );
};

export default POSSystem;