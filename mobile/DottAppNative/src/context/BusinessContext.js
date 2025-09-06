import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBusinessTypeConfig } from '../utils/businessTypeConfig';
import { getInventoryConfig, getInventoryMenuLabel, shouldShowInventory } from '../utils/inventoryConfig';

const BusinessContext = createContext();

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within BusinessProvider');
  }
  return context;
};

export const BusinessProvider = ({ children }) => {
  const [businessData, setBusinessData] = useState({
    businessType: null,
    businessName: null,
    entityType: null,
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

  // Load business data from storage on mount
  useEffect(() => {
    loadBusinessData();
  }, []);

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
        setBusinessData(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading business data:', error);
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
    if (!businessConfig) return false;
    return businessConfig.features[feature] === true;
  };

  const getMenuItems = () => {
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
    
    // Actions
    setBusinessInfo,
    toggleBusinessMode,
    toggleOnlineStatus,
    addActiveOrder,
    removeActiveOrder,
    updateStats,
    clearBusinessData,
    
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