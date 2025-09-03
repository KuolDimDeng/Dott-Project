'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  MapPinIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  TruckIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useSession } from '@/hooks/useSession-v2';
import { getBusinessTypeDisplay } from '@/utils/businessTypeMapping';
import toast from 'react-hot-toast';

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    deliveryScope: 'all',
    minRating: 0,
    maxDistance: 50,
    isOpenNow: false,
    sortBy: 'relevance' // relevance, rating, distance, popularity
  });

  // Categories
  const categories = [
    { id: '', name: 'All Categories' },
    { id: 'food_dining', name: '🍽️ Food & Dining' },
    { id: 'shopping_retail', name: '🛒 Shopping' },
    { id: 'transport_logistics', name: '🚗 Transport' },
    { id: 'health_medical', name: '💊 Health' },
    { id: 'beauty_personal', name: '💇 Beauty' },
    { id: 'services_repairs', name: '🔧 Services' },
    { id: 'home_living', name: '🏠 Home' },
    { id: 'education_training', name: '📚 Education' },
    { id: 'professional_services', name: '💼 Professional' },
    { id: 'other', name: '📦 Other' }
  ];

  useEffect(() => {
    performSearch();
  }, [searchQuery, selectedCategory, filters]);

  const performSearch = async () => {
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: selectedCategory,
        delivery_scope: filters.deliveryScope,
        min_rating: filters.minRating,
        max_distance: filters.maxDistance,
        is_open_now: filters.isOpenNow,
        sort_by: filters.sortBy
      });

      const response = await fetch(`/api/consumer/search?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.results || []);
      } else {
        toast.error('Failed to search businesses');
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };

  const handleBusinessClick = (businessId) => {
    router.push(`/consumer/business/${businessId}`);
  };

  const applyFilters = () => {
    setShowFilters(false);
    performSearch();
  };

  const resetFilters = () => {
    setFilters({
      deliveryScope: 'all',
      minRating: 0,
      maxDistance: 50,
      isOpenNow: false,
      sortBy: 'relevance'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search businesses, products, or services..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
                Filters
                {Object.values(filters).some(v => v !== 'all' && v !== 0 && v !== 50 && v !== false && v !== 'relevance') && (
                  <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    •
                  </span>
                )}
              </button>
            </form>

            {/* Category Pills */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Sidebar */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating">Rating</option>
                  <option value="distance">Distance</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>

              {/* Delivery Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Type
                </label>
                <select
                  value={filters.deliveryScope}
                  onChange={(e) => setFilters({ ...filters, deliveryScope: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All</option>
                  <option value="local">Local Delivery</option>
                  <option value="national">Nationwide</option>
                  <option value="international">International</option>
                  <option value="digital">Digital/Online</option>
                </select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilters({ ...filters, minRating: rating })}
                      className={`px-3 py-1 rounded ${
                        filters.minRating === rating
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Distance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Distance: {filters.maxDistance}km
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={filters.maxDistance}
                  onChange={(e) => setFilters({ ...filters, maxDistance: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Open Now */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isOpenNow}
                    onChange={(e) => setFilters({ ...filters, isOpenNow: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Open Now</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={applyFilters}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Results Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isLoading ? 'Searching...' : `${businesses.length} businesses found`}
          </h2>
          {(searchQuery || selectedCategory) && (
            <p className="text-sm text-gray-600">
              {searchQuery && `Searching for "${searchQuery}"`}
              {searchQuery && selectedCategory && ' in '}
              {selectedCategory && categories.find(c => c.id === selectedCategory)?.name}
            </p>
          )}
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((business) => (
              <div
                key={business.id}
                onClick={() => handleBusinessClick(business.id)}
                className="bg-white rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow"
              >
                {business.image_url && (
                  <img
                    src={business.image_url}
                    alt={business.business_name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {business.business_name}
                    </h3>
                    {business.is_verified && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {business.business_type_display || getBusinessTypeDisplay(business.business_type)}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <StarSolidIcon className="w-4 h-4 text-yellow-500" />
                      <span className="ml-1 font-medium">{business.average_rating || 0}</span>
                      <span className="ml-1 text-gray-500">({business.total_reviews})</span>
                    </div>
                    
                    {business.distance_km && (
                      <div className="flex items-center text-gray-500">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        {business.distance_km.toFixed(1)}km
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center text-xs text-gray-500">
                      <TruckIcon className="w-4 h-4 mr-1" />
                      {business.delivery_scope === 'local' && 'Local'}
                      {business.delivery_scope === 'national' && 'Nationwide'}
                      {business.delivery_scope === 'international' && 'International'}
                      {business.delivery_scope === 'digital' && 'Online'}
                    </div>
                    
                    {business.is_open_now ? (
                      <span className="text-xs text-green-600 font-medium">Open</span>
                    ) : (
                      <span className="text-xs text-red-600 font-medium">Closed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}