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

export default function MobilePOSPage() {
  const router = useRouter();
  const { session, loading } = useSession();
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

  // Fetch products
  useEffect(() => {
    if (session?.tenantId) {
      fetchProducts();
      fetchTaxRate();
    }
  }, [session]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      
      // Check cache first (offline support)
      const cachedProducts = localStorage.getItem('pos_products_cache');
      if (cachedProducts && !navigator.onLine) {
        const cached = JSON.parse(cachedProducts);
        setProducts(cached.products);
        setFilteredProducts(cached.products);
        setIsLoadingProducts(false);
        return;
      }

      const response = await fetch('/api/products', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const activeProducts = (data.products || []).filter(p => p.is_active !== false);
        
        setProducts(activeProducts);
        setFilteredProducts(activeProducts);
        
        // Cache for offline use
        localStorage.setItem('pos_products_cache', JSON.stringify({
          products: activeProducts,
          timestamp: Date.now()
        }));
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
        tenant_id: session.tenantId
      };

      // If offline, queue the sale
      if (!navigator.onLine) {
        const pendingSales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
        pendingSales.push({
          ...saleData,
          timestamp: new Date().toISOString(),
          id: `offline_${Date.now()}`
        });
        localStorage.setItem('pendingSales', JSON.stringify(pendingSales));
        
        toast.success('Sale saved offline. Will sync when online.');
        clearCart();
        setIsCartOpen(false);
        return;
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
        
        toast.success('Sale completed successfully!');
        clearCart();
        setIsCartOpen(false);
        
        // Show receipt or share options
        if (result.id) {
          router.push(`/pos/receipt/${result.id}`);
        }
      } else {
        throw new Error('Failed to process sale');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
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
          if (paymentMethod === 'card') {
            setShowCardScanner(true);
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
    </div>
  );
}