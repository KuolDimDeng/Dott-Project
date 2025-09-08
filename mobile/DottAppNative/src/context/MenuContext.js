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
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error', 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [failedSyncs, setFailedSyncs] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

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
      setIsLoading(true);
      setSyncStatus('syncing');
      
      // Try to load from backend first
      try {
        const response = await menuApi.getMenuItems();
        const items = response?.results || response || [];
        
        if (items.length > 0) {
          console.log('🍽️ MenuContext: Loaded from backend:', items.length);
          setMenuItems(items);
          await AsyncStorage.setItem('restaurantMenuItems', JSON.stringify(items));
          await AsyncStorage.setItem('lastMenuSync', new Date().toISOString());
          setLastSyncTime(new Date());
          setSyncStatus('synced');
          
          // Retry any failed syncs
          if (failedSyncs.length > 0) {
            retrySyncFailedItems();
          }
          return;
        } else {
          console.log('🍽️ MenuContext: No items from backend, checking cache');
        }
      } catch (apiError) {
        console.log('🍽️ MenuContext: Backend load failed:', apiError.message);
        setSyncStatus('error');
      }

      // Fallback to cached data
      const stored = await AsyncStorage.getItem('restaurantMenuItems');
      if (stored) {
        const parsedItems = JSON.parse(stored);
        console.log('🍽️ MenuContext: Loaded from cache:', parsedItems.length);
        setMenuItems(parsedItems);
        setSyncStatus('offline');
        
        // Check for unsyced items
        const unsynced = parsedItems.filter(item => item.synced === false);
        if (unsynced.length > 0) {
          console.log('⚠️ Found', unsynced.length, 'unsynced items');
          setFailedSyncs(unsynced);
        }
      } else {
        console.log('🍽️ MenuContext: No menu items available');
        setSyncStatus('offline');
        setMenuItems([]); // Start with empty menu, user needs to add items
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
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
      setSyncStatus('syncing');
      
      // Try to save to backend first
      const backendItem = await menuApi.createMenuItem(newItem);
      console.log('🍽️ MenuContext: Item saved to backend:', backendItem.id);
      
      // Add to local state with synced flag
      const syncedItem = { ...backendItem, synced: true, syncTime: new Date().toISOString() };
      setMenuItems(prev => [...prev, syncedItem]);
      await saveMenuItems();
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      
      console.log('✅ Item successfully synced to backend');
      return syncedItem;
    } catch (error) {
      console.error('🍽️ MenuContext: Failed to save to backend:', error.message);
      setSyncStatus('error');
      
      // Fallback to local-only save
      const itemWithId = {
        ...newItem,
        id: `local_${Date.now()}`,
        available: true,
        synced: false,
        syncError: error.message,
        createdAt: new Date().toISOString(),
      };
      
      setMenuItems(prev => [...prev, itemWithId]);
      setFailedSyncs(prev => [...prev, itemWithId]);
      await saveMenuItems();
      
      console.log('⚠️ Item saved locally (will retry sync):', itemWithId.name);
      
      // Schedule retry
      setTimeout(() => retrySyncItem(itemWithId), 5000);
      
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

  // Retry syncing failed items
  const retrySyncFailedItems = async () => {
    if (failedSyncs.length === 0) return;
    
    console.log('🔄 Retrying sync for', failedSyncs.length, 'items');
    setSyncStatus('syncing');
    
    for (const item of failedSyncs) {
      await retrySyncItem(item);
    }
  };
  
  const retrySyncItem = async (item) => {
    try {
      console.log('🔄 Retrying sync for:', item.name);
      
      // Remove local ID prefix if present
      const itemData = { ...item };
      delete itemData.id;
      delete itemData.synced;
      delete itemData.syncError;
      
      const backendItem = await menuApi.createMenuItem(itemData);
      
      // Update local state
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...backendItem, synced: true, syncTime: new Date().toISOString() } : i
      ));
      
      // Remove from failed syncs
      setFailedSyncs(prev => prev.filter(i => i.id !== item.id));
      
      console.log('✅ Successfully synced:', item.name);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      
    } catch (error) {
      console.error('❌ Retry failed for:', item.name, error.message);
      // Update sync error
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, syncError: error.message, lastRetry: new Date().toISOString() } : i
      ));
    }
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
    // Sync status
    isLoading,
    syncStatus,
    lastSyncTime,
    failedSyncs,
    retrySyncFailedItems,
    loadMenuItems,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};