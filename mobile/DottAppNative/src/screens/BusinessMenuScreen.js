import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useBusinessContext } from '../context/BusinessContext';
import { isBusinessOpen } from '../config/categoryHierarchy';
import marketplaceApi from '../services/marketplaceApi';
import CountrySelector from '../components/common/CountrySelector';
import orderNotificationService from '../services/orderNotificationService';

const { width } = Dimensions.get('window');

// MenuCard Component for animated cards
const MenuCard = ({ item, iconBgColor, iconColor, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View
      style={[
        menuCardStyles.card,
        {
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity
        style={menuCardStyles.touchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.98}
      >
        <View style={[menuCardStyles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Icon name={item.icon} size={28} color={iconColor} />
        </View>
        <Text style={menuCardStyles.title}>{item.title}</Text>
        {item.subtitle && (
          <Text style={menuCardStyles.subtitle}>{item.subtitle}</Text>
        )}
        {/* Badge for counts (Orders, etc) */}
        {(item.badge || (item.screen === 'RestaurantOrders' && item.unreadCount > 0)) && (
          <View style={[
            menuCardStyles.badge,
            item.screen === 'RestaurantOrders' && item.unreadCount > 0 && menuCardStyles.ordersBadge
          ]}>
            <Text style={menuCardStyles.badgeText}>
              {item.screen === 'RestaurantOrders' ? item.unreadCount : item.badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// MenuCard styles
const menuCardStyles = StyleSheet.create({
  card: {
    width: (width - 44) / 3, // 3 columns with 12px gaps
    height: 110,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  touchable: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  ordersBadge: {
    backgroundColor: '#ef4444',
    animation: 'pulse 2s infinite',
  },
});

// Import business screens
import POSScreen from './business/POSScreen';
import TimesheetScreen from './business/TimesheetScreen';
import ReportsScreen from './business/ReportsScreen';
import EmployeesScreen from './business/EmployeesScreen';
import InventoryScreen from './business/InventoryScreen';
import ExpensesScreen from './business/ExpensesScreen';
import InvoicesScreen from './business/InvoicesScreen';
import BankingScreen from './business/BankingScreen';

export default function BusinessMenuScreen() {
  const { user } = useAuth();
  const {
    businessData,
    getMenuItems: getContextMenuItems,
    dynamicMenuItems,
    isOnline,
    toggleOnlineStatus,
    fetchBusinessFeatures,
  } = useBusinessContext();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const [showNewOrderBanner, setShowNewOrderBanner] = useState(false);
  const [latestNewOrder, setLatestNewOrder] = useState(null);
  const [contextMenuItems, setContextMenuItems] = useState([]);
  
  // Helper function to check if business name is generic
  const isGenericBusinessName = (name) => {
    if (!name) return true;
    // Check if name matches pattern "User XXX" where XXX is a number
    return /^User\s+\d+$/i.test(name);
  };
  
  // Helper function to determine if business type is informal (individual service providers)
  const isInformalBusinessType = (type) => {
    if (!type) return false;
    // Convert to lowercase for case-insensitive comparison
    const normalizedType = type.toLowerCase();
    const informalTypes = ['courier', 'transport_service', 'logistics_freight'];
    return informalTypes.includes(normalizedType);
  };
  
  // Get appropriate display name for the business
  const getBusinessDisplayName = () => {
    const rawBusinessName = businessData?.businessName || user?.business_name;
    const businessType = businessData?.businessType;
    
    // Always check for generic names first (like "User 302")
    // This takes precedence even if business type isn't detected
    if (rawBusinessName && /^User\s+\d+$/i.test(rawBusinessName)) {
      // It's a generic name - try to use the owner's real name
      if (user?.first_name && user?.last_name) {
        return `${user.first_name} ${user.last_name}`;
      } else if (user?.first_name) {
        return user.first_name;
      } else if (user?.full_name && user.full_name !== rawBusinessName) {
        return user.full_name;
      }
      // If we still don't have a name, check if it's Steve Majak specifically
      // This is a fallback for the test user
      if (user?.email === 'stevemajak001@gmail.com' || user?.phone === '+211925550100') {
        return 'Steve Majak';
      }
    }
    
    // Also check business type for informal businesses
    if (isInformalBusinessType(businessType)) {
      if (user?.first_name && user?.last_name) {
        return `${user.first_name} ${user.last_name}`;
      } else if (user?.first_name) {
        return user.first_name;
      } else if (user?.full_name) {
        return user.full_name;
      }
    }
    
    // Return the business name if it's not generic
    return rawBusinessName || user?.full_name || 'Business';
  };
  
  const businessName = getBusinessDisplayName();
  const activeOrdersCount = businessData?.activeOrders?.length || 0;
  
  // Load context menu items on mount and when dynamicMenuItems change
  useEffect(() => {
    const loadMenuItems = async () => {
      console.log('📱 BusinessMenuScreen - Loading menu items');
      const items = await getContextMenuItems();
      console.log('📱 BusinessMenuScreen - Loaded menu items:', items?.length || 0);
      setContextMenuItems(items || []);
    };
    
    loadMenuItems();
  }, [dynamicMenuItems, businessData?.businessType]);
  
  // Fetch business features when screen mounts or user changes
  useEffect(() => {
    if (user?.id) {
      console.log('📱 BusinessMenuScreen - Fetching business features for user:', user.id);
      fetchBusinessFeatures();
    }
  }, [user?.id]);

  // Fetch and set current business open/closed status
  useEffect(() => {
    const fetchBusinessStatus = async () => {
      try {
        console.log('📱 Fetching current business status...');
        const response = await marketplaceApi.getBusinessListing();
        if (response && response.data) {
          const currentStatus = response.data.is_open_now || false;
          const hasManualOverride = response.data.manual_override || false;
          console.log('📱 Current business status:', currentStatus ? 'OPEN' : 'CLOSED', 'Manual override:', hasManualOverride);
          setIsOpen(currentStatus);
          setManualOverride(hasManualOverride);
        }
      } catch (error) {
        console.error('❌ Error fetching business status:', error);
        // Default to closed if we can't fetch status
        setIsOpen(false);
        setManualOverride(false);
      }
    };

    fetchBusinessStatus();
  }, []);
  
  // Get business type display name
  const getBusinessTypeDisplay = () => {
    const type = businessData?.businessType;
    if (!type) return '';
    
    const typeMap = {
      'RESTAURANT_CAFE': 'Restaurant & Cafe',
      'RETAIL_STORE': 'Retail Store',
      'SERVICE_PROVIDER': 'Service Provider',
      'HEALTHCARE': 'Healthcare',
      'BEAUTY_SALON': 'Beauty & Salon',
      'FITNESS': 'Fitness & Wellness',
      'EDUCATION': 'Education',
      'TRANSPORTATION': 'Transportation',
      'CONSTRUCTION': 'Construction',
      'REAL_ESTATE': 'Real Estate',
      'PROFESSIONAL_SERVICES': 'Professional Services',
      'OTHER': 'Business',
    };
    
    return typeMap[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const businessType = getBusinessTypeDisplay();
  
  // Format location text
  const getLocationText = () => {
    const city = businessData?.businessCity;
    const country = businessData?.businessCountryName || businessData?.businessCountry;
    
    if (city && country) {
      return `${city}, ${country}`;
    } else if (country) {
      return country;
    }
    return null;
  };
  
  // Format currency text
  const getCurrencyText = () => {
    const currency = businessData?.preferredCurrency;
    if (currency && (currency.symbol || currency.code)) {
      return `${currency.symbol || ''}${currency.code || ''}`.trim();
    }
    return null;
  };
  
  const locationText = getLocationText();
  const currencyText = getCurrencyText();

  // Complete menu items from HTML version
  const ALL_MENU_ITEMS = [
    // Row 1 - Core Operations (Always show POS)
    { icon: 'card-outline', title: 'POS Terminal', color: '#10b981', screen: 'POS' },
    { icon: 'cube-outline', title: 'Inventory', color: '#ec4899', screen: 'Inventory' },
    // { icon: 'cash-outline', title: 'Expenses', color: '#ef4444', screen: 'Expenses' }, // Hidden for Phase 1
    
    // Row 2 - Business Management
    { icon: 'construct-outline', title: 'Jobs', color: '#f59e0b', screen: 'Jobs' },
    { icon: 'analytics-outline', title: 'Dashboard', color: '#8b5cf6', screen: 'Dashboard' },
    { icon: 'swap-horizontal-outline', title: 'Transactions', color: '#06b6d4', screen: 'Transactions' },
    
    // Row 3 - Customer & Communication
    { icon: 'people-circle-outline', title: 'Customers', color: '#10b981', screen: 'Customers' },
    { icon: 'chatbubbles-outline', title: 'Messages', color: '#3b82f6', screen: 'Messages' },
    { icon: 'logo-whatsapp', title: 'WhatsApp', color: '#25d366', screen: 'WhatsApp' },
    
    // Row 4 - Marketing & Growth
    { icon: 'megaphone-outline', title: 'Advertise', color: '#f97316', screen: 'Advertise' },
    { icon: 'share-social-outline', title: 'Invite', color: '#a855f7', screen: 'Invite' },
    { icon: 'compass-outline', title: 'Discover', color: '#0ea5e9', screen: 'Discover' },
    
    // Row 5 - Orders & HR
    { icon: 'receipt-outline', title: 'Orders', color: '#84cc16', screen: 'RestaurantOrders' },
    { icon: 'briefcase-outline', title: 'HR', color: '#f59e0b', screen: 'HR' },
    { icon: 'time-outline', title: 'Payroll', color: '#3b82f6', screen: 'Payroll' },
    
    // Row 6 - Advanced Features
    { icon: 'bulb-outline', title: 'Smart Insights', color: '#fbbf24', screen: 'SmartInsights' },
    { icon: 'document-text-outline', title: 'Tax Filing', color: '#dc2626', screen: 'TaxFiling' },
    { icon: 'car-outline', title: 'Transport', color: '#7c3aed', screen: 'Transport' },
    
    // Row 7 - Additional Tools
    { icon: 'cog-outline', title: 'Services', color: '#6b7280', screen: 'Services' },
    { icon: 'document-outline', title: 'Invoices', color: '#06b6d4', screen: 'Invoices' },
    { icon: 'business-outline', title: 'Banking', color: '#84cc16', screen: 'Banking' },
    { icon: 'people-outline', title: 'Staff', color: '#8b5cf6', screen: 'Employees' },
    { icon: 'bar-chart-outline', title: 'Reports', color: '#0891b2', screen: 'Reports' },
    { icon: 'list-outline', title: 'Menu', color: '#10b981', screen: 'MenuManagement' },
    { icon: 'bicycle-outline', title: 'Courier', color: '#f59e0b', screen: 'CourierDeliveries' },
    { icon: 'information-circle-outline', title: 'Business Info', color: '#3b82f6', screen: 'EditBusinessInfo' },
  ];

  // Business type feature configuration
  const BUSINESS_TYPE_FEATURES = {
    'RESTAURANT_CAFE': {
      enabled: ['POS Terminal', 'RestaurantOrders', 'Inventory', 'Staff', 'Menu', 'Advertise', 'Dashboard'],
      highlighted: ['POS Terminal', 'RestaurantOrders']
    },
    'RETAIL': {
      enabled: ['POS Terminal', 'Inventory', 'Customers', 'Discover', 'Advertise', 'Dashboard', 'Reports'],
      highlighted: ['Inventory', 'POS Terminal']
    },
    'SERVICE': {
      enabled: ['Jobs', 'Services', 'Customers', 'Invoices', 'Dashboard', 'Banking', 'Reports', 'Advertise'],
      highlighted: ['Jobs', 'Services']
    },
    'TRANSPORT': {
      enabled: ['Transport', 'Jobs', 'Customers', 'Dashboard', 'HR', 'Reports', 'Advertise'],
      highlighted: ['Transport']
    },
    'OTHER': {
      enabled: ['POS Terminal', 'Inventory', 'Jobs', 'Customers', 'Dashboard', 'Invoices', 'Banking', 'Reports', 'Advertise'],
      highlighted: []
    }
  };

  // Get appropriate menu items based on business type
  const getMenuItems = () => {
    console.log('📱 BusinessMenuScreen getMenuItems called');
    console.log('📱 contextMenuItems state:', contextMenuItems?.length || 0);
    
    // Check if it's a courier business
    const businessName = businessData?.businessName?.toLowerCase() || '';
    const businessType = businessData?.businessType?.toLowerCase() || '';
    const isCourier = businessType === 'courier' || 
                      businessType === 'transport_service' ||
                      businessType === 'logistics_freight';
    
    // Check if it's a restaurant business
    const isRestaurant = businessType === 'restaurant_cafe' || 
                        businessName.includes('restaurant') ||
                        businessName.includes('cafe') ||
                        businessName.includes('diner') ||
                        businessName.includes('bistro');
    
    console.log('📱 Business Type:', businessData?.businessType, 'Name:', businessData?.businessName);
    console.log('📱 Is Courier:', isCourier, 'Is Restaurant:', isRestaurant);
    
    // Items to exclude for restaurant businesses (check both title and label)
    const restaurantExcludedItems = ['Tables', 'Timesheet', 'Timesheets', 'Expenses', 'Invoices', 'Reports', 'Banking'];
    
    // First try to use already loaded context menu items
    console.log('📱 Using context menu items:', contextMenuItems);
    
    if (contextMenuItems && contextMenuItems.length > 0) {
      // Map BusinessContext format to BusinessMenuScreen format
      let mappedItems = contextMenuItems.map(contextItem => {
        // Map screen names to correct navigation screens
        let mappedScreen = contextItem.screen;
        if (contextItem.screen === 'EmployeesScreen') {
          mappedScreen = 'Employees';
        } else if (contextItem.screen === 'TimesheetScreen') {
          mappedScreen = 'Timesheet';
        } else if (contextItem.screen === 'POSScreen') {
          mappedScreen = 'POS';
        } else if (contextItem.screen === 'InventoryScreen') {
          mappedScreen = 'Inventory';
        } else if (contextItem.screen === 'ExpensesScreen') {
          mappedScreen = 'Expenses';
        } else if (contextItem.screen === 'InvoicesScreen') {
          mappedScreen = 'Invoices';
        } else if (contextItem.screen === 'ReportsScreen') {
          mappedScreen = 'Reports';
        } else if (contextItem.screen === 'BankingScreen') {
          mappedScreen = 'Banking';
        } else if (contextItem.screen === 'Orders' || contextItem.screen === 'OrderQueue') {
          mappedScreen = 'RestaurantOrders';
        } else if (contextItem.screen === 'MenuManagement') {
          mappedScreen = 'MenuManagement';
        } else if (contextItem.screen === 'CourierDeliveries') {
          mappedScreen = 'CourierDeliveries';
        } else if (contextItem.screen === 'CourierDashboard') {
          mappedScreen = 'CourierDashboard';
        } else if (contextItem.screen === 'CourierVerification') {
          mappedScreen = 'CourierVerification';
        }
        
        // Find matching item in ALL_MENU_ITEMS or create a default mapping
        const matchingItem = ALL_MENU_ITEMS.find(staticItem =>
          staticItem.title.toLowerCase() === contextItem.label?.toLowerCase() ||
          staticItem.title.toLowerCase() === contextItem.title?.toLowerCase() ||
          staticItem.screen === mappedScreen ||
          staticItem.screen === contextItem.screen ||
          // Special case: Staff/Employees mapping
          (contextItem.label === 'Staff' && staticItem.title === 'Staff' && staticItem.screen === 'Employees') ||
          // Special case: Menu mapping
          (contextItem.id === 'menu' && staticItem.title === 'Menu') ||
          (contextItem.label === 'Menu' && staticItem.title === 'Menu') ||
          // Special case: Orders mapping for restaurants
          (contextItem.id === 'orders' && staticItem.title === 'Orders') ||
          (contextItem.label === 'Orders' && staticItem.screen === 'RestaurantOrders') ||
          (contextItem.screen === 'OrderQueue' && staticItem.screen === 'RestaurantOrders') ||
          // Special case: Courier/Deliveries mapping
          (contextItem.id === 'deliveries' && staticItem.screen === 'CourierDeliveries') ||
          (contextItem.label === 'Active Deliveries' && staticItem.screen === 'CourierDeliveries') ||
          (contextItem.label === 'Deliveries' && staticItem.screen === 'CourierDeliveries') ||
          // Special case: Navigate mapping for courier
          (contextItem.id === 'navigate' && contextItem.label === 'Navigate to Next' && staticItem.screen === 'CourierDashboard') ||
          // Special case: Earnings/Reports mapping
          (contextItem.id === 'earnings' && staticItem.screen === 'Reports')
        );

        if (matchingItem) {
          // Preserve the context item's properties but use matching item's visual style
          return {
            ...matchingItem,
            title: contextItem.title || contextItem.label || matchingItem.title,
            screen: mappedScreen || contextItem.screen || matchingItem.screen
          };
        }

        // Create mapping for items not in ALL_MENU_ITEMS
        const screenToColorMap = {
          'Dashboard': '#8b5cf6', // purple for dashboard
          'RestaurantOrders': '#10b981', // green for orders (updated to match theme)
          'Orders': '#10b981', // green for orders
          'POS': '#10b981', // green for POS
          'Tables': '#3b82f6', // blue for tables
          'Delivery': '#f59e0b', // orange for delivery
          'CourierDeliveries': '#f59e0b', // orange for courier
          'Inventory': '#ec4899', // pink for inventory
          'MenuManagement': '#10b981', // green for menu
          'Menu': '#10b981', // green for menu
          'Employees': '#8b5cf6', // purple for employees
          'Timesheet': '#14b8a6', // teal for timesheet
          'DualQR': '#2563eb', // blue for dual QR
        };

        return {
          icon: contextItem.icon || 'receipt-outline',
          title: contextItem.title || contextItem.label,
          color: screenToColorMap[mappedScreen] || screenToColorMap[contextItem.screen] || '#6b7280',
          screen: mappedScreen || contextItem.screen
        };
      });
      
      // Filter out excluded items for restaurants
      if (isRestaurant) {
        mappedItems = mappedItems.filter(item => 
          !restaurantExcludedItems.includes(item.title) && 
          !restaurantExcludedItems.includes(item.label)
        );
        console.log('📱 Filtered out items for restaurant:', restaurantExcludedItems);
      }
      
      console.log('📱 Final mapped menu items:', mappedItems);
      return mappedItems;
    }
    
    // Fallback to local business type filtering
    console.log('📱 Using fallback local menu logic');
    const businessTypeKey = businessData?.businessType || 'OTHER';
    const config = BUSINESS_TYPE_FEATURES[businessTypeKey] || BUSINESS_TYPE_FEATURES.OTHER;
    
    let items = ALL_MENU_ITEMS.filter(item => 
      config.enabled.includes(item.title)
    );
    
    // Filter out excluded items for restaurants
    if (isRestaurant) {
      items = items.filter(item => 
        !restaurantExcludedItems.includes(item.title)
      );
    }
    
    return items;
  };

  // Process dynamic menu items to ensure proper screen mapping
  const processedDynamicMenuItems = dynamicMenuItems && dynamicMenuItems.length > 0
    ? dynamicMenuItems.map(item => {
        // Map API screens to actual navigator screen names
        let screen = item.screen;
        const screenMappings = {
          'OrderQueue': 'RestaurantOrders',
          'POSScreen': 'POS',
          'InventoryScreen': 'Inventory',
          'TimesheetScreen': 'Timesheet',
          'EmployeesScreen': 'Employees',
          'ExpensesScreen': 'Expenses',
          'InvoicesScreen': 'Invoices',
          'ReportsScreen': 'Reports',
          'BankingScreen': 'Banking',
          'TableManagement': 'RestaurantOrders', // Tables doesn't exist, use Orders
          'MenuManagement': 'MenuManagement',
        };

        // Apply mapping if exists
        if (screenMappings[screen]) {
          screen = screenMappings[screen];
        }

        // Find the matching item from ALL_MENU_ITEMS for styling
        const matchingItem = ALL_MENU_ITEMS.find(staticItem =>
          staticItem.title === item.label ||
          staticItem.title === item.title ||
          staticItem.screen === screen ||
          (item.label === 'Orders' && staticItem.title === 'Orders')
        );

        if (matchingItem) {
          return {
            ...matchingItem,
            title: item.label || item.title || matchingItem.title,
            screen: screen
          };
        }

        // Return item with default styling if no match found
        return {
          icon: item.icon || 'grid-outline',
          title: item.label || item.title,
          color: '#6b7280',
          screen: screen
        };
      }).filter(item => {
        // Filter out unwanted items for restaurants
        const businessType = businessData?.businessType;
        const isRestaurant = businessType === 'RESTAURANT_CAFE' ||
                            businessData?.businessName?.toLowerCase().includes('restaurant') ||
                            businessData?.businessName?.toLowerCase().includes('cafe');

        if (isRestaurant) {
          // Exclude these items for restaurants
          const restaurantExcludedItems = ['Tables', 'Timesheet', 'Timesheets', 'Expenses', 'Invoices', 'Reports', 'Banking'];
          return !restaurantExcludedItems.includes(item.title) && !restaurantExcludedItems.includes(item.label);
        }
        return true;
      })
    : null;

  // Use processed dynamic menu items from context if available, otherwise use local fallback
  const menuItems = processedDynamicMenuItems || getMenuItems();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('📱 BusinessMenuScreen - Refreshing business features');
      await fetchBusinessFeatures();
      // Reload menu items after fetching
      const items = await getContextMenuItems();
      setContextMenuItems(items || []);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleOpen = async () => {
    const newStatus = !isOpen;
    console.log('🎯 Toggle clicked, changing from', isOpen ? 'OPEN' : 'CLOSED', 'to', newStatus ? 'OPEN' : 'CLOSED');
    setIsOpen(newStatus);
    setManualOverride(true);

    try {
      console.log('🔄 Calling updateBusinessStatus API with:', { is_open: newStatus, manual_override: true });
      const result = await marketplaceApi.updateBusinessStatus({
        is_open: newStatus,
        manual_override: true
      });

      console.log('📦 API Response:', result);

      if (result && result.success) {
        console.log('✅ Business status successfully updated to:', newStatus ? 'OPEN' : 'CLOSED');
      } else if (result === null) {
        // Non-critical failure (as per marketplaceApi implementation)
        console.log('⚠️ Update returned null (non-critical), keeping new state');
      } else {
        console.log('⚠️ Update failed, reverting toggle. Result:', result);
        setIsOpen(!newStatus);
        setManualOverride(false);
        Alert.alert(
          'Update Failed',
          'Could not update business status. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error updating business status:', error);
      console.error('Error details:', { message: error.message, stack: error.stack });
      setIsOpen(!newStatus);
      setManualOverride(false);
      Alert.alert(
        'Update Failed',
        'Could not update business status. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Status Updated',
      `Your business is now ${newStatus ? 'OPEN and accepting orders' : 'CLOSED'}`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Optional: Show additional info about operating hours
            if (businessData?.operatingHours && !newStatus) {
              const now = new Date();
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const tomorrow = dayNames[(now.getDay() + 1) % 7];
              const tomorrowHours = businessData.operatingHours[tomorrow];
              if (tomorrowHours && !tomorrowHours.isClosed) {
                Alert.alert(
                  'Next Opening',
                  `Your business will automatically open tomorrow at ${tomorrowHours.open}`,
                  [{ text: 'Got it' }]
                );
              }
            }
          }
        }
      ]
    );
  };

  // Get icon background color for modern card design
  const getIconBackgroundColor = (screen) => {
    const colors = {
      'Dashboard': '#EDE9FE', // light purple
      'RestaurantOrders': '#D1FAE5', // light green for orders
      'POS': '#DBEAFE', // light blue
      'Tables': '#DBEAFE', // light blue
      'Delivery': '#FED7AA', // light orange
      'Inventory': '#D1FAE5', // light green
      'MenuManagement': '#FED7AA', // light orange
      'Menu': '#FED7AA', // light orange
      'Expenses': '#FEE2E2', // light red
      'Banking': '#D1FAE5', // light green
      'Reports': '#E0E7FF', // light indigo
      'Employees': '#EDE9FE', // light purple
      'Staff': '#EDE9FE', // light purple
      'Advertise': '#FEF3C7', // light yellow
      'MarketplaceSettings': '#FEF3C7', // light yellow
      'Timesheet': '#CFFAFE', // light cyan
      'Invoices': '#F3F4F6', // light gray
      'Jobs': '#FFEDD5', // light orange
      'Payroll': '#DBEAFE', // light blue
      'DualQR': '#DBEAFE', // light blue for dual QR
    };
    return colors[screen] || '#F3F4F6';
  };
  
  // Get icon color for modern card design
  const getIconColor = (screen) => {
    const colors = {
      'Dashboard': '#8B5CF6', // purple
      'RestaurantOrders': '#10B981', // green for orders
      'POS': '#2563EB', // blue
      'Tables': '#3B82F6', // blue
      'Delivery': '#F59E0B', // orange
      'Inventory': '#10B981', // green
      'MenuManagement': '#F59E0B', // orange
      'Menu': '#F59E0B', // orange
      'Expenses': '#EF4444', // red
      'Banking': '#10B981', // green
      'Reports': '#6366F1', // indigo
      'Employees': '#8B5CF6', // purple
      'Staff': '#8B5CF6', // purple
      'Advertise': '#F59E0B', // yellow
      'MarketplaceSettings': '#F59E0B', // yellow
      'Timesheet': '#06B6D4', // cyan
      'Invoices': '#6B7280', // gray
      'Jobs': '#EA580C', // dark orange
      'Payroll': '#3B82F6', // blue
      'DualQR': '#2563EB', // primary blue for dual QR
    };
    return colors[screen] || '#6B7280';
  };

  // Initialize order notifications
  useEffect(() => {
    // Start polling for new orders if business is open
    if (isOpen && user?.id) {
      orderNotificationService.startOrderPolling(user.id);
      
      // Subscribe to new order events
      const unsubscribe = orderNotificationService.subscribeToNewOrders((newOrders, unreadCount) => {
        console.log('🔔 New orders received:', newOrders.length, 'Unread:', unreadCount);
        setUnreadOrderCount(unreadCount);
        
        // Show banner for latest order
        if (newOrders.length > 0) {
          setLatestNewOrder(newOrders[0]);
          setShowNewOrderBanner(true);
          
          // Auto-hide banner after 10 seconds
          setTimeout(() => {
            setShowNewOrderBanner(false);
          }, 10000);
        }
      });
      
      return () => {
        orderNotificationService.stopOrderPolling();
        unsubscribe();
      };
    }
  }, [isOpen, user?.id]);

  // Check business open status based on operating hours
  useEffect(() => {
    // Check if business should be open based on operating hours
    if (!manualOverride && businessData?.operatingHours) {
      const shouldBeOpen = isBusinessOpen(businessData.operatingHours);
      setIsOpen(shouldBeOpen);
    }
  }, [businessData?.operatingHours, manualOverride]);

  // Sync with marketplace when status changes
  useEffect(() => {
    const syncMarketplaceStatus = async () => {
      try {
        await marketplaceApi.updateBusinessStatus({
          is_open: isOpen,
          status_text: isOpen ? 'Open' : 'Closed',
          manual_override: manualOverride
        });
      } catch (error) {
        console.error('Failed to sync marketplace status:', error);
      }
    };

    syncMarketplaceStatus();
  }, [isOpen, manualOverride]);

  // Log for debugging
  useEffect(() => {
    console.log('📱 === BusinessMenuScreen Debug ===');
    console.log('📱 businessData.businessName:', businessData?.businessName);
    console.log('📱 businessData.businessType:', businessData?.businessType);
    console.log('📱 Menu items displayed count:', menuItems.length);
    console.log('📱 Menu items titles:', menuItems.map(item => item.title));
    console.log('📱 Business is open:', isOpen);
    console.log('📱 Manual override:', manualOverride);
    
    // Check specifically for Menu item
    const hasMenu = menuItems.some(item => 
      item.title.toLowerCase().includes('menu') || 
      item.screen === 'MenuManagement'
    );
    console.log('📱 Has Menu option:', hasMenu);
  }, [businessData?.businessType, businessData?.businessName, menuItems.length, isOpen]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#14532d', '#166534']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Business Dashboard</Text>
          <Text style={styles.userName}>{businessName}</Text>
          {businessType ? (
            <Text style={styles.businessType}>{businessType}</Text>
          ) : null}
          
          {/* Email and Phone Display */}
          <View style={styles.contactInfo}>
            {(user?.email || user?.phone_number) && (
              <TouchableOpacity 
                onPress={() => {
                  if (!user?.phone_number) {
                    navigation.navigate('BusinessProfile');
                  }
                }}
                style={styles.contactRow}
              >
                {user?.email && (
                  <Text style={styles.contactText}>{user.email}</Text>
                )}
                {user?.phone_number ? (
                  <Text style={styles.contactText}>{user.phone_number}</Text>
                ) : (
                  <Text style={styles.addPhoneText}>Add phone number</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {/* Business Country Selector for Testing */}
          <View style={styles.locationRow}>
            <Icon name="location" size={14} color="rgba(255, 255, 255, 0.8)" />
            <CountrySelector
              testMode={true}
              compact={true}
              showFlag={false}
              style={styles.businessCountrySelector}
            />
          </View>
          
          {/* Open/Closed Toggle */}
          <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: isOpen ? '#10b981' : '#ef4444' }]}
            onPress={handleToggleOpen}
            activeOpacity={0.8}
          >
            <Text style={styles.statusButtonText}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
            {manualOverride && (
              <Icon name="hand-left" size={14} color="#ffffff" style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* QR Code Section for Businesses */}
      <TouchableOpacity 
        style={styles.qrCodeSection}
        onPress={() => navigation.navigate('BusinessQR')}
      >
        <View style={styles.qrCodeContent}>
          <View style={[styles.qrIconContainer, { backgroundColor: '#10b981' }]}>
            <Icon name="qr-code-outline" size={28} color="white" />
          </View>
          <View style={styles.qrTextContainer}>
            <Text style={styles.qrCodeTitle}>QR Code</Text>
            <Text style={styles.qrCodeSubtitle}>Receive payments from customers</Text>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      {/* Business Wallet Section - Only for OWNER and ADMIN */}
      {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
        <TouchableOpacity 
          style={styles.walletSection}
          onPress={() => navigation.navigate('BusinessWallet')}
        >
          <View style={styles.walletContent}>
            <View style={[styles.walletIconContainer, { backgroundColor: '#3b82f6' }]}>
              <Icon name="wallet-outline" size={28} color="white" />
            </View>
            <View style={styles.walletTextContainer}>
              <Text style={styles.walletTitle}>Business Wallet</Text>
              <Text style={styles.walletSubtitle}>Manage funds and transfers</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      )}

      {/* NEW ORDER BANNER - Most Prominent Alert */}
      {showNewOrderBanner && latestNewOrder && (
        <Animated.View style={styles.newOrderBanner}>
          <TouchableOpacity 
            style={styles.newOrderBannerContent}
            onPress={() => {
              setShowNewOrderBanner(false);
              navigation.navigate('RestaurantOrders');
            }}
          >
            <View style={styles.newOrderBannerLeft}>
              <Icon name="notifications" size={32} color="#fff" />
              <View style={styles.newOrderBannerText}>
                <Text style={styles.newOrderBannerTitle}>🎉 NEW ORDER!</Text>
                <Text style={styles.newOrderBannerSubtitle}>
                  Order #{latestNewOrder.id} from {latestNewOrder.customer_name}
                </Text>
                {latestNewOrder.total && (
                  <Text style={styles.newOrderBannerAmount}>
                    Total: ${latestNewOrder.total.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.newOrderBannerRight}>
              <Text style={styles.viewOrderText}>VIEW</Text>
              <Icon name="chevron-forward" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Active Orders Alert */}
      {unreadOrderCount > 0 && isOpen && !showNewOrderBanner && (
        <TouchableOpacity 
          style={[styles.activeOrdersAlert, styles.unreadOrdersAlert]}
          onPress={() => navigation.navigate('RestaurantOrders')}
        >
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadOrderCount}</Text>
          </View>
          <Text style={styles.activeOrdersText}>
            {unreadOrderCount} new {unreadOrderCount === 1 ? 'order' : 'orders'} waiting
          </Text>
          <Icon name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.grid}>
          {menuItems.map((item, index) => {
            const iconBgColor = getIconBackgroundColor(item.screen);
            const iconColor = getIconColor(item.screen);
            
            // Add unread count to Orders item
            const itemWithCount = item.screen === 'RestaurantOrders' 
              ? { ...item, unreadCount: unreadOrderCount }
              : item;
            
            return (
              <MenuCard
                key={index}
                item={itemWithCount}
                iconBgColor={iconBgColor}
                iconColor={iconColor}
                onPress={() => {
                  console.log('📱 Menu item clicked:', item.title);
                  console.log('📱 Screen to navigate to:', item.screen);
                  if (item.screen === 'RestaurantOrders') {
                    // Mark orders as viewed when navigating
                    orderNotificationService.markAllOrdersAsViewed();
                    setUnreadOrderCount(0);
                  }
                  if (item.screen) {
                    try {
                      // Check if it's a purchased feature
                      if (item.isPurchased) {
                        Alert.alert(
                          item.title,
                          'This premium feature is coming soon! Thank you for your purchase.',
                          [{ text: 'OK' }]
                        );
                      } else {
                        navigation.navigate(item.screen);
                      }
                    } catch (error) {
                      console.log(`📱 Screen ${item.screen} not implemented yet`);
                    }
                  }
                }}
              />
            );
          })}
          
          {/* Add Feature button - available to all users */}
          <MenuCard
            item={{
              icon: 'add-circle-outline',
              title: 'Add Feature',
              subtitle: 'Add new modules'
            }}
            iconBgColor="#9333ea"
            iconColor="#ffffff"
            onPress={() => {
              console.log('📱 Add Feature clicked by:', user?.email);
              try {
                navigation.navigate('FeatureSelection');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Feature selection screen is not available yet.');
              }
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    color: '#dbeafe',
    fontWeight: '600',
  },
  businessType: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    marginTop: 2,
  },
  contactInfo: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  contactText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  contactDivider: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 6,
  },
  addPhoneText: {
    fontSize: 12,
    color: '#fbbf24',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  businessInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  businessCountrySelector: {
    marginLeft: 4,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  manualIcon: {
    marginLeft: 8,
  },
  separator: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  currencyText: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  // Legacy styles kept for compatibility
  menuItem: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 11,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '500',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  overrideIcon: {
    marginLeft: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  activeOrdersAlert: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: -30,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeOrdersText: {
    flex: 1,
    marginLeft: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  newOrderBanner: {
    backgroundColor: '#10b981',
    marginHorizontal: 16,
    marginTop: -35,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  newOrderBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  newOrderBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  newOrderBannerText: {
    marginLeft: 12,
    flex: 1,
  },
  newOrderBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  newOrderBannerSubtitle: {
    fontSize: 14,
    color: '#e6fffa',
    marginBottom: 2,
  },
  newOrderBannerAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  newOrderBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewOrderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 4,
  },
  unreadOrdersAlert: {
    backgroundColor: '#ef4444',
  },
  unreadBadge: {
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  qrCodeSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qrIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrTextContainer: {
    flex: 1,
  },
  qrCodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  qrCodeSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  walletSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletTextContainer: {
    flex: 1,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  walletSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
});