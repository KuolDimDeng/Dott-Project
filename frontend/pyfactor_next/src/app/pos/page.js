'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { PlusIcon, MinusIcon, TrashIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function POSPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  useEffect(() => {
    if (session?.tenantId) {
      fetchProducts();
    }
  }, [session]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products/${session.tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

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
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const processSale = async () => {
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
          subtotal: item.price * item.quantity
        })),
        payment_method: paymentMethod,
        total_amount: getTotalAmount(),
        tenant_id: session.tenantId
      };

      const response = await fetch('/api/pos/complete-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        toast.success('Sale completed successfully!');
        setCart([]);
        
        // Store in local storage for offline sync if needed
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SALE_COMPLETED',
            data: saleData
          });
        }
      } else {
        throw new Error('Failed to process sale');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      
      // Queue for offline sync
      if (!navigator.onLine) {
        const pendingSales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
        pendingSales.push({
          ...saleData,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pendingSales', JSON.stringify(pendingSales));
        
        toast.success('Sale saved offline. Will sync when online.');
        setCart([]);
      } else {
        toast.error('Failed to process sale');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Point of Sale</h1>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Products Section */}
        <div className="flex-1 p-4 lg:border-r lg:border-gray-200">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                  <span className="text-3xl">📦</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {product.name}
                </h3>
                <p className="text-lg font-semibold text-blue-600 mt-1">
                  ${product.price.toFixed(2)}
                </p>
                {product.stock_quantity !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    Stock: {product.stock_quantity}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96 bg-white p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cart</h2>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Cart is empty
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 ml-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        Subtotal: ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                ${getTotalAmount().toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <BanknotesIcon className="w-5 h-5 mr-2" />
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <CreditCardIcon className="w-5 h-5 mr-2" />
                Card
              </button>
            </div>

            <button
              onClick={processSale}
              disabled={cart.length === 0 || isProcessing}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                cart.length === 0 || isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}