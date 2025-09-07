import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBusinessTypeConfig } from '../utils/businessTypeConfig';
import { getInventoryConfig, getInventoryMenuLabel, shouldShowInventory } from '../utils/inventoryConfig';
import { userApi } from '../services/userApi';
import { useAuth } from './AuthContext';

const BusinessContext = createContext();

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within BusinessProvider');
  }
  return context;
};

export const BusinessProvider = ({ children }) => {
  const { user } = useAuth();
  const [businessData, setBusinessData] = useState({
    businessType: null,
    businessName: null,
    entityType: null,
    businessCity: null,
    businessCountry: null,
    businessCountryName: null,
    preferredCurrency: {
      code: null,
      symbol: null,
      name: null,
    },
    isBusinessMode: false,
    isOnline: false,
    activeOrders: [],
    todayStats: {
      earnings: 0,
      jobs: 0,
      hours: 0,
    },
    weekStats: {
      earnings: 0,
      jobs: 0,
      hours: 0,
    },
  });

  const [businessConfig, setBusinessConfig] = useState(null);
  const [inventoryConfig, setInventoryConfig] = useState(null);
  const [dynamicMenuItems, setDynamicMenuItems] = useState(null);
  const [dynamicFeatures, setDynamicFeatures] = useState(null);

  // Load business data from storage on mount
  useEffect(() => {
    loadBusinessData();
    fetchBusinessFeatures();
  }, []);

  // Sync business name when user data changes
  useEffect(() => {
    if (user?.business_name && !businessData.businessName) {
      updateBusinessData({ businessName: user.business_name });
    }
  }, [user?.business_name]);

  // Update config when business type changes
  useEffect(() => {
    if (businessData.businessType) {
      const config = getBusinessTypeConfig(businessData.businessType);
      const invConfig = getInventoryConfig(businessData.businessType);
      setBusinessConfig(config);
      setInventoryConfig(invConfig);
    }
  }, [businessData.businessType]);

  const loadBusinessData = async () => {
    try {
      const stored = await AsyncStorage.getItem('businessData');
      if (stored) {
        const data = JSON.parse(stored);
        // Also check if user has business_name from API
        if (!data.businessName && user?.business_name) {
          data.businessName = user.business_name;
        }
        setBusinessData(prev => ({ ...prev, ...data }));
      } else if (user?.business_name) {
        // If no stored data but user has business_name, use it
        setBusinessData(prev => ({ ...prev, businessName: user.business_name }));
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    }
  };

  const fetchBusinessFeatures = async () => {
    try {
      console.log('Fetching business features from API...');
      const response = await userApi.getUserBusinessStatus();
      
      if (response) {
        // Update business data with API response
        if (response.business_name) {
          updateBusinessData({ businessName: response.business_name });
        }
        if (response.business_type) {
          updateBusinessData({ businessType: response.business_type });
        }
        
        // Store dynamic features and menu items
        setDynamicFeatures(response.features || []);
        setDynamicMenuItems(response.menu_items || []);
        
        // Cache in AsyncStorage
        await AsyncStorage.setItem('businessFeatures', JSON.stringify(response));
        
        console.log('Business features loaded:', response);
      }

      // Also fetch complete user profile for location and currency data
      console.log('Fetching complete user profile for business details...');
      const profileResponse = await userApi.getCurrentUser();
      
      if (profileResponse) {
        const businessUpdates = {};
        
        // Update business location data - try business fields first, then fall back to user profile
        if (profileResponse.business_city) {
          businessUpdates.businessCity = profileResponse.business_city;
        }
        if (profileResponse.business_country || profileResponse.country) {
          businessUpdates.businessCountry = profileResponse.business_country || profileResponse.country;
        }
        if (profileResponse.business_country_name || profileResponse.country_name) {
          businessUpdates.businessCountryName = profileResponse.business_country_name || profileResponse.country_name;
        }
        
        // Update currency preferences - try business fields first, then use defaults
        const currencyCode = profileResponse.preferred_currency_code || 
                           (profileResponse.country === 'SS' ? 'SSP' : 'USD');
        const currencySymbol = profileResponse.preferred_currency_symbol || 
                              (profileResponse.country === 'SS' ? 'SSP' : '$');
        
        businessUpdates.preferredCurrency = {
          code: currencyCode,
          symbol: currencySymbol,
          name: profileResponse.preferred_currency_name || null,
        };
        
        // Also sync business name if not already set
        if (profileResponse.business_name && !businessData.businessName) {
          businessUpdates.businessName = profileResponse.business_name;
        }
        
        if (Object.keys(businessUpdates).length > 0) {
          updateBusinessData(businessUpdates);
          console.log('Business profile data updated:', businessUpdates);
        }
      }
    } catch (error) {
      console.error('Error fetching business features:', error);
      
      // Try to load from cache
      try {
        const cached = await AsyncStorage.getItem('businessFeatures');
        if (cached) {
          const data = JSON.parse(cached);
          setDynamicFeatures(data.features || []);
          setDynamicMenuItems(data.menu_items || []);
          console.log('Loaded business features from cache');
        }
      } catch (cacheError) {
        console.error('Error loading cached features:', cacheError);
      }
    }
  };

  const saveBusinessData = async (data) => {
    try {
      await AsyncStorage.setItem('businessData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving business data:', error);
    }
  };

  const updateBusinessData = (updates) => {
    const newData = { ...businessData, ...updates };
    setBusinessData(newData);
    saveBusinessData(newData);
  };

  const toggleBusinessMode = () => {
    const newMode = !businessData.isBusinessMode;
    updateBusinessData({ isBusinessMode: newMode });
    return newMode;
  };

  const toggleOnlineStatus = () => {
    const newStatus = !businessData.isOnline;
    updateBusinessData({ isOnline: newStatus });
    return newStatus;
  };

  const setBusinessInfo = (info) => {
    updateBusinessData({
      businessType: info.businessType,
      businessName: info.businessName,
      entityType: info.entityType,
    });
  };

  const addActiveOrder = (order) => {
    const newOrders = [...businessData.activeOrders, order];
    updateBusinessData({ activeOrders: newOrders });
  };

  const removeActiveOrder = (orderId) => {
    const newOrders = businessData.activeOrders.filter(o => o.id !== orderId);
    updateBusinessData({ activeOrders: newOrders });
  };

  const updateStats = (type, updates) => {
    const statsKey = type === 'today' ? 'todayStats' : 'weekStats';
    const newStats = { ...businessData[statsKey], ...updates };
    updateBusinessData({ [statsKey]: newStats });
  };

  const clearBusinessData = async () => {
    await AsyncStorage.removeItem('businessData');
    setBusinessData({
      businessType: null,
      businessName: null,
      entityType: null,
      businessCity: null,
      businessCountry: null,
      businessCountryName: null,
      preferredCurrency: {
        code: null,
        symbol: null,
        name: null,
      },
      isBusinessMode: false,
      isOnline: false,
      activeOrders: [],
      todayStats: {
        earnings: 0,
        jobs: 0,
        hours: 0,
      },
      weekStats: {
        earnings: 0,
        jobs: 0,
        hours: 0,
      },
    });
    setBusinessConfig(null);
  };

  const hasFeature = (feature) => {
    // First check dynamic features from API
    if (dynamicFeatures && dynamicFeatures.includes(feature)) {
      return true;
    }
    
    // Fallback to config-based features
    if (!businessConfig) return false;
    return businessConfig.features[feature] === true;
  };

  const getMenuItems = () => {
    console.log('🔍 === getMenuItems CALLED (UPDATED) ===');
    console.log('🔍 businessData.businessName:', businessData?.businessName);
    console.log('🔍 businessData.businessType:', businessData?.businessType);
    console.log('🔍 dynamicMenuItems length:', dynamicMenuItems?.length || 0);
    console.log('🔍 dynamicFeatures:', dynamicFeatures);
    console.log('🔍 businessConfig exists:', !!businessConfig);
    
    let menuItems = [];
    
    // First use dynamic menu items from API if available
    if (dynamicMenuItems && dynamicMenuItems.length > 0) {
      console.log('🔍 Using dynamic menu items from API');
      // Map API menu items to include title from label
      menuItems = dynamicMenuItems.map(item => ({
        ...item,
        title: item.label || item.title
      }));
    } else {
      console.log('🔍 Using config-based menu items');
      // Fallback to config-based menu items
      if (businessConfig && businessConfig.menuItems) {
        menuItems = businessConfig.menuItems;
      }
    }
    
    // FORCE: Always use restaurant menu items for any Dott Restaurant business regardless of API response
    const currentBusinessName = businessData.businessName || '';
    console.log('🔍 Current Business Name:', currentBusinessName);
    
    if (currentBusinessName && (currentBusinessName.toLowerCase().includes('dott restaurant') || currentBusinessName.toLowerCase().includes('restaurant'))) {
      console.log('🍽️ FORCE: Detected restaurant business - Using restaurant menu items');
      console.log('🍽️ FORCE: Business Name:', currentBusinessName);
      // Override with proper restaurant menu items
      menuItems = [
        { id: 'orders', label: 'Orders', title: 'Orders', icon: 'restaurant-outline', screen: 'Orders' },
        { id: 'pos', label: 'POS', title: 'POS', icon: 'card-outline', screen: 'POS' },
        { id: 'tables', label: 'Tables', title: 'Tables', icon: 'grid-outline', screen: 'Tables' },
        { id: 'delivery', label: 'Delivery', title: 'Delivery', icon: 'bicycle-outline', screen: 'Delivery' },
        { id: 'inventory', label: 'Inventory', title: 'Inventory', icon: 'cube-outline', screen: 'Inventory' },
        { id: 'menu', label: 'Menu', title: 'Menu', icon: 'list-outline', screen: 'MenuManagement', subtitle: 'Manage menu items and pricing' }
      ];
      console.log('🍽️ FORCE: Restaurant menu items set - Orders, POS, Tables, Delivery, Inventory, Menu');
      console.log('🍽️ FORCE: Menu item details:', menuItems.find(item => item.id === 'menu'));
      return menuItems;
    }
    
    // Always ensure restaurants have Menu option - Enhanced detection
    const businessName = businessData.businessName?.toLowerCase() || '';
    const businessType = businessData.businessType?.toLowerCase() || '';
    
    console.log('🔍 Business Name (lowercase):', businessName);
    console.log('🔍 Business Type (lowercase):', businessType);
    
    const isRestaurant = businessData.businessType === 'RESTAURANT_CAFE' || 
                        businessType.includes('restaurant') ||
                        businessName.includes('restaurant') ||
                        businessName.includes('cafe') ||
                        businessName.includes('diner') ||
                        businessName.includes('bistro') ||
                        businessName.includes('eatery') ||
                        businessName.includes('grill') ||
                        businessName.includes('kitchen');
    
    console.log('🔍 Is Restaurant?', isRestaurant);
    
    if (isRestaurant) {
      console.log('🍽️ Restaurant detected! Business Name:', businessData.businessName);
      console.log('🍽️ Business Type:', businessData.businessType);
      console.log('🍽️ Current menu items:', menuItems.length);
      
      // Check if Menu item already exists
      const hasMenuOption = menuItems.some(item => 
        item.id === 'menu' || 
        item.screen === 'MenuManagement' ||
        item.label?.toLowerCase().includes('menu')
      );
      
      console.log('🍽️ Has Menu option already:', hasMenuOption);
      
      if (!hasMenuOption) {
        // Add Menu option for restaurants
        const menuOption = {
          id: 'menu',
          label: 'Menu',
          title: 'Menu',
          icon: 'list-outline',
          screen: 'MenuManagement',
          subtitle: 'Manage menu items and pricing'
        };
        menuItems.push(menuOption);
        console.log('🍽️ Added Menu option:', menuOption);
        console.log('🍽️ Final menu items count:', menuItems.length);
      }
    } else {
      console.log('❌ Not detected as restaurant');
    }
    
    return menuItems;
  };

  const getNavigationMode = () => {
    if (!businessConfig) return null;
    return businessConfig.navigationMode;
  };

  // Inventory-specific helpers
  const getInventoryTerminology = () => {
    if (!inventoryConfig) return { menuLabel: 'Inventory', itemSingular: 'Item', itemPlural: 'Items' };
    return {
      menuLabel: inventoryConfig.menuLabel || 'Inventory',
      itemSingular: inventoryConfig.itemSingular || 'Item',
      itemPlural: inventoryConfig.itemPlural || 'Items',
    };
  };

  const shouldShowInventoryMenu = () => {
    return inventoryConfig?.enabled && inventoryConfig?.showInMenu;
  };

  const getInventoryCategories = () => {
    return inventoryConfig?.categories || ['General'];
  };

  const getInventoryFeatures = () => {
    return inventoryConfig?.features || {};
  };

  const value = {
    // State
    businessData,
    businessConfig,
    inventoryConfig,
    dynamicMenuItems,
    dynamicFeatures,
    
    // Actions
    setBusinessInfo,
    toggleBusinessMode,
    toggleOnlineStatus,
    addActiveOrder,
    removeActiveOrder,
    updateStats,
    clearBusinessData,
    fetchBusinessFeatures,
    
    // Helpers
    hasFeature,
    getMenuItems,
    getNavigationMode,
    isBusinessMode: businessData.isBusinessMode,
    isOnline: businessData.isOnline,
    
    // Inventory Helpers
    getInventoryTerminology,
    shouldShowInventoryMenu,
    getInventoryCategories,
    getInventoryFeatures,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};