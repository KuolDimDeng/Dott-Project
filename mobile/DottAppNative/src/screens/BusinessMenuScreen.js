import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useBusinessContext } from '../context/BusinessContext';

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
  const { businessData, getMenuItems: getContextMenuItems } = useBusinessContext();
  const navigation = useNavigation();
  const businessName = businessData?.businessName || user?.business_name || user?.full_name || 'Business';
  
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
    // Row 1 - Core Operations
    { icon: 'card-outline', title: 'POS Terminal', color: '#10b981', screen: 'POS' },
    { icon: 'cube-outline', title: 'Inventory', color: '#ec4899', screen: 'Inventory' },
    { icon: 'cash-outline', title: 'Expenses', color: '#ef4444', screen: 'Expenses' },
    
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
    { icon: 'storefront-outline', title: 'Marketplace', color: '#0ea5e9', screen: 'Marketplace' },
    
    // Row 5 - Orders & HR
    { icon: 'receipt-outline', title: 'Orders', color: '#84cc16', screen: 'Orders' },
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
    { icon: 'timer-outline', title: 'Timesheet', color: '#14b8a6', screen: 'Timesheet' },
    { icon: 'people-outline', title: 'Employees', color: '#8b5cf6', screen: 'Employees' },
    { icon: 'bar-chart-outline', title: 'Reports', color: '#0891b2', screen: 'Reports' },
  ];

  // Business type feature configuration
  const BUSINESS_TYPE_FEATURES = {
    'RESTAURANT_CAFE': {
      enabled: ['POS Terminal', 'Inventory', 'Orders', 'Customers', 'WhatsApp', 'Dashboard', 'Expenses', 'HR', 'Payroll', 'Employees', 'Reports'],
      highlighted: ['POS Terminal', 'Orders']
    },
    'RETAIL': {
      enabled: ['POS Terminal', 'Inventory', 'Customers', 'Marketplace', 'Advertise', 'Dashboard', 'Expenses', 'Reports'],
      highlighted: ['Inventory', 'POS Terminal']
    },
    'SERVICE': {
      enabled: ['Jobs', 'Services', 'Customers', 'Invoices', 'Dashboard', 'Expenses', 'Banking', 'Reports'],
      highlighted: ['Jobs', 'Services']
    },
    'TRANSPORT': {
      enabled: ['Transport', 'Jobs', 'Customers', 'Dashboard', 'Expenses', 'HR', 'Reports'],
      highlighted: ['Transport']
    },
    'OTHER': {
      enabled: ['POS Terminal', 'Inventory', 'Jobs', 'Customers', 'Dashboard', 'Expenses', 'Invoices', 'Banking', 'Reports'],
      highlighted: []
    }
  };

  // Get appropriate menu items based on business type
  const getMenuItems = () => {
    console.log('📱 BusinessMenuScreen getMenuItems called');
    
    // First try to get menu items from BusinessContext (includes forced restaurant logic)
    const contextMenuItems = getContextMenuItems();
    console.log('📱 Context menu items:', contextMenuItems);
    
    if (contextMenuItems && contextMenuItems.length > 0) {
      // Map BusinessContext format to BusinessMenuScreen format
      const mappedItems = contextMenuItems.map(contextItem => {
        // Find matching item in ALL_MENU_ITEMS or create a default mapping
        const matchingItem = ALL_MENU_ITEMS.find(staticItem => 
          staticItem.title.toLowerCase() === contextItem.label.toLowerCase() ||
          staticItem.title.toLowerCase() === contextItem.title.toLowerCase() ||
          staticItem.screen === contextItem.screen
        );
        
        if (matchingItem) {
          return matchingItem;
        }
        
        // Create mapping for items not in ALL_MENU_ITEMS
        const screenToColorMap = {
          'Orders': '#84cc16', // green for orders
          'POS': '#10b981', // green for POS
          'Tables': '#3b82f6', // blue for tables  
          'Delivery': '#f59e0b', // orange for delivery
          'Inventory': '#ec4899', // pink for inventory
          'MenuManagement': '#8b5cf6', // purple for menu
        };
        
        return {
          icon: contextItem.icon || 'document-outline',
          title: contextItem.title || contextItem.label,
          color: screenToColorMap[contextItem.screen] || '#6b7280',
          screen: contextItem.screen
        };
      });
      
      console.log('📱 Mapped menu items:', mappedItems);
      return mappedItems;
    }
    
    // Fallback to local business type filtering
    console.log('📱 Using fallback local menu logic');
    const businessType = businessData?.businessType || 'OTHER';
    const config = BUSINESS_TYPE_FEATURES[businessType] || BUSINESS_TYPE_FEATURES.OTHER;
    
    return ALL_MENU_ITEMS.filter(item => 
      config.enabled.includes(item.title)
    );
  };

  const menuItems = getMenuItems();

  // Log for debugging
  React.useEffect(() => {
    console.log('📱 === BusinessMenuScreen Debug ===');
    console.log('📱 businessData.businessName:', businessData?.businessName);
    console.log('📱 businessData.businessType:', businessData?.businessType);
    console.log('📱 Menu items displayed count:', menuItems.length);
    console.log('📱 Menu items titles:', menuItems.map(item => item.title));
    
    // Check specifically for Menu item
    const hasMenu = menuItems.some(item => 
      item.title.toLowerCase().includes('menu') || 
      item.screen === 'MenuManagement'
    );
    console.log('📱 Has Menu option:', hasMenu);
  }, [businessData?.businessType, businessData?.businessName, menuItems.length]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Business Dashboard</Text>
          <Text style={styles.userName}>{businessName}</Text>
          {(locationText || currencyText) && (
            <View style={styles.businessInfoRow}>
              {locationText && (
                <Text style={styles.locationText}>{locationText}</Text>
              )}
              {locationText && currencyText && (
                <Text style={styles.separator}> • </Text>
              )}
              {currencyText && (
                <Text style={styles.currencyText}>{currencyText}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Today's Sales</Text>
        <Text style={styles.statsValue}>$0.00</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                console.log('📱 Menu item clicked:', item.title);
                console.log('📱 Screen to navigate to:', item.screen);
                if (item.screen) {
                  // Navigate to the screen
                  try {
                    console.log('📱 Attempting navigation to:', item.screen);
                    navigation.navigate(item.screen);
                    console.log('📱 Navigation successful to:', item.screen);
                  } catch (error) {
                    console.log('📱 Navigation failed:', error.message);
                    console.log(`📱 Screen ${item.screen} not implemented yet`);
                    // You can navigate to a placeholder screen here if needed
                  }
                } else {
                  console.log(`📱 No screen defined for ${item.title}`);
                }
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuItemText} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
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
  businessInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#94a3b8',
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
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
});