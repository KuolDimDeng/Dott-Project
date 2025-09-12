import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useBusinessContext } from '../context/BusinessContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const AVAILABLE_FEATURES = [
  {
    id: 'payroll',
    title: 'Payroll Management',
    description: 'Manage employee payroll, timesheets, and payments',
    icon: 'people-outline',
    price: 15.99,
    color: '#10b981',
    screen: 'PayrollManagement',
    category: 'HR'
  },
  {
    id: 'analytics',
    title: 'Advanced Analytics',
    description: 'Detailed business insights and reporting',
    icon: 'analytics-outline',
    price: 9.99,
    color: '#8b5cf6',
    screen: 'AdvancedAnalytics',
    category: 'Analytics'
  },
  {
    id: 'loyalty',
    title: 'Customer Loyalty',
    description: 'Reward programs and customer retention',
    icon: 'gift-outline',
    price: 12.99,
    color: '#f59e0b',
    screen: 'CustomerLoyalty',
    category: 'Marketing'
  },
  {
    id: 'email_marketing',
    title: 'Email Marketing',
    description: 'Send newsletters and promotional emails',
    icon: 'mail-outline',
    price: 8.99,
    color: '#ef4444',
    screen: 'EmailMarketing',
    category: 'Marketing'
  },
  {
    id: 'reservations',
    title: 'Table Reservations',
    description: 'Online booking and table management',
    icon: 'calendar-outline',
    price: 11.99,
    color: '#3b82f6',
    screen: 'TableReservations',
    category: 'Restaurant'
  },
  {
    id: 'delivery',
    title: 'Delivery Management',
    description: 'Coordinate deliveries and track orders',
    icon: 'car-outline',
    price: 13.99,
    color: '#06b6d4',
    screen: 'DeliveryManagement',
    category: 'Operations'
  },
  {
    id: 'suppliers',
    title: 'Supplier Management',
    description: 'Manage vendors and purchase orders',
    icon: 'business-outline',
    price: 10.99,
    color: '#84cc16',
    screen: 'SupplierManagement',
    category: 'Operations'
  },
  {
    id: 'recipe_costing',
    title: 'Recipe Costing',
    description: 'Calculate food costs and optimize pricing',
    icon: 'calculator-outline',
    price: 7.99,
    color: '#f97316',
    screen: 'RecipeCosting',
    category: 'Restaurant'
  },
  {
    id: 'booking',
    title: 'Appointment Booking',
    description: 'Schedule appointments and services',
    icon: 'time-outline',
    price: 9.99,
    color: '#ec4899',
    screen: 'AppointmentBooking',
    category: 'Services'
  },
  {
    id: 'crm_advanced',
    title: 'Advanced CRM',
    description: 'Customer relationship management tools',
    icon: 'person-add-outline',
    price: 14.99,
    color: '#6366f1',
    screen: 'AdvancedCRM',
    category: 'Sales'
  }
];

const FeatureCard = ({ feature, isSelected, onToggle }) => {
  return (
    <TouchableOpacity
      style={[
        styles.featureCard,
        isSelected && styles.selectedCard
      ]}
      onPress={onToggle}
    >
      <View style={styles.featureHeader}>
        <View style={[styles.iconContainer, { backgroundColor: feature.color + '20' }]}>
          <Icon name={feature.icon} size={24} color={feature.color} />
        </View>
        <View style={styles.featureInfo}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureCategory}>{feature.category}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>${feature.price}</Text>
          <Text style={styles.pricePeriod}>/month</Text>
        </View>
      </View>
      
      <View style={styles.selectionIndicator}>
        <View style={[
          styles.checkbox,
          isSelected && styles.checkedBox
        ]}>
          {isSelected && <Icon name="checkmark" size={16} color="#ffffff" />}
        </View>
        <Text style={[styles.selectText, isSelected && styles.selectedText]}>
          {isSelected ? 'Selected' : 'Select'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function FeatureSelectionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { refreshMenuItems } = useBusinessContext();
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load previously selected features
  useEffect(() => {
    loadSelectedFeatures();
  }, []);

  const loadSelectedFeatures = async () => {
    try {
      const saved = await AsyncStorage.getItem(`selectedFeatures_${user?.id}`);
      if (saved) {
        setSelectedFeatures(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load selected features:', error);
    }
  };

  const toggleFeature = (featureId) => {
    setSelectedFeatures(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(id => id !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const getTotalPrice = () => {
    return selectedFeatures.reduce((total, featureId) => {
      const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
      return total + (feature?.price || 0);
    }, 0);
  };

  const getSelectedFeaturesDetails = () => {
    return selectedFeatures.map(featureId => 
      AVAILABLE_FEATURES.find(f => f.id === featureId)
    ).filter(Boolean);
  };

  const handlePurchase = async () => {
    if (selectedFeatures.length === 0) {
      Alert.alert('No Features Selected', 'Please select at least one feature to continue.');
      return;
    }

    const total = getTotalPrice();
    const featuresText = getSelectedFeaturesDetails()
      .map(f => `• ${f.title} - $${f.price}/month`)
      .join('\n');

    Alert.alert(
      'Confirm Purchase',
      `You are about to add these features:\n\n${featuresText}\n\nTotal: $${total.toFixed(2)}/month\n\nProceed with payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Features',
          onPress: async () => {
            setLoading(true);
            
            try {
              // Save selected features locally
              await AsyncStorage.setItem(
                `selectedFeatures_${user?.id}`, 
                JSON.stringify(selectedFeatures)
              );

              // Show success message
              Alert.alert(
                'Features Added Successfully!',
                `${selectedFeatures.length} feature(s) have been added to your dashboard.\n\nTotal cost: $${total.toFixed(2)}/month`,
                [
                  {
                    text: 'View Dashboard',
                    onPress: () => {
                      // Trigger menu refresh and go back
                      refreshMenuItems?.();
                      navigation.goBack();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Failed to save features:', error);
              Alert.alert('Error', 'Failed to save your selection. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const total = getTotalPrice();
  const selectedCount = selectedFeatures.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Features</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Features List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Select additional features to enhance your business dashboard
        </Text>
        
        {AVAILABLE_FEATURES.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            isSelected={selectedFeatures.includes(feature.id)}
            onToggle={() => toggleFeature(feature.id)}
          />
        ))}
      </ScrollView>

      {/* Bottom Bar */}
      {selectedCount > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.totalContainer}>
            <Text style={styles.selectedCountText}>
              {selectedCount} feature{selectedCount !== 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.totalText}>${total.toFixed(2)}/month</Text>
          </View>
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={handlePurchase}
            disabled={loading}
          >
            <Text style={styles.purchaseButtonText}>
              {loading ? 'Processing...' : 'Add Features'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 20,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  featureCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 18,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  pricePeriod: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkedBox: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalContainer: {
    flex: 1,
  },
  selectedCountText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  purchaseButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 16,
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});