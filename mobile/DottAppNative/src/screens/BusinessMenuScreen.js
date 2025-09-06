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
import { useAuth } from '../context/AuthContext';
import { useBusinessContext } from '../context/BusinessContext';
import { useNavigation } from '@react-navigation/native';
import POSScreen from './business/POSScreen';
import TimesheetScreen from './business/TimesheetScreen';
import ReportsScreen from './business/ReportsScreen';
import EmployeesScreen from './business/EmployeesScreen';
import InventoryScreen from './business/InventoryScreen';
import ExpensesScreen from './business/ExpensesScreen';
import InvoicesScreen from './business/InvoicesScreen';
import BankingScreen from './business/BankingScreen';

export default function BusinessMenuScreen() {
  const { user, switchMode } = useAuth();
  const { businessData } = useBusinessContext();
  const navigation = useNavigation();
  const businessName = businessData?.businessName || user?.business_name || user?.full_name || 'Business';

  const menuItems = [
    { icon: 'cash-outline', title: 'POS Terminal', color: '#10b981', screen: 'POS' },
    { icon: 'time-outline', title: 'Timesheet', color: '#3b82f6', screen: 'Timesheet' },
    { icon: 'bar-chart-outline', title: 'Reports', color: '#8b5cf6', screen: 'Reports' },
    { icon: 'people-outline', title: 'Employees', color: '#f59e0b', screen: 'Employees' },
    { icon: 'cube-outline', title: 'Inventory', color: '#ec4899', screen: 'Inventory' },
    { icon: 'card-outline', title: 'Expenses', color: '#ef4444', screen: 'Expenses' },
    { icon: 'document-text-outline', title: 'Invoices', color: '#06b6d4', screen: 'Invoices' },
    { icon: 'business-outline', title: 'Banking', color: '#84cc16', screen: 'Banking' },
    { icon: 'ellipsis-horizontal-outline', title: 'More', color: '#6b7280', screen: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Business Dashboard</Text>
          <Text style={styles.userName}>{businessName}</Text>
        </View>
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => switchMode('consumer')}
        >
          <Text style={styles.switchButtonText}>Switch to Consumer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Today's Sales</Text>
        <Text style={styles.statsValue}>$0.00</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                } else {
                  console.log(`Navigate to ${item.title}`);
                }
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Icon name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
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
  },
  switchButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 12,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  menuItem: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
});