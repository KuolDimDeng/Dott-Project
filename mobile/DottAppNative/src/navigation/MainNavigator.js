import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

// Import screens
import CallScreen from '../screens/CallScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import PurchasesScreen from '../screens/PurchasesScreen';
import BusinessMenuScreen from '../screens/BusinessMenuScreen';
import BusinessDetailScreen from '../screens/BusinessDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatConversationScreen from '../screens/ChatConversationScreen';
import NewChatScreen from '../screens/NewChatScreen';
import GroupCreationScreen from '../screens/GroupCreationScreen';
import AccountScreen from '../screens/AccountScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import CartScreen from '../screens/CartScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';

// Import business screens
import ProgressivePOSScreen from '../screens/business/ProgressivePOSScreen';
import DualModePOSScreen from '../screens/business/DualModePOSScreen';
import TimesheetScreen from '../screens/business/TimesheetScreen';
import ReportsScreen from '../screens/business/ReportsScreen';
import EmployeesScreen from '../screens/business/EmployeesScreen';
import InventoryScreen from '../screens/business/InventoryScreen';
import ExpensesScreen from '../screens/business/ExpensesScreen';
import InvoicesScreen from '../screens/business/InvoicesScreen';
import BankingScreen from '../screens/business/BankingScreen';
import MenuManagementScreen from '../screens/business/MenuManagementScreen';
import BusinessRegistrationScreen from '../screens/consumer/BusinessRegistrationScreen';
import BankingSetupScreen from '../screens/business/BankingSetupScreen';
import CurrencyPreferenceScreen from '../screens/CurrencyPreferenceScreen';
import JobsScreen from '../screens/business/JobsScreen';
import DashboardScreen from '../screens/business/DashboardScreen';
import TransactionsScreen from '../screens/business/TransactionsScreen';
import CustomersScreen from '../screens/business/CustomersScreen';
import OrdersScreen from '../screens/business/OrdersScreen';
import WhatsAppScreen from '../screens/business/WhatsAppScreen';
import MessagesScreen from '../screens/business/MessagesScreen';
import HRScreen from '../screens/business/HRScreen';
import PayrollScreen from '../screens/business/PayrollScreen';
import AdvertiseScreen from '../screens/business/AdvertiseScreen';
import ServicesScreen from '../screens/business/ServicesScreen';
import MarketplaceBusinessScreen from '../screens/business/MarketplaceBusinessScreen';
import InviteScreen from '../screens/business/InviteScreen';
import SmartInsightsScreen from '../screens/business/SmartInsightsScreen';
import TaxFilingScreen from '../screens/business/TaxFilingScreen';
import TransportScreen from '../screens/business/TransportScreen';
import TablesScreen from '../screens/business/TablesScreen';
import DeliveryScreen from '../screens/business/DeliveryScreen';
import MarketplaceProfileEditor from '../screens/business/MarketplaceProfileEditor';
import ReceiptScreen from '../screens/business/ReceiptScreen';
import TransactionDetailScreen from '../screens/business/TransactionDetailScreen';
import PasscodeVerificationScreen from '../screens/business/PasscodeVerificationScreen';

// Import Dual QR Payment screens
import DualQRScreen from '../screens/DualQRScreen';
import BusinessQRScreen from '../screens/BusinessQRScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import P2PPaymentScreen from '../screens/P2PPaymentScreen';
import P2PHistoryScreen from '../screens/P2PHistoryScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import DiagnosticsScreen from '../screens/DiagnosticsScreen';

// Import Delivery Address screens
import DeliveryAddressesScreen from '../screens/DeliveryAddressesScreen';
import AddEditAddressScreen from '../screens/AddEditAddressScreen';
import AddressMapPickerScreen from '../screens/AddressMapPickerScreen';

// Import Wallet screens
import WalletHomeScreen from '../screens/wallet/WalletHomeScreen';
import SendMoneyScreen from '../screens/wallet/SendMoneyScreen';
import ReceiveMoneyScreen from '../screens/wallet/ReceiveMoneyScreen';
import TopUpScreen from '../screens/wallet/TopUpScreen';
import WalletSettingsScreen from '../screens/wallet/WalletSettingsScreen';
import WalletRequestsScreen from '../screens/wallet/WalletRequestsScreen';

// Import Business Wallet screens
import BusinessWalletHomeScreen from '../screens/BusinessWalletHomeScreen';
import WalletBankTransferScreen from '../screens/WalletBankTransferScreen';

// Import Courier screens
import CourierDashboardScreen from '../screens/courier/CourierDashboardScreen';
import RequestDeliveryScreen from '../screens/courier/RequestDeliveryScreen';
import DeliveryTrackingScreen from '../screens/courier/DeliveryTrackingScreen';
import OrderListScreen from '../screens/courier/OrderListScreen';
import CourierVerificationScreen from '../screens/courier/CourierVerificationScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  const { user } = useAuth();
  const hasBusiness = user?.has_business || false;
  
  console.log('🎯 TabNavigator - User data:', user);
  console.log('🎯 TabNavigator - Has business:', hasBusiness);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Call':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'Discover':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Purchases':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Business':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'Chats':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Me':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 104,
          paddingBottom: 35,
          paddingTop: 0,
          backgroundColor: '#14532d',
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: -20,
          marginBottom: 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Call" component={CallScreen} />
      <Tab.Screen name="Discover" component={MarketplaceScreen} />
      {hasBusiness && (
        <Tab.Screen name="Business" component={BusinessMenuScreen} />
      )}
      <Tab.Screen name="Chats" component={ChatScreen} />
      <Tab.Screen name="Me" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      {/* Common screens */}
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Purchases" component={PurchasesScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="GroupCreation" component={GroupCreationScreen} />
      <Stack.Screen name="BusinessRegistration" component={BusinessRegistrationScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      
      {/* Delivery Address screens */}
      <Stack.Screen name="DeliveryAddresses" component={DeliveryAddressesScreen} />
      <Stack.Screen name="AddEditAddress" component={AddEditAddressScreen} />
      <Stack.Screen name="AddressMapPicker" component={AddressMapPickerScreen} />
      
      {/* Business screens for navigation */}
      <Stack.Screen name="POS" component={DualModePOSScreen} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Employees" component={EmployeesScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="Banking" component={BankingScreen} />
      <Stack.Screen name="MenuManagement" component={MenuManagementScreen} />
      <Stack.Screen name="BankingSetup" component={BankingSetupScreen} />
      <Stack.Screen name="CurrencyPreference" component={CurrencyPreferenceScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="PasscodeVerification" component={PasscodeVerificationScreen} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="WhatsApp" component={WhatsAppScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="HR" component={HRScreen} />
      <Stack.Screen name="Payroll" component={PayrollScreen} />
      <Stack.Screen name="Advertise" component={MarketplaceProfileEditor} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="MarketplaceBusiness" component={MarketplaceBusinessScreen} />
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="SmartInsights" component={SmartInsightsScreen} />
      <Stack.Screen name="TaxFiling" component={TaxFilingScreen} />
      <Stack.Screen name="Transport" component={TransportScreen} />
      <Stack.Screen name="Tables" component={TablesScreen} />
      <Stack.Screen name="Delivery" component={DeliveryScreen} />
      <Stack.Screen name="MarketplaceSettings" component={MarketplaceProfileEditor} />
      {/* Dual QR Payment screens - Phase 1 */}
      <Stack.Screen name="DualQR" component={DualQRScreen} />
      <Stack.Screen name="BusinessQR" component={BusinessQRScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="P2PPayment" component={P2PPaymentScreen} />
      <Stack.Screen name="P2PHistory" component={P2PHistoryScreen} />
      
      {/* Mobile Money Wallet screens */}
      <Stack.Screen name="WalletHome" component={WalletHomeScreen} />
      <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
      <Stack.Screen name="ReceiveMoney" component={ReceiveMoneyScreen} />
      <Stack.Screen name="TopUp" component={TopUpScreen} />
      <Stack.Screen name="WalletSettings" component={WalletSettingsScreen} />
      <Stack.Screen name="WalletRequests" component={WalletRequestsScreen} />
      
      {/* Business Wallet screens */}
      <Stack.Screen name="BusinessWallet" component={BusinessWalletHomeScreen} />
      <Stack.Screen name="WalletBankTransfer" component={WalletBankTransferScreen} />
      <Stack.Screen name="WalletTopUp" component={TopUpScreen} />
      <Stack.Screen name="WalletTransactions" component={TransactionsScreen} />
      
      {/* Courier screens */}
      <Stack.Screen name="CourierDashboard" component={CourierDashboardScreen} />
      <Stack.Screen name="RequestDelivery" component={RequestDeliveryScreen} />
      <Stack.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} />
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      <Stack.Screen name="CourierVerification" component={CourierVerificationScreen} />
    </Stack.Navigator>
  );
}