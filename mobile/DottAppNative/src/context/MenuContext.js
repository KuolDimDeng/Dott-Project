import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import menuApi from '../services/menuApi';

const MenuContext = createContext();

export const useMenuContext = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within MenuProvider');
  }
  return context;
};

export const MenuProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([
    {
      id: '1',
      name: 'Grilled Chicken Breast',
      description: 'Tender grilled chicken breast with rosemary herbs and garlic butter',
      price: 24.99,
      category: 'main_courses',
      image: 'https://images.unsplash.com/photo-1532635241-17e820acc59f?w=400',
      available: true,
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      preparationTime: 25,
      stock: 45,
      sku: 'MC001',
    },
    {
      id: '2',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with parmesan cheese and homemade caesar dressing',
      price: 16.99,
      category: 'appetizers',
      image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
      available: true,
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      preparationTime: 10,
      stock: 30,
      sku: 'APP001',
    },
    {
      id: '3',
      name: 'Chocolate Lava Cake',
      description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
      price: 12.99,
      category: 'desserts',
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400',
      available: true,
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      preparationTime: 20,
      stock: 25,
      sku: 'DES001',
    },
    {
      id: '4',
      name: 'Americano',
      description: 'Rich black coffee made with espresso and hot water',
      price: 4.50,
      category: 'coffee',
      image: 'https://images.unsplash.com/photo-1545665225-b23b99e4d45e?w=400',
      available: true,
      vegetarian: true,
      vegan: true,
      glutenFree: true,
      preparationTime: 5,
      stock: 120,
      sku: 'COF001',
    },
    {
      id: '5',
      name: 'Margherita Pizza',
      description: 'Classic pizza with fresh mozzarella, tomato sauce, and basil',
      price: 18.99,
      category: 'main_courses',
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
      available: true,
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      preparationTime: 18,
      stock: 35,
      sku: 'MC002',
    },
    {
      id: '6',
      name: 'Fresh Orange Juice',
      description: 'Freshly squeezed orange juice',
      price: 6.99,
      category: 'beverages',
      image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
      available: true,
      vegetarian: true,
      vegan: true,
      glutenFree: true,
      preparationTime: 3,
      stock: 80,
      sku: 'BEV001',
    },
  ]);

  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Items', count: 0, icon: 'grid-outline' },
    { id: 'appetizers', name: 'Appetizers', count: 0, icon: 'restaurant-outline' },
    { id: 'main_courses', name: 'Main Courses', count: 0, icon: 'fast-food-outline' },
    { id: 'desserts', name: 'Desserts', count: 0, icon: 'ice-cream-outline' },
    { id: 'beverages', name: 'Beverages', count: 0, icon: 'wine-outline' },
    { id: 'coffee', name: 'Coffee & Tea', count: 0, icon: 'cafe-outline' },
  ]);

  // Load menu items from backend and storage
  useEffect(() => {
    loadMenuItems();
  }, []);

  // Save menu items whenever they change
  useEffect(() => {
    saveMenuItems();
    updateCategoryCounts();
  }, [menuItems]);

  const loadMenuItems = async () => {
    try {
      console.log('🍽️ MenuContext: Loading menu items...');
      
      // Try to load from backend first
      try {
        const response = await menuApi.getMenuItems();
        if (response && response.results && response.results.length > 0) {
          console.log('🍽️ MenuContext: Loaded from backend:', response.results.length);
          setMenuItems(response.results);
          await AsyncStorage.setItem('restaurantMenuItems', JSON.stringify(response.results));
          return;
        }
      } catch (apiError) {
        console.log('🍽️ MenuContext: Backend load failed, trying cache:', apiError.message);
      }

      // Fallback to cached data
      const stored = await AsyncStorage.getItem('restaurantMenuItems');
      if (stored) {
        const parsedItems = JSON.parse(stored);
        console.log('🍽️ MenuContext: Loaded from cache:', parsedItems.length);
        setMenuItems(parsedItems);
      } else {
        console.log('🍽️ MenuContext: Using default menu items');
        // Keep the default items as fallback
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const saveMenuItems = async () => {
    try {
      await AsyncStorage.setItem('restaurantMenuItems', JSON.stringify(menuItems));
    } catch (error) {
      console.error('Error saving menu items:', error);
    }
  };

  const updateCategoryCounts = () => {
    const updatedCategories = categories.map(category => ({
      ...category,
      count: category.id === 'all' 
        ? menuItems.length 
        : menuItems.filter(item => item.category === category.id).length
    }));
    setCategories(updatedCategories);
  };

  const addMenuItem = async (newItem) => {
    try {
      console.log('🍽️ MenuContext: Adding menu item:', newItem.name);
      
      // Try to save to backend first
      const backendItem = await menuApi.createMenuItem(newItem);
      console.log('🍽️ MenuContext: Item saved to backend:', backendItem.id);
      
      // Add to local state
      setMenuItems(prev => [...prev, backendItem]);
      console.log('🍽️ MenuContext: Item added to local state');
      
      return backendItem;
    } catch (error) {
      console.error('🍽️ MenuContext: Failed to save to backend:', error);
      
      // Fallback to local-only save
      const itemWithId = {
        ...newItem,
        id: Date.now().toString(),
        available: true,
        synced: false, // Mark as needing sync
      };
      setMenuItems(prev => [...prev, itemWithId]);
      console.log('🍽️ MenuContext: Added item locally only:', itemWithId.name);
      
      return itemWithId;
    }
  };

  const updateMenuItem = async (itemId, updates) => {
    try {
      console.log('🍽️ MenuContext: Updating menu item:', itemId);
      
      // Try to update on backend first
      await menuApi.updateMenuItem(itemId, updates);
      console.log('🍽️ MenuContext: Item updated on backend');
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates, synced: true } : item
      ));
      
    } catch (error) {
      console.error('🍽️ MenuContext: Failed to update on backend:', error);
      
      // Update locally and mark as needing sync
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates, synced: false } : item
      ));
    }
  };

  const deleteMenuItem = async (itemId) => {
    try {
      console.log('🍽️ MenuContext: Deleting menu item:', itemId);
      
      // Try to delete from backend first
      await menuApi.deleteMenuItem(itemId);
      console.log('🍽️ MenuContext: Item deleted from backend');
      
      // Remove from local state
      setMenuItems(prev => prev.filter(item => item.id !== itemId));
      
    } catch (error) {
      console.error('🍽️ MenuContext: Failed to delete from backend:', error);
      
      // Mark as deleted locally (could implement soft delete)
      setMenuItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const toggleItemAvailability = async (itemId) => {
    try {
      const item = menuItems.find(item => item.id === itemId);
      if (!item) return;
      
      // Try to toggle on backend first
      await menuApi.toggleItemAvailability(itemId);
      console.log('🍽️ MenuContext: Item availability toggled on backend');
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, available: !item.available, synced: true } : item
      ));
      
    } catch (error) {
      console.error('🍽️ MenuContext: Failed to toggle availability on backend:', error);
      
      // Update locally and mark as needing sync
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, available: !item.available, synced: false } : item
      ));
    }
  };

  const getAvailableMenuItems = () => {
    return menuItems.filter(item => item.available && item.stock > 0);
  };

  const getMenuItemsByCategory = (categoryId) => {
    if (categoryId === 'all') return menuItems;
    return menuItems.filter(item => item.category === categoryId);
  };

  const updateStock = (itemId, newStock) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, stock: newStock } : item
    ));
  };

  const decreaseStock = (itemId, quantity = 1) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, stock: Math.max(0, item.stock - quantity) } : item
    ));
  };

  const value = {
    menuItems,
    categories,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
    getAvailableMenuItems,
    getMenuItemsByCategory,
    updateStock,
    decreaseStock,
    setMenuItems,
    setCategories,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};