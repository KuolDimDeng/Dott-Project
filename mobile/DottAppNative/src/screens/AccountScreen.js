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
  const { user, logout } = useAuth();
  const hasBusiness = user?.has_business || false;
  
  console.log('👤 AccountScreen - User data:', user);
  console.log('👤 AccountScreen - User role:', user?.role);
  console.log('👤 AccountScreen - Has business:', hasBusiness);

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

  // Unified menu sections based on business ownership
  const getMenuSections = () => {
    if (hasBusiness) {
      // Business users get unified account with all features
      return [
        {
          title: 'Personal',
          items: [
            { icon: 'person', title: 'Personal Info', subtitle: 'Your profile details' },
            { icon: 'receipt', title: 'Order History', subtitle: 'Your marketplace purchases' },
            { icon: 'location', title: 'Delivery Addresses', subtitle: 'Your delivery locations' },
            { icon: 'heart', title: 'Favorites', subtitle: 'Saved items and businesses' },
            { icon: 'card', title: 'Payment Methods', subtitle: 'Personal payment options' },
          ]
        },
        {
          title: 'Business Settings',
          items: [
            { icon: 'business', title: 'Business Profile', subtitle: 'Company information' },
            { icon: 'cash', title: 'Currency Preference', subtitle: 'Business display currency', screen: 'CurrencyPreference' },
            { icon: 'people', title: 'Team & Permissions', subtitle: 'Staff access control' },
            { icon: 'wallet', title: 'Banking & Payouts', subtitle: 'Bank accounts & settlements', screen: 'BankingSetup' },
            { icon: 'document-text', title: 'Tax & Compliance', subtitle: 'Tax settings and documents' },
            { icon: 'bar-chart', title: 'Subscription', subtitle: 'Plan and billing' },
          ]
        },
        {
          title: 'General',
          items: [
            { icon: 'notifications', title: 'Notifications', subtitle: 'Alert preferences' },
            { icon: 'shield-checkmark', title: 'Security', subtitle: 'Password and 2FA' },
            { icon: 'globe', title: 'Language & Region', subtitle: 'App preferences' },
            { icon: 'help-circle', title: 'Help & Support', subtitle: 'Get assistance' },
            { icon: 'information-circle', title: 'About', subtitle: 'App version and legal' },
          ]
        }
      ];
    } else {
      // Non-business users get consumer menu
      return [
        {
          title: 'Personal',
          items: [
            { icon: 'person', title: 'Personal Info', subtitle: 'Your profile details' },
            { icon: 'receipt', title: 'Order History', subtitle: 'Your purchases' },
            { icon: 'location', title: 'Delivery Addresses', subtitle: 'Your locations' },
            { icon: 'heart', title: 'Favorites', subtitle: 'Saved items' },
            { icon: 'card', title: 'Payment Methods', subtitle: 'Cards and wallets' },
          ]
        },
        {
          title: 'Settings',
          items: [
            { icon: 'notifications', title: 'Notifications', subtitle: 'Alert preferences' },
            { icon: 'shield-checkmark', title: 'Security', subtitle: 'Password settings' },
            { icon: 'help-circle', title: 'Help & Support', subtitle: 'Get assistance' },
            { icon: 'information-circle', title: 'About', subtitle: 'App information' },
          ]
        }
      ];
    }
  };

  const menuSections = getMenuSections();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Me</Text>
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
          
          {/* Business Status Badge */}
          {hasBusiness && (
            <View style={styles.businessBadge}>
              <Icon name="business" size={12} color="#059669" />
              <Text style={styles.businessText}>Business Owner</Text>
            </View>
          )}
        </View>

        {/* QR Code Section - Hidden under caret */}
        <TouchableOpacity 
          style={styles.qrSection}
          onPress={() => navigation.navigate('DualQR')}
        >
          <View style={styles.qrSectionContent}>
            <View style={[styles.qrIconContainer, { backgroundColor: '#2563eb' }]}>
              <Icon name="qr-code-outline" size={24} color="white" />
            </View>
            <View style={styles.qrTextContainer}>
              <Text style={styles.qrTitle}>QR Code</Text>
              <Text style={styles.qrSubtitle}>Your payment QR code</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Create Business Button for Non-Business Users */}
        {!hasBusiness && (
          <TouchableOpacity style={styles.createBusinessButton} onPress={handleCreateBusiness}>
            <View style={styles.createBusinessContent}>
              <Icon name="business-outline" size={24} color="#2563eb" />
              <View style={styles.createBusinessTextContainer}>
                <Text style={styles.createBusinessTitle}>Start a Business</Text>
                <Text style={styles.createBusinessSubtitle}>Register your business on Dott</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color="#2563eb" />
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.menuItem}
                onPress={() => {
                  if (item.screen) {
                    navigation.navigate(item.screen);
                  }
                }}
              >
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
        ))}

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
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
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
  qrSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  qrSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qrIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrTextContainer: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  qrSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
});