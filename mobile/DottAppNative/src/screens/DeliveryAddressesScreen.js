import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DeliveryAddressesScreen({ navigation }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultAddressId, setDefaultAddressId] = useState(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Load from AsyncStorage first (offline support)
      const cachedAddresses = await AsyncStorage.getItem(`addresses_${user?.id}`);
      const cachedDefault = await AsyncStorage.getItem(`defaultAddress_${user?.id}`);
      
      if (cachedAddresses) {
        setAddresses(JSON.parse(cachedAddresses));
        setDefaultAddressId(cachedDefault);
      }

      // TODO: Replace with actual API call
      // const response = await api.get('/user/delivery-addresses/');
      // setAddresses(response.data.addresses);
      // setDefaultAddressId(response.data.default_address_id);
      
      // Mock data for now
      setTimeout(() => {
        const mockAddresses = [
          {
            id: '1',
            title: 'Home',
            address: 'Juba Teaching Hospital Road, Juba, South Sudan',
            latitude: 4.8594,
            longitude: 31.5713,
            isDefault: true,
            type: 'home'
          },
          {
            id: '2', 
            title: 'Office',
            address: 'University of Juba, Juba, South Sudan',
            latitude: 4.8400,
            longitude: 31.5825,
            isDefault: false,
            type: 'work'
          }
        ];
        setAddresses(mockAddresses);
        setDefaultAddressId('1');
        
        // Cache the data
        AsyncStorage.setItem(`addresses_${user?.id}`, JSON.stringify(mockAddresses));
        AsyncStorage.setItem(`defaultAddress_${user?.id}`, '1');
        
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading addresses:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      // TODO: API call to set default
      // await api.patch(`/user/delivery-addresses/${addressId}/set-default/`);
      
      // Update local state
      setDefaultAddressId(addressId);
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      setAddresses(updatedAddresses);
      
      // Update cache
      await AsyncStorage.setItem(`addresses_${user?.id}`, JSON.stringify(updatedAddresses));
      await AsyncStorage.setItem(`defaultAddress_${user?.id}`, addressId);
      
      Alert.alert('Success', 'Default delivery address updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update default address');
    }
  };

  const handleDeleteAddress = (addressId) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: API call to delete
              // await api.delete(`/user/delivery-addresses/${addressId}/`);
              
              const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
              setAddresses(updatedAddresses);
              
              // If deleted address was default, set first address as default
              if (defaultAddressId === addressId && updatedAddresses.length > 0) {
                setDefaultAddressId(updatedAddresses[0].id);
                await AsyncStorage.setItem(`defaultAddress_${user?.id}`, updatedAddresses[0].id);
              }
              
              await AsyncStorage.setItem(`addresses_${user?.id}`, JSON.stringify(updatedAddresses));
              
              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address');
            }
          }
        }
      ]
    );
  };

  const getAddressIcon = (type) => {
    switch (type) {
      case 'home': return 'home';
      case 'work': return 'business';
      default: return 'location';
    }
  };

  const renderAddressCard = (address) => {
    const isDefault = address.id === defaultAddressId;
    
    return (
      <View key={address.id} style={styles.addressCard}>
        <View style={styles.addressHeader}>
          <View style={styles.addressTitleRow}>
            <Icon name={getAddressIcon(address.type)} size={20} color="#2563eb" />
            <Text style={styles.addressTitle}>{address.title}</Text>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.addressText}>{address.address}</Text>
        
        <View style={styles.addressActions}>
          {!isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(address.id)}
            >
              <Icon name="checkmark-circle-outline" size={16} color="#059669" />
              <Text style={styles.actionButtonText}>Set Default</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddEditAddress', { 
              address, 
              isEdit: true 
            })}
          >
            <Icon name="pencil-outline" size={16} color="#2563eb" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          {addresses.length > 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteAddress(address.id)}
            >
              <Icon name="trash-outline" size={16} color="#ef4444" />
              <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEditAddress', { isEdit: false })}
        >
          <Icon name="add" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAddresses(true)}
              colors={['#2563eb']}
            />
          }
        >
          {addresses.length > 0 ? (
            <>
              {/* Info Section */}
              <View style={styles.infoSection}>
                <Icon name="information-circle" size={20} color="#2563eb" />
                <Text style={styles.infoText}>
                  Add delivery addresses to speed up your orders. Couriers will use these locations to deliver your items.
                </Text>
              </View>

              {/* Addresses List */}
              <View style={styles.addressesSection}>
                {addresses.map(renderAddressCard)}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="location-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No delivery addresses</Text>
              <Text style={styles.emptySubtitle}>
                Add your first delivery address to start ordering
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => navigation.navigate('AddEditAddress', { isEdit: false })}
              >
                <Icon name="add-circle" size={20} color="white" />
                <Text style={styles.emptyAddButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add New Address Button */}
          {addresses.length > 0 && (
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => navigation.navigate('AddEditAddress', { isEdit: false })}
            >
              <Icon name="add-circle-outline" size={24} color="#2563eb" />
              <Text style={styles.addNewButtonText}>Add New Address</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 12,
    lineHeight: 20,
  },
  addressesSection: {
    marginBottom: 20,
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    marginBottom: 8,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addNewButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});