import React, { createContext, useContext, useState, useEffect } from 'react';
import inventoryApi from '../services/inventoryApi';
import { useAuth } from './AuthContext';
import { useBusinessContext } from './BusinessContext';

const InventoryContext = createContext();

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryContext must be used within InventoryProvider');
  }
  return context;
};

export const InventoryProvider = ({ children }) => {
  const { user } = useAuth();
  const { businessData } = useBusinessContext();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load inventory products for the current business
  const loadProducts = async (forceRefresh = false) => {
    if (!user || !businessData?.businessType) {
      console.log('📦 [INVENTORY_CONTEXT] No user or business data available');
      return;
    }

    // Check if this is an inventory-based business
    const isInventoryBusiness = isInventoryBasedBusiness(businessData.businessType);
    if (!isInventoryBusiness) {
      console.log('📦 [INVENTORY_CONTEXT] Not an inventory-based business');
      return;
    }

    // Skip if recently loaded and not forcing refresh
    if (!forceRefresh && lastUpdated && Date.now() - lastUpdated < 30000) {
      console.log('📦 [INVENTORY_CONTEXT] Using cached products');
      return;
    }

    try {
      setLoading(true);
      console.log('📦 [INVENTORY_CONTEXT] Loading products for inventory business');

      const response = await inventoryApi.getProducts();
      console.log('📦 [INVENTORY_CONTEXT] Raw response:', response);

      // Handle different response formats
      let productsData = [];
      if (Array.isArray(response)) {
        productsData = response;
      } else if (response && Array.isArray(response.results)) {
        productsData = response.results;
      } else if (response && Array.isArray(response.products)) {
        productsData = response.products;
      } else if (response && Array.isArray(response.data)) {
        productsData = response.data;
      }

      // Filter active products only
      const activeProducts = productsData.filter(product => product.is_active !== false);

      setProducts(activeProducts);
      setLastUpdated(Date.now());

      // Extract unique categories
      const uniqueCategories = [...new Set(
        activeProducts
          .map(product => product.category)
          .filter(category => category && category.trim())
      )];
      setCategories(uniqueCategories);

      console.log(`📦 [INVENTORY_CONTEXT] Loaded ${activeProducts.length} active products, ${uniqueCategories.length} categories`);
    } catch (error) {
      console.error('📦 [INVENTORY_CONTEXT] Error loading products:', error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Get available products (those with stock)
  const getAvailableProducts = () => {
    return products.filter(product =>
      product.quantity > 0 && product.is_active !== false
    );
  };

  // Get products by category
  const getProductsByCategory = (category) => {
    if (!category || category === 'all') {
      return getAvailableProducts();
    }
    return getAvailableProducts().filter(product =>
      product.category === category
    );
  };

  // Search products
  const searchProducts = (query) => {
    if (!query || !query.trim()) {
      return getAvailableProducts();
    }

    const searchTerm = query.toLowerCase().trim();
    return getAvailableProducts().filter(product =>
      product.name?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.sku?.toLowerCase().includes(searchTerm)
    );
  };

  // Check if business type uses inventory
  const isInventoryBasedBusiness = (businessType) => {
    if (!businessType) return false;

    const inventoryBusinessTypes = [
      'RETAIL_SHOP',
      'BEAUTY_SALON',
      'GROCERY_MARKET',
      'PHARMACY',
      'HARDWARE_STORE',
      'CLOTHING_STORE',
      'ELECTRONICS_STORE',
      'BOOKSTORE',
      'PET_STORE',
      'SPORTING_GOODS',
      'JEWELRY_STORE',
      'FURNITURE_STORE'
    ];

    return inventoryBusinessTypes.some(type =>
      businessType.toUpperCase().includes(type) ||
      businessType.toUpperCase().includes('RETAIL') ||
      businessType.toUpperCase().includes('SHOP') ||
      businessType.toUpperCase().includes('STORE') ||
      businessType.toUpperCase().includes('MARKET') ||
      businessType.toUpperCase().includes('BEAUTY') ||
      businessType.toUpperCase().includes('GROCERY')
    );
  };

  // Update product quantity (for POS sales)
  const updateProductQuantity = async (productId, newQuantity) => {
    try {
      // Update local state immediately for better UX
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === productId
            ? { ...product, quantity: newQuantity }
            : product
        )
      );

      // TODO: Make API call to update product quantity in backend
      // await inventoryApi.updateProduct(productId, { quantity: newQuantity });

      console.log(`📦 [INVENTORY_CONTEXT] Updated product ${productId} quantity to ${newQuantity}`);
    } catch (error) {
      console.error('📦 [INVENTORY_CONTEXT] Error updating product quantity:', error);
      // Reload products to sync with backend state
      loadProducts(true);
    }
  };

  // Refresh products from server
  const refreshProducts = () => {
    return loadProducts(true);
  };

  // Load products when business data changes
  useEffect(() => {
    if (businessData?.businessType) {
      console.log('📦 [INVENTORY_CONTEXT] Business type changed:', businessData.businessType);
      loadProducts();
    }
  }, [businessData?.businessType]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isInventoryBasedBusiness(businessData?.businessType)) {
        loadProducts();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [businessData?.businessType]);

  const value = {
    // Data
    products,
    categories,
    loading,
    lastUpdated,

    // Methods
    loadProducts,
    getAvailableProducts,
    getProductsByCategory,
    searchProducts,
    updateProductQuantity,
    refreshProducts,
    isInventoryBasedBusiness: () => isInventoryBasedBusiness(businessData?.businessType),

    // Helper methods
    getProductById: (id) => products.find(p => p.id === id),
    getLowStockProducts: () => products.filter(p => p.quantity <= (p.reorder_level || 5)),
    getTotalProductsCount: () => products.length,
    getAvailableProductsCount: () => getAvailableProducts().length,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export default InventoryContext;