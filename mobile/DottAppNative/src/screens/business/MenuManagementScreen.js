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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useBusinessContext } from '../../context/BusinessContext';

const MenuManagementScreen = () => {
  const navigation = useNavigation();
  const { businessData } = useBusinessContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Items', count: 0 },
    { id: 'appetizers', name: 'Appetizers', count: 0 },
    { id: 'mains', name: 'Main Courses', count: 0 },
    { id: 'desserts', name: 'Desserts', count: 0 },
    { id: 'beverages', name: 'Beverages', count: 0 },
  ]);
  
  const [menuItems, setMenuItems] = useState([
    // Sample data - will be replaced with API data
    {
      id: '1',
      name: 'Grilled Chicken',
      description: 'Tender grilled chicken breast with herbs',
      price: 18.99,
      category: 'mains',
      image: null,
      available: true,
      vegetarian: false,
      vegan: false,
      glutenFree: true,
    },
    {
      id: '2',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with caesar dressing',
      price: 12.99,
      category: 'appetizers',
      image: null,
      available: true,
      vegetarian: true,
      vegan: false,
      glutenFree: false,
    },
    {
      id: '3',
      name: 'Chocolate Cake',
      description: 'Rich chocolate cake with ganache',
      price: 8.99,
      category: 'desserts',
      image: null,
      available: false,
      vegetarian: true,
      vegan: false,
      glutenFree: false,
    },
  ]);

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    // TODO: Fetch menu data from API
    updateCategoryCounts();
  };

  const updateCategoryCounts = () => {
    const counts = {
      all: menuItems.length,
      appetizers: menuItems.filter(item => item.category === 'appetizers').length,
      mains: menuItems.filter(item => item.category === 'mains').length,
      desserts: menuItems.filter(item => item.category === 'desserts').length,
      beverages: menuItems.filter(item => item.category === 'beverages').length,
    };
    
    setCategories(cats => cats.map(cat => ({
      ...cat,
      count: counts[cat.id] || 0
    })));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenuData();
    setRefreshing(false);
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
    navigation.navigate('AddMenuItem');
  };

  const handleEditItem = (item) => {
    navigation.navigate('EditMenuItem', { item });
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
      style={styles.menuItem}
      onPress={() => handleEditItem(item)}
    >
      <View style={styles.itemLeft}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="image-outline" size={24} color="#9ca3af" />
          </View>
        )}
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            <View style={styles.dietaryTags}>
              {item.vegetarian && (
                <View style={[styles.tag, styles.vegTag]}>
                  <Text style={styles.tagText}>V</Text>
                </View>
              )}
              {item.glutenFree && (
                <View style={[styles.tag, styles.gfTag]}>
                  <Text style={styles.tagText}>GF</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.availabilityToggle, !item.available && styles.unavailable]}
        onPress={() => toggleItemAvailability(item.id)}
      >
        <Icon 
          name={item.available ? 'checkmark-circle' : 'close-circle'} 
          size={24} 
          color={item.available ? '#10b981' : '#ef4444'} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Management</Text>
        <TouchableOpacity onPress={handleAddItem}>
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
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
            <Text style={[
              styles.categoryTabText,
              selectedCategory === category.id && styles.categoryTabTextActive
            ]}>
              {category.name}
            </Text>
            <Text style={[
              styles.categoryCount,
              selectedCategory === category.id && styles.categoryCountActive
            ]}>
              ({category.count})
            </Text>
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
            <Icon name="restaurant-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No menu items found</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
              <Text style={styles.addButtonText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddItem}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1e3a8a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  categoryContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
    maxHeight: 50,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryTabActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  categoryCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  categoryCountActive: {
    color: '#cbd5e1',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  dietaryTags: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegTag: {
    backgroundColor: '#10b981',
  },
  gfTag: {
    backgroundColor: '#f59e0b',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  availabilityToggle: {
    padding: 8,
  },
  unavailable: {
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MenuManagementScreen;