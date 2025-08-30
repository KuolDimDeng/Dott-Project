'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { 
  MagnifyingGlassIcon,
  MapPinIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ConsumerDashboard() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [recentOrders, setRecentOrders] = useState([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState([]);

  // Business categories with icons
  const categories = [
    { id: 'food_dining', name: 'Food & Dining', icon: '🍽️', color: 'bg-orange-100' },
    { id: 'shopping_retail', name: 'Shopping', icon: '🛒', color: 'bg-blue-100' },
    { id: 'transport_logistics', name: 'Transport', icon: '🚗', color: 'bg-green-100' },
    { id: 'health_medical', name: 'Health', icon: '💊', color: 'bg-red-100' },
    { id: 'beauty_personal', name: 'Beauty', icon: '💇', color: 'bg-pink-100' },
    { id: 'services_repairs', name: 'Services', icon: '🔧', color: 'bg-gray-100' },
    { id: 'home_living', name: 'Home', icon: '🏠', color: 'bg-yellow-100' },
    { id: 'education_training', name: 'Education', icon: '📚', color: 'bg-indigo-100' },
    { id: 'events_entertainment', name: 'Events', icon: '🎉', color: 'bg-purple-100' },
    { id: 'professional_services', name: 'Professional', icon: '💼', color: 'bg-teal-100' },
    { id: 'other', name: 'Other', icon: '📦', color: 'bg-gray-100' },
  ];

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(coords);
          
          // Reverse geocode to get location name
          try {
            const response = await fetch(`/api/location/reverse-geocode`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(coords),
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              setLocationName(`${data.city}, ${data.country}`);
              
              // Save location to profile
              await updateConsumerLocation(coords, data.city, data.country);
            }
          } catch (error) {
            console.error('Error getting location name:', error);
            setLocationName('Location detected');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationName('Location unavailable');
        }
      );
    }
  }, []);

  // Load user data
  useEffect(() => {
    if (session?.user) {
      loadRecentOrders();
      loadFavoriteBusinesses();
    }
  }, [session]);

  const updateConsumerLocation = async (coords, city, country) => {
    try {
      await fetch('/api/consumer/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          city,
          country
        }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const response = await fetch('/api/consumer/recent-orders', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRecentOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const loadFavoriteBusinesses = async () => {
    try {
      const response = await fetch('/api/consumer/favorites', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFavoriteBusinesses(data.favorites || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleCategoryClick = (category) => {
    router.push(`/consumer/search?category=${category.id}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/consumer/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleChangeLocation = () => {
    // Open location picker modal
    toast('Location picker coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            {/* Location Bar */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleChangeLocation}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
              >
                <MapPinIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{locationName}</span>
                <span className="text-xs text-gray-500">Change</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/consumer/orders')}
                  className="relative p-2 text-gray-600 hover:text-blue-600"
                >
                  <ShoppingCartIcon className="w-6 h-6" />
                  {recentOrders.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {recentOrders.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => router.push('/consumer/chats')}
                  className="relative p-2 text-gray-600 hover:text-blue-600"
                >
                  <ChatBubbleLeftRightIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for businesses, products, or services..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user?.first_name || 'there'}!
          </h1>
          <p className="text-gray-600">What are you looking for today?</p>
        </div>

        {/* Categories Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Categories</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className={`${category.color} p-4 rounded-lg text-center hover:shadow-lg transition-shadow`}
              >
                <div className="text-3xl mb-2">{category.icon}</div>
                <div className="text-xs font-medium text-gray-700">{category.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Favorite Businesses */}
        {favoriteBusinesses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Favorites</h2>
              <button
                onClick={() => router.push('/consumer/favorites')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favoriteBusinesses.slice(0, 4).map((business) => (
                <div
                  key={business.id}
                  onClick={() => router.push(`/consumer/business/${business.id}`)}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <HeartIcon className="w-5 h-5 text-red-500 fill-current" />
                    <div className="flex items-center text-sm text-gray-600">
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="ml-1">{business.rating}</span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{business.name}</h3>
                  <p className="text-sm text-gray-600">{business.category}</p>
                  {business.is_open && (
                    <span className="text-xs text-green-600 mt-2 inline-block">Open now</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <button
                onClick={() => router.push('/consumer/orders')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {recentOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/consumer/orders/${order.id}`)}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{order.business_name}</h3>
                      <p className="text-sm text-gray-600">{order.items_count} items • ${order.total}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'delivered' 
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        <ClockIcon className="w-3 h-3 inline mr-1" />
                        {order.time_ago}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/consumer/near-me')}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <MapPinIcon className="w-5 h-5 mr-2" />
            <span>Near Me</span>
          </button>
          
          <button
            onClick={() => router.push('/consumer/deals')}
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
          >
            <StarIcon className="w-5 h-5 mr-2" />
            <span>Today's Deals</span>
          </button>
        </div>
      </div>
    </div>
  );
}