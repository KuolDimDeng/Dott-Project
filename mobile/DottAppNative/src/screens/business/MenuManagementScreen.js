import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Image,
  TextInput,
  SafeAreaView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMenuContext } from '../../context/MenuContext';
import { useNavigation } from '@react-navigation/native';
import { useBusinessContext } from '../../context/BusinessContext';
import { useCurrency } from '../../context/CurrencyContext';
import AddMenuItemModal from '../../components/AddMenuItemModal';
import inventoryApi from '../../services/inventoryApi';
import { getCurrencyForCountry } from '../../utils/currencyUtils';

const MenuManagementScreen = () => {
  const navigation = useNavigation();
  const { businessData } = useBusinessContext();
  const { currency: currencyFromContext } = useCurrency();
  const { 
    menuItems, 
    categories, 
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem,
    getMenuItemsByCategory,
    setMenuItems,
    setCategories 
  } = useMenuContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  // Use currency from context instead of utility function
  const country = businessData?.businessCountry || 'SS';
  const currencyFromUtility = getCurrencyForCountry(country);
  const currency = currencyFromContext || currencyFromUtility;
  
  console.log('📱 [MenuManagementScreen] === CURRENCY DEBUG ===');
  console.log('📱 [MenuManagementScreen] Currency from context:', currencyFromContext);
  console.log('📱 [MenuManagementScreen] Currency from utility:', currencyFromUtility);
  console.log('📱 [MenuManagementScreen] Final currency being used:', currency);
  console.log('📱 [MenuManagementScreen] Business country:', country);
  

  useEffect(() => {
    updateCategoryCounts();
    loadInventoryItems();
  }, [menuItems]);

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryApi.getProducts();
      setInventoryItems(response.results || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      // Use mock data if API fails
      setInventoryItems([
        { id: 1, name: 'Rice', cost: 2.50 },
        { id: 2, name: 'Cooking Oil', cost: 5.00 },
        { id: 3, name: 'Tomatoes', cost: 3.00 },
        { id: 4, name: 'Chicken', cost: 12.00 },
        { id: 5, name: 'Onions', cost: 2.00 },
      ]);
    }
  };

  const updateCategoryCounts = () => {
    const counts = {
      all: menuItems.length,
      appetizers: menuItems.filter(item => item.category === 'appetizers').length,
      main_courses: menuItems.filter(item => item.category === 'main_courses').length,
      desserts: menuItems.filter(item => item.category === 'desserts').length,
      beverages: menuItems.filter(item => item.category === 'beverages').length,
      coffee: menuItems.filter(item => item.category === 'coffee').length,
    };
    
    setCategories(cats => cats.map(cat => ({
      ...cat,
      count: counts[cat.id] || 0
    })));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleItemAvailability = (itemId) => {
    setMenuItems(items => items.map(item => 
      item.id === itemId 
        ? { ...item, available: !item.available }
        : item
    ));
    
    const item = menuItems.find(i => i.id === itemId);
    Alert.alert(
      'Status Updated',
      `${item.name} is now ${!item.available ? 'available' : 'unavailable'}`
    );
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSaveItem = async (itemData) => {
    try {
      if (editingItem) {
        // Update existing item
        await updateMenuItem(editingItem.id, itemData);
      } else {
        // Add new item
        await addMenuItem(itemData);
      }
    } catch (error) {
      throw error; // Let the modal handle the error display
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMenuItem(item.id)
        },
      ]
    );
  };


  const editItemPrice = (item) => {
    Alert.prompt(
      'Edit Price',
      `Current price: ${currency.symbol}${item.price.toFixed(0)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: (newPrice) => {
            const price = parseFloat(newPrice);
            if (!isNaN(price) && price > 0) {
              setMenuItems(items => items.map(i => 
                i.id === item.id ? { ...i, price } : i
              ));
              Alert.alert('Success', `Price updated to ${currency.symbol}${price.toFixed(0)}`);
            } else {
              Alert.alert('Error', 'Please enter a valid price');
            }
          }
        }
      ],
      'plain-text',
      item.price.toString()
    );
  };

  const editItemDetails = (item) => {
    Alert.alert('Edit Details', `Full editing for ${item.name} coming soon!`);
  };

  const deleteItem = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setMenuItems(items => items.filter(item => item.id !== itemId));
            Alert.alert('Success', 'Menu item deleted');
          }
        }
      ]
    );
  };

  const getFilteredItems = () => {
    let filtered = menuItems;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.menuItem, !item.available && styles.unavailableItem]}
      onPress={() => handleEditItem(item)}
    >
      <View style={styles.itemLeft}>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.itemImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={32} color="#9ca3af" />
            </View>
          )}
          {!item.available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}
        </View>
        
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>{currency.symbol}{item.price.toFixed(0)}</Text>
          </View>
          
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.itemMeta}>
            <View style={styles.itemTags}>
              {item.preparationTime && (
                <View style={styles.timeTag}>
                  <Icon name="time-outline" size={12} color="#6b7280" />
                  <Text style={styles.timeText}>{item.preparationTime}min</Text>
                </View>
              )}
              
              {item.stock !== undefined && (
                <View style={[styles.timeTag, { 
                  backgroundColor: item.stock > 10 ? '#f0fdf4' : item.stock > 0 ? '#fef3c7' : '#fef2f2',
                  borderColor: item.stock > 10 ? '#10b981' : item.stock > 0 ? '#f59e0b' : '#ef4444',
                  borderWidth: 1
                }]}>
                  <Icon 
                    name="cube-outline" 
                    size={12} 
                    color={item.stock > 10 ? '#10b981' : item.stock > 0 ? '#f59e0b' : '#ef4444'} 
                  />
                  <Text style={[styles.timeText, { 
                    color: item.stock > 10 ? '#065f46' : item.stock > 0 ? '#92400e' : '#dc2626'
                  }]}>
                    Stock: {item.stock}
                  </Text>
                </View>
              )}
              
              <View style={styles.dietaryTags}>
                {item.vegetarian && (
                  <View style={[styles.tag, styles.vegTag]}>
                    <Text style={styles.tagText}>V</Text>
                  </View>
                )}
                {item.vegan && (
                  <View style={[styles.tag, styles.veganTag]}>
                    <Text style={styles.tagText}>VG</Text>
                  </View>
                )}
                {item.glutenFree && (
                  <View style={[styles.tag, styles.gfTag]}>
                    <Text style={styles.tagText}>GF</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditItem(item)}
              >
                <Icon name="create-outline" size={16} color="#3b82f6" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statusButton, item.available ? styles.activeStatus : styles.inactiveStatus]}
                onPress={() => toggleItemAvailability(item.id)}
              >
                <Icon 
                  name={item.available ? 'checkmark-circle' : 'pause-circle'} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.statusButtonText}>
                  {item.available ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteItem(item.id)}
              >
                <Icon name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Management</Text>
        <TouchableOpacity onPress={handleAddItem}>
          <Icon name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items by name or description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContentContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              selectedCategory === category.id && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Icon 
              name={category.icon} 
              size={16} 
              color={selectedCategory === category.id ? '#fff' : '#6b7280'} 
            />
            <Text style={[
              styles.categoryTabText,
              selectedCategory === category.id && styles.categoryTabTextActive
            ]}>
              {category.name}
            </Text>
            <View style={[
              styles.categoryBadge,
              selectedCategory === category.id && styles.categoryBadgeActive
            ]}>
              <Text style={[
                styles.categoryCount,
                selectedCategory === category.id && styles.categoryCountActive
              ]}>
                {category.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu Items List */}
      <FlatList
        data={getFilteredItems()}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="restaurant-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>No menu items found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add your first menu item to get started'}
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
              <Text style={styles.addButtonText}>Add Menu Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddItem}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Menu Item Modal */}
      <AddMenuItemModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editingItem}
        categories={categories}
        inventoryItems={inventoryItems}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    maxHeight: 60,
  },
  categoryContentContainer: {
    paddingRight: 16,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryTabActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  categoryTabText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
    marginLeft: 4,
    marginRight: 6,
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryCount: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
  },
  categoryCountActive: {
    color: '#cbd5e1',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unavailableItem: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  itemDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemTags: {
    flex: 1,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  timeText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 2,
  },
  dietaryTags: {
    flexDirection: 'row',
  },
  tag: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    paddingHorizontal: 4,
  },
  vegTag: {
    backgroundColor: '#10b981',
  },
  veganTag: {
    backgroundColor: '#059669',
  },
  gfTag: {
    backgroundColor: '#f59e0b',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  editButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginLeft: 4,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  activeStatus: {
    backgroundColor: '#10b981',
  },
  inactiveStatus: {
    backgroundColor: '#6b7280',
  },
  statusButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  addButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#1e3a8a',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default MenuManagementScreen;