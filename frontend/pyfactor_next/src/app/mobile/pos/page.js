'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { 
  MagnifyingGlassIcon, 
  CameraIcon, 
  ShoppingCartIcon,
  CreditCardIcon,
  BanknotesIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  WifiIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/CurrencyContext';
import CardScanner from './components/CardScanner';
import MobileProductGrid from './components/MobileProductGrid';
import MobileCart from './components/MobileCart';
import OfflineIndicator from './components/OfflineIndicator';
import MobileReceiptDialog from './components/MobileReceiptDialog';
import { encryptForStorage, decryptFromStorage, logSecurityEvent } from './utils/security';

export default function MobilePOSPage() {
  const router = useRouter();
  const { session, loading, isAuthenticated, tenantId } = useSession();
  const { formatCurrency, currencyCode, currencySymbol } = useCurrency();
  
  // State management
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [taxRate, setTaxRate] = useState(0);
  const [showCardScanner, setShowCardScanner] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({});

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Fetch products and business info
  useEffect(() => {
    console.log('[Mobile POS] Session check:', {
      hasSession: !!session,
      tenantId: tenantId,
      hookTenantId: session?.user?.tenantId,
      authenticated: session?.authenticated,
      isAuthenticated: isAuthenticated,
      user: session?.user?.email,
      loading: loading
    });
    
    // Use tenantId from hook or from session.user.tenantId
    if (!loading && (tenantId || session?.user?.tenantId)) {
      fetchProducts();
      fetchTaxRate();
      fetchBusinessInfo();
    }
  }, [session, tenantId, loading, isAuthenticated]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      
      console.log('[Mobile POS] fetchProducts called with session:', {
        hasSession: !!session,
        tenantId: session?.tenantId,
        user: session?.user?.email
      });
      
      // Check encrypted cache first (offline support)
      const encryptedCache = localStorage.getItem('pos_products_cache');
      if (encryptedCache && !navigator.onLine) {
        try {
          // Use tenant ID as encryption key
          const encryptionKey = tenantId || session?.user?.tenantId || 'default-key';
          const cached = decryptFromStorage(encryptedCache, encryptionKey);
          if (cached && cached.products) {
            setProducts(cached.products);
            setFilteredProducts(cached.products);
            setIsLoadingProducts(false);
            logSecurityEvent('OFFLINE_CACHE_LOADED', { itemCount: cached.products.length });
            return;
          }
        } catch (decryptError) {
          console.error('Failed to decrypt cache:', decryptError);
          localStorage.removeItem('pos_products_cache');
        }
      }

      console.log('[Mobile POS] Fetching products from /api/products');
      const response = await fetch('/api/products', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('[Mobile POS] Products response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Mobile POS] Products data received:', {
          hasData: !!data,
          hasProducts: !!data.products,
          productCount: data.products?.length || 0,
          success: data.success
        });
        
        const activeProducts = (data.products || []).filter(p => p.is_active !== false);
        console.log('[Mobile POS] Active products:', activeProducts.length);
        
        setProducts(activeProducts);
        setFilteredProducts(activeProducts);
        
        // Encrypt and cache for offline use
        const encryptionKey = tenantId || session?.user?.tenantId || 'default-key';
        const cacheData = {
          products: activeProducts,
          timestamp: Date.now()
        };
        const encryptedData = encryptForStorage(cacheData, encryptionKey);
        localStorage.setItem('pos_products_cache', encryptedData);
        
        logSecurityEvent('PRODUCTS_CACHED', { 
          itemCount: activeProducts.length,
          encrypted: true 
        });
      } else if (response.status === 401) {
        router.push('/auth/mobile-login');
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Try to use cached data
      const cachedProducts = localStorage.getItem('pos_products_cache');
      if (cachedProducts) {
        const cached = JSON.parse(cachedProducts);
        setProducts(cached.products);
        setFilteredProducts(cached.products);
        toast.success('Using cached products (offline mode)');
      } else {
        toast.error('No products available offline');
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchTaxRate = async () => {
    try {
      const response = await fetch('/api/pos/tax-rate-optimized', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setTaxRate(data.settings.sales_tax_rate || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching tax rate:', error);
      setTaxRate(0);
    }
  };

  const fetchBusinessInfo = async () => {
    try {
      const response = await fetch('/api/users/me/', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBusinessInfo({
          name: data.business_name || session?.user?.business_name || 'My Business',
          address: data.business_address || '',
          phone: data.business_phone || data.phone || '',
          email: data.business_email || data.email || '',
          website: data.business_website || '',
          taxId: data.tax_id || ''
        });
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }
  };

  // Search functionality
  useEffect(() => {
    const filtered = products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Cart management
  const addToCart = useCallback((product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    // Show cart indicator
    if (!isCartOpen && cart.length === 0) {
      setTimeout(() => setIsCartOpen(true), 500);
    }
  }, [cart]);

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    
    if (cart.length === 1) {
      setIsCartOpen(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setIsCartOpen(false);
  };

  // Calculate totals
  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTaxAmount = () => {
    return getSubtotal() * taxRate;
  };

  const getTotalAmount = () => {
    return getSubtotal() + getTaxAmount();
  };

  // Process sale
  const processSale = async (cardToken = null) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);

    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          unit_price: item.price,
          type: 'product'
        })),
        payment_method: paymentMethod,
        total_amount: getTotalAmount(),
        subtotal: getSubtotal(),
        tax_amount: getTaxAmount(),
        tax_rate: taxRate,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        card_token: cardToken, // For card payments
        tenant_id: tenantId || session?.user?.tenantId
      };

      // If offline, encrypt and queue the sale
      if (!navigator.onLine) {
        try {
          const encryptionKey = tenantId || session?.user?.tenantId || 'default-key';
          const encryptedSales = localStorage.getItem('pendingSales');
          
          let pendingSales = [];
          if (encryptedSales) {
            try {
              pendingSales = decryptFromStorage(encryptedSales, encryptionKey) || [];
            } catch (e) {
              console.error('Failed to decrypt pending sales:', e);
              pendingSales = [];
            }
          }
          
          const offlineSale = {
            ...saleData,
            timestamp: new Date().toISOString(),
            id: `offline_${Date.now()}`
          };
          
          pendingSales.push(offlineSale);
          
          // Encrypt before storing
          const encrypted = encryptForStorage(pendingSales, encryptionKey);
          localStorage.setItem('pendingSales', encrypted);
          
          logSecurityEvent('OFFLINE_SALE_QUEUED', {
            saleId: offlineSale.id,
            encrypted: true,
            amount: saleData.total_amount
          });
          
          toast.success('Sale saved offline. Will sync when online.');
          clearCart();
          setIsCartOpen(false);
          return;
        } catch (error) {
          console.error('Failed to save offline sale:', error);
          toast.error('Failed to save sale offline');
          return;
        }
      }

      const response = await fetch('/api/pos/complete-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Log successful sale
        logSecurityEvent('SALE_COMPLETED', {
          saleId: result.id,
          amount: getTotalAmount(),
          paymentMethod: paymentMethod,
          itemCount: cart.length,
          hasCardToken: !!cardToken
        });
        
        toast.success('Sale completed successfully!');
        
        // Prepare sale data for receipt
        setLastSaleData({
          ...result,
          items: cart,
          subtotal: getSubtotal().toFixed(2),
          tax_amount: getTaxAmount().toFixed(2),
          total_amount: getTotalAmount().toFixed(2),
          payment_method: paymentMethod,
          customer: null,
          currency: currencyCode,
          currencySymbol: currencySymbol,
          invoice_number: result.invoice_number || result.id
        });
        
        // Clear cart and show receipt dialog
        clearCart();
        setIsCartOpen(false);
        setShowReceiptDialog(true);
      } else {
        throw new Error('Failed to process sale');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      
      // Log sale failure
      logSecurityEvent('SALE_FAILED', {
        error: error.message,
        amount: getTotalAmount(),
        paymentMethod: paymentMethod,
        itemCount: cart.length
      });
      
      toast.error('Failed to process sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle card scan result
  const handleCardScanned = async (cardData) => {
    setShowCardScanner(false);
    
    if (cardData.token) {
      // Process payment with Stripe token
      setPaymentMethod('card');
      await processSale(cardData.token);
    } else {
      toast.error('Failed to process card');
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode) => {
    const product = products.find(p => p.sku === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name} to cart`);
    } else {
      toast.error('Product not found');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/mobile-login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline Indicator */}
      <OfflineIndicator isOnline={isOnline} />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900">Point of Sale</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/inventory/scan')}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <CameraIcon className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative p-2 rounded-lg bg-blue-600 text-white"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <MobileProductGrid
        products={filteredProducts}
        onAddToCart={addToCart}
        isLoading={isLoadingProducts}
        currencySymbol={currencySymbol}
      />

      {/* Cart Bottom Sheet */}
      <MobileCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        subtotal={getSubtotal()}
        tax={getTaxAmount()}
        total={getTotalAmount()}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onCheckout={() => {
          // Close cart when proceeding to checkout
          setIsCartOpen(false);
          
          if (paymentMethod === 'card') {
            // Small delay to allow cart animation to complete
            setTimeout(() => setShowCardScanner(true), 300);
          } else {
            processSale();
          }
        }}
        isProcessing={isProcessing}
        currencySymbol={currencySymbol}
      />

      {/* Card Scanner Modal */}
      {showCardScanner && (
        <CardScanner
          onCardScanned={handleCardScanned}
          onClose={() => setShowCardScanner(false)}
          amount={getTotalAmount()}
          currencyCode={currencyCode}
        />
      )}

      {/* Receipt Dialog - Mobile Optimized */}
      {showReceiptDialog && lastSaleData && (
        <MobileReceiptDialog
          isOpen={showReceiptDialog}
          onClose={() => setShowReceiptDialog(false)}
          saleData={lastSaleData}
          businessInfo={businessInfo}
          onReceiptHandled={() => {
            setShowReceiptDialog(false);
            setLastSaleData(null);
          }}
        />
      )}
    </div>
  );
}