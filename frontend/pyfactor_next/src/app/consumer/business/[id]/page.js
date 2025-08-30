'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  GlobeAltIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ShareIcon,
  ShoppingCartIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useSession } from '@/hooks/useSession-v2';
import ChatInterface from '@/components/chat/ChatInterface';
import toast from 'react-hot-toast';

export default function BusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useSession();
  const businessId = params?.id;

  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (businessId) {
      loadBusinessProfile();
      loadProducts();
      checkFavoriteStatus();
    }
  }, [businessId]);

  const loadBusinessProfile = async () => {
    try {
      const response = await fetch(`/api/marketplace/business/${businessId}/public`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBusiness(data);
      } else if (response.status === 403) {
        // Business doesn't deliver to user's location
        const error = await response.json();
        toast.error(error.error || "This business doesn't deliver to your location");
        router.push('/consumer/dashboard');
      } else {
        toast.error('Failed to load business profile');
      }
    } catch (error) {
      console.error('Error loading business:', error);
      toast.error('Failed to load business profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`/api/marketplace/business/${businessId}/products`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/consumer/favorites/check/${businessId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.is_favorite);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const response = await fetch(`/api/consumer/favorites/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ business_id: businessId })
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const startChat = async () => {
    try {
      const response = await fetch('/api/chat/conversations/start_conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          business_id: businessId,
          message: `Hi! I'm interested in your products/services.`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
        setShowChat(true);
      } else {
        toast.error('Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    toast.success(`${product.name} added to cart`);
    setShowCart(true);
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item => 
        item.id === productId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const processOrder = async () => {
    if (cart.length === 0) return;

    try {
      const orderData = {
        business_id: businessId,
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: calculateCartTotal(),
        payment_method: 'cash' // Will be selectable later
      };

      const response = await fetch('/api/consumer/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Order placed successfully!');
        setCart([]);
        setShowCart(false);
        router.push(`/consumer/orders/${data.order_id}`);
      } else {
        toast.error('Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Business not found</h2>
          <button
            onClick={() => router.push('/consumer/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleFavorite}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isFavorite ? (
                  <HeartSolidIcon className="w-6 h-6 text-red-500" />
                ) : (
                  <HeartIcon className="w-6 h-6 text-gray-600" />
                )}
              </button>
              
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <ShareIcon className="w-6 h-6 text-gray-600" />
              </button>
              
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 hover:bg-gray-100 rounded-lg"
              >
                <ShoppingCartIcon className="w-6 h-6 text-gray-600" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {business.business_name}
              </h1>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <StarIcon className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="ml-1 font-medium">{business.average_rating || 0}</span>
                  <span className="ml-1">({business.total_reviews || 0} reviews)</span>
                </div>
                
                <div className="flex items-center">
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  {business.city}, {business.country}
                </div>
                
                {business.is_open_now ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Open now
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <XCircleIcon className="w-4 h-4 mr-1" />
                    Closed
                  </div>
                )}
              </div>

              <p className="text-gray-700 mb-4">
                {business.description || 'Welcome to our business! Browse our products and services below.'}
              </p>

              {/* Delivery Info */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <TruckIcon className="w-5 h-5 text-gray-500 mr-2" />
                  <span>
                    {business.delivery_scope === 'local' && `Delivers within ${business.delivery_radius_km}km`}
                    {business.delivery_scope === 'national' && 'Nationwide delivery'}
                    {business.delivery_scope === 'international' && 'International shipping'}
                    {business.delivery_scope === 'digital' && 'Digital service'}
                  </span>
                </div>
                
                {business.average_response_time && (
                  <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 text-gray-500 mr-2" />
                    <span>Responds in ~{business.average_response_time} min</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 ml-6">
              <button
                onClick={startChat}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                Message
              </button>
              
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <PhoneIcon className="w-5 h-5 mr-2" />
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['products', 'services', 'reviews', 'about'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'products' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                )}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 mb-1 text-sm">{product.name}</h3>
                  <p className="text-lg font-bold text-blue-600 mb-2">${product.price}</p>
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
            
            {products.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No products available
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="text-center py-12 text-gray-500">
              Reviews coming soon
            </div>
          </div>
        )}
        
        {activeTab === 'about' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">About {business.business_name}</h2>
            <div className="space-y-3 text-gray-700">
              {business.website && (
                <div className="flex items-center">
                  <GlobeAltIcon className="w-5 h-5 mr-3 text-gray-500" />
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {business.website}
                  </a>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center">
                  <PhoneIcon className="w-5 h-5 mr-3 text-gray-500" />
                  <span>{business.phone}</span>
                </div>
              )}
              <div className="flex items-center">
                <MapPinIcon className="w-5 h-5 mr-3 text-gray-500" />
                <span>{business.address || `${business.city}, ${business.country}`}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold mb-4">
                    <span>Total:</span>
                    <span>${calculateCartTotal().toFixed(2)}</span>
                  </div>
                  
                  <button
                    onClick={processOrder}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Place Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {showChat && conversationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl h-[600px]">
            <ChatInterface
              conversationId={conversationId}
              recipientInfo={business}
              mode="consumer"
              onClose={() => setShowChat(false)}
              onCreateOrder={(items) => {
                items.forEach(item => addToCart(item));
                setShowChat(false);
                setShowCart(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}