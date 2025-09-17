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
      console.log('🔄 Fetching business features from API...');
      const response = await userApi.getUserBusinessStatus();

      if (response) {
        console.log('📦 Business features API response:', response);

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

        console.log('✅ Business features loaded successfully');
        console.log('📋 Menu items from API:', response.menu_items?.length || 0);
        console.log('🎯 Business type from API:', response.business_type);
        console.log('🏢 Business name from API:', response.business_name);
        console.log('🔧 Features from API:', response.features);
      } else {
        console.log('⚠️ No response from business features API');
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
        
        // Set business type based on business name if not already set
        if (profileResponse.business_name && profileResponse.business_name.toLowerCase().includes('restaurant')) {
          businessUpdates.businessType = 'RESTAURANT_CAFE';
          console.log('🍽️ Setting business type to RESTAURANT_CAFE based on name');
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

  // Add refresh function for menu items
  const refreshMenuItems = () => {
    // Just trigger a re-render by updating a state
    setBusinessData(prev => ({ ...prev, lastUpdate: Date.now() }));
  };

  const getMenuItems = async () => {
    console.log('🔍 === getMenuItems CALLED (UPDATED) ===');
    console.log('🔍 businessData.businessName:', businessData?.businessName);
    console.log('🔍 businessData.businessType:', businessData?.businessType);
    console.log('🔍 dynamicMenuItems length:', dynamicMenuItems?.length || 0);
    console.log('🔍 dynamicFeatures:', dynamicFeatures);
    console.log('🔍 businessConfig exists:', !!businessConfig);
    
    let menuItems = [];
    
    // Load purchased features
    let purchasedFeatures = [];
    try {
      const savedFeatures = await AsyncStorage.getItem(`selectedFeatures_${user?.id}`);
      if (savedFeatures) {
        purchasedFeatures = JSON.parse(savedFeatures);
        console.log('🔍 Loaded purchased features:', purchasedFeatures);
      }
    } catch (error) {
      console.error('Failed to load purchased features:', error);
    }
    
    // First use dynamic menu items from API if available
    if (dynamicMenuItems && dynamicMenuItems.length > 0) {
      console.log('🔍 Using dynamic menu items from API');
      // Map API menu items to include title from label
      menuItems = dynamicMenuItems.map(item => ({
        ...item,
        title: item.label || item.title,
        // Ensure screen property is present
        screen: item.screen || 'ComingSoon'
      }));
    } else {
      console.log('🔍 No dynamic menu items from API, will build based on business type');
      menuItems = [];
    }
    
    // Check if business type is restaurant
    const currentBusinessName = businessData.businessName || '';
    console.log('🔍 Current Business Name:', currentBusinessName);
    console.log('🔍 Business Type from data:', businessData.businessType);
    
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
      console.log('🍽️ Current menu items before filtering:', menuItems.length);
      
      // Filter out Timesheets and other unwanted items for restaurants
      const restaurantExcludedItems = ['timesheet', 'timesheets', 'expenses', 'invoices', 'reports', 'banking'];
      menuItems = menuItems.filter(item => {
        const itemLabel = (item.label || item.title || '').toLowerCase();
        const itemId = (item.id || '').toLowerCase();
        const itemScreen = (item.screen || '').toLowerCase();
        
        const shouldExclude = restaurantExcludedItems.some(excluded => 
          itemLabel.includes(excluded) || 
          itemId.includes(excluded) ||
          itemScreen.includes(excluded)
        );
        
        if (shouldExclude) {
          console.log('🚫 Filtering out item for restaurant:', item.label || item.title);
        }
        
        return !shouldExclude;
      });
      
      console.log('🍽️ Menu items after filtering:', menuItems.length);
      
      // Change "Employees" to "Staff" for restaurants
      menuItems = menuItems.map(item => {
        if (item.id === 'employees' || 
            item.label?.toLowerCase() === 'employees' || 
            item.screen === 'Employees' ||
            item.screen === 'EmployeesScreen') {
          return {
            ...item,
            label: 'Staff',
            title: 'Staff',
            subtitle: 'Manage your staff members'
          };
        }
        return item;
      });
      
      // Check if Orders item already exists
      const hasOrdersOption = menuItems.some(item => 
        item.id === 'orders' || 
        item.screen === 'Orders' ||
        item.label?.toLowerCase() === 'orders'
      );
      
      console.log('🍽️ Has Orders option already:', hasOrdersOption);
      
      if (!hasOrdersOption) {
        // Add Orders option for restaurants
        const ordersOption = {
          id: 'orders',
          label: 'Orders',
          title: 'Orders',
          icon: 'receipt-outline',
          screen: 'Orders',
          subtitle: 'Manage customer orders'
        };
        menuItems.push(ordersOption);
        console.log('🍽️ Added Orders option:', ordersOption);
      }
      
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
      }
    } else {
      console.log('❌ Not detected as restaurant');
    }

    // Check if business is a courier business and add courier-specific options
    const isCourierBusiness = businessData.businessType === 'SERVICE' &&
                             (businessName.includes('courier') ||
                              businessName.includes('delivery') ||
                              businessName.includes('transport') ||
                              businessType.includes('transport') ||
                              businessType.includes('courier'));

    console.log('🚚 Is Courier Business?', isCourierBusiness);
    console.log('🚚 Business Name contains courier/delivery:', businessName.includes('courier') || businessName.includes('delivery'));

    if (isCourierBusiness) {
      console.log('🚚 Courier business detected! Adding courier-specific options');

      // Check if CourierDeliveries item already exists
      const hasCourierOption = menuItems.some(item =>
        item.id === 'courier' ||
        item.screen === 'CourierDeliveries' ||
        item.label?.toLowerCase().includes('courier')
      );

      if (!hasCourierOption) {
        // Add Courier Deliveries option for courier businesses
        const courierOption = {
          id: 'courier',
          label: 'Deliveries',
          title: 'Courier Deliveries',
          icon: 'bicycle-outline',
          screen: 'CourierDeliveries',
          subtitle: 'Manage delivery requests and earnings'
        };
        menuItems.unshift(courierOption); // Add at the beginning as it's the main feature
        console.log('🚚 Added Courier Deliveries option:', courierOption);
      }

      // Check if Transport/Vehicle management exists
      const hasTransportOption = menuItems.some(item =>
        item.id === 'transport' ||
        item.screen === 'Transport' ||
        item.label?.toLowerCase().includes('transport')
      );

      if (!hasTransportOption) {
        // Add Transport option for vehicle management
        const transportOption = {
          id: 'transport',
          label: 'Vehicles',
          title: 'Transport',
          icon: 'car-outline',
          screen: 'Transport',
          subtitle: 'Manage vehicles and transport'
        };
        menuItems.splice(1, 0, transportOption); // Add as second item
        console.log('🚚 Added Transport option:', transportOption);
      }

      // Remove less relevant options for courier businesses
      const courierExcludedItems = ['invoices', 'banking', 'reports'];
      menuItems = menuItems.filter(item => {
        const itemLabel = (item.label || item.title || '').toLowerCase();
        const itemId = (item.id || '').toLowerCase();
        const itemScreen = (item.screen || '').toLowerCase();

        const shouldExclude = courierExcludedItems.some(excluded =>
          itemLabel.includes(excluded) ||
          itemId.includes(excluded) ||
          itemScreen.includes(excluded)
        );

        if (shouldExclude) {
          console.log('🚫 Filtering out item for courier business:', item.label || item.title);
        }

        return !shouldExclude;
      });

      console.log('🚚 Final courier menu items count:', menuItems.length);
    }

    // Add Advertise option for ALL business types
    const hasAdvertiseOption = menuItems.some(item => 
      item.id === 'advertise' || 
      item.screen === 'MarketplaceSettings' ||
      item.label?.toLowerCase().includes('advertise')
    );
    
    console.log('📢 Has Advertise option already:', hasAdvertiseOption);
    
    if (!hasAdvertiseOption) {
      // Add Advertise option for all businesses
      const advertiseOption = {
        id: 'advertise',
        label: 'Advertise',
        title: 'Advertise',
        icon: 'megaphone-outline',
        screen: 'MarketplaceSettings',
        subtitle: 'Manage your marketplace listing'
      };
      menuItems.push(advertiseOption);
      console.log('📢 Added Advertise option for business:', advertiseOption);
    }
    
    // Check if Transactions option exists
    const hasTransactionsOption = menuItems.some(item => 
      item.id === 'transactions' || 
      item.screen === 'Transactions' ||
      item.label?.toLowerCase().includes('transaction')
    );
    
    console.log('💰 Has Transactions option already:', hasTransactionsOption);
    
    if (!hasTransactionsOption) {
      // Add Transactions option for all businesses
      const transactionsOption = {
        id: 'transactions',
        label: 'Transactions',
        title: 'Transactions',
        icon: 'receipt-outline',
        screen: 'Transactions',
        subtitle: 'View sales & payment history'
      };
      menuItems.push(transactionsOption);
      console.log('💰 Added Transactions option for business:', transactionsOption);
    }
    
    // Check if Dashboard option exists
    const hasDashboardOption = menuItems.some(item => 
      item.id === 'dashboard' || 
      item.screen === 'Dashboard' ||
      item.screen === 'DashboardScreen' ||
      item.label?.toLowerCase().includes('dashboard')
    );
    
    console.log('📊 Has Dashboard option already:', hasDashboardOption);
    
    if (!hasDashboardOption) {
      // Add Dashboard option for all businesses (including restaurants)
      const dashboardOption = {
        id: 'dashboard',
        label: 'Dashboard',
        title: 'Dashboard',
        icon: 'analytics-outline',
        screen: 'Dashboard',
        subtitle: 'View business analytics & insights'
      };
      menuItems.push(dashboardOption);
      console.log('📊 Added Dashboard option for business:', dashboardOption);
    }
    
    // Add purchased features to menu
    if (purchasedFeatures.length > 0) {
      console.log('🔍 Adding purchased features to menu:', purchasedFeatures);
      
      // Define feature configurations (matching FeatureSelectionScreen)
      const FEATURE_CONFIGS = {
        'payroll': { title: 'Payroll', icon: 'people-outline', screen: 'PayrollManagement', color: '#10b981' },
        'analytics': { title: 'Analytics', icon: 'analytics-outline', screen: 'AdvancedAnalytics', color: '#8b5cf6' },
        'loyalty': { title: 'Loyalty', icon: 'gift-outline', screen: 'CustomerLoyalty', color: '#f59e0b' },
        'email_marketing': { title: 'Email Marketing', icon: 'mail-outline', screen: 'EmailMarketing', color: '#ef4444' },
        'reservations': { title: 'Reservations', icon: 'calendar-outline', screen: 'TableReservations', color: '#3b82f6' },
        'delivery': { title: 'Delivery', icon: 'car-outline', screen: 'DeliveryManagement', color: '#06b6d4' },
        'suppliers': { title: 'Suppliers', icon: 'business-outline', screen: 'SupplierManagement', color: '#84cc16' },
        'recipe_costing': { title: 'Recipe Costing', icon: 'calculator-outline', screen: 'RecipeCosting', color: '#f97316' },
        'booking': { title: 'Appointments', icon: 'time-outline', screen: 'AppointmentBooking', color: '#ec4899' },
        'crm_advanced': { title: 'Advanced CRM', icon: 'person-add-outline', screen: 'AdvancedCRM', color: '#6366f1' },
      };
      
      purchasedFeatures.forEach(featureId => {
        const config = FEATURE_CONFIGS[featureId];
        if (config) {
          const featureMenuItem = {
            id: featureId,
            label: config.title,
            title: config.title,
            icon: config.icon,
            screen: config.screen,
            subtitle: `Premium feature`,
            isPurchased: true
          };
          
          // Check if already exists in menu
          const alreadyExists = menuItems.some(item => 
            item.id === featureId || item.screen === config.screen
          );
          
          if (!alreadyExists) {
            menuItems.push(featureMenuItem);
            console.log('🔍 Added purchased feature to menu:', featureMenuItem);
          }
        }
      });
    }
    
    console.log('🔍 Final menu items count:', menuItems.length);
    
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
    refreshMenuItems,
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