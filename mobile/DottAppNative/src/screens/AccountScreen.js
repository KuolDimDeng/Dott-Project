import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountScreen({ navigation }) {
  const { user, userMode, logout } = useAuth();
  
  console.log('👤 AccountScreen - User data:', user);
  console.log('👤 AccountScreen - User role:', user?.role);
  console.log('👤 AccountScreen - Has business:', user?.has_business);
  console.log('👤 AccountScreen - User mode:', userMode);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleCreateBusiness = () => {
    navigation.navigate('BusinessRegistration');
  };

  const businessMenuItems = [
    { icon: 'business', title: 'Business Info', subtitle: 'Manage your business details' },
    { icon: 'people', title: 'Staff Management', subtitle: 'Manage employees and roles' },
    { icon: 'card', title: 'Payment Methods', subtitle: 'Manage payment options' },
    { icon: 'bar-chart', title: 'Analytics', subtitle: 'View business performance' },
    { icon: 'document-text', title: 'Tax Settings', subtitle: 'Configure tax information' },
  ];

  const consumerMenuItems = [
    { icon: 'person', title: 'Personal Info', subtitle: 'Update your profile' },
    { icon: 'card', title: 'Payment Methods', subtitle: 'Manage cards and wallets' },
    { icon: 'receipt', title: 'Order History', subtitle: 'View past orders' },
    { icon: 'location', title: 'Addresses', subtitle: 'Manage delivery addresses' },
  ];

  const generalMenuItems = [
    { icon: 'notifications', title: 'Notifications', subtitle: 'Manage alerts' },
    { icon: 'shield-checkmark', title: 'Security', subtitle: 'Password and authentication' },
    { icon: 'help-circle', title: 'Help & Support', subtitle: 'Get assistance' },
    { icon: 'information-circle', title: 'About', subtitle: 'App information' },
  ];

  const menuItems = userMode === 'business' ? businessMenuItems : consumerMenuItems;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          
          {/* Role Badge */}
          {user?.role && (
            <View style={[styles.roleBadge, styles[`role${user.role}`]]}>
              <Icon name="shield-checkmark" size={14} color="#ffffff" />
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          )}
          
          {/* Mode and Business Status */}
          <View style={styles.statusContainer}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>
                {userMode === 'business' ? 'Business Mode' : 'Consumer Mode'}
              </Text>
            </View>
            {user?.has_business && (
              <View style={styles.businessBadge}>
                <Icon name="business" size={12} color="#059669" />
                <Text style={styles.businessText}>Business Owner</Text>
              </View>
            )}
          </View>
        </View>

        {/* Create Business Button for Consumer Mode */}
        {userMode === 'consumer' && !user?.has_business && (
          <TouchableOpacity style={styles.createBusinessButton} onPress={handleCreateBusiness}>
            <View style={styles.createBusinessContent}>
              <Icon name="business-outline" size={24} color="#2563eb" />
              <View style={styles.createBusinessTextContainer}>
                <Text style={styles.createBusinessTitle}>I have a business</Text>
                <Text style={styles.createBusinessSubtitle}>Register your business</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color="#2563eb" />
          </TouchableOpacity>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>
            {userMode === 'business' ? 'Business Settings' : 'Account Settings'}
          </Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Icon name={item.icon} size={24} color="#6b7280" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>General</Text>
          {generalMenuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Icon name={item.icon} size={24} color="#6b7280" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#4338ca',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  roleOWNER: {
    backgroundColor: '#dc2626',
  },
  roleADMIN: {
    backgroundColor: '#ea580c',
  },
  roleUSER: {
    backgroundColor: '#2563eb',
  },
  roleText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '500',
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  businessText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  createBusinessButton: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createBusinessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createBusinessTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  createBusinessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 2,
  },
  createBusinessSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  menuSection: {
    backgroundColor: 'white',
    marginBottom: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 40,
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginBottom: 24,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 8,
  },
});