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
        
        // Update business location data
        if (profileResponse.business_city) {
          businessUpdates.businessCity = profileResponse.business_city;
        }
        if (profileResponse.business_country) {
          businessUpdates.businessCountry = profileResponse.business_country;
        }
        if (profileResponse.business_country_name) {
          businessUpdates.businessCountryName = profileResponse.business_country_name;
        }
        
        // Update currency preferences
        if (profileResponse.preferred_currency_code || profileResponse.preferred_currency_symbol) {
          businessUpdates.preferredCurrency = {
            code: profileResponse.preferred_currency_code || null,
            symbol: profileResponse.preferred_currency_symbol || null,
            name: profileResponse.preferred_currency_name || null,
          };
        }
        
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
    // First use dynamic menu items from API if available
    if (dynamicMenuItems && dynamicMenuItems.length > 0) {
      // Map API menu items to include title from label
      return dynamicMenuItems.map(item => ({
        ...item,
        title: item.label || item.title
      }));
    }
    
    // Fallback to config-based menu items
    if (!businessConfig) return [];
    return businessConfig.menuItems || [];
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