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
          
          // Normalize field names for consistent usage
          const normalizedItems = items.map(item => ({
            ...item,
            // Ensure availability field is consistent
            available: item.is_available !== false && item.available !== false,
            // Ensure stock fields are consistent  
            stock: item.stock_quantity || item.stock || 0,
            // Map price fields
            price: item.effective_price || item.price || 0,
            // Ensure other fields exist
            category: item.category || 'main_courses',
            image: item.image || item.image_url || null,
            description: item.description || '',
          }));
          
          console.log('🍽️ MenuContext: Normalized items:', normalizedItems.length);
          console.log('🍽️ MenuContext: First item after normalization:', normalizedItems[0]);
          
          setMenuItems(normalizedItems);
          await AsyncStorage.setItem('restaurantMenuItems', JSON.stringify(normalizedItems));
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
      console.log('🍽️ MenuContext: Backend response:', backendItem);
      
      // Add to local state with synced flag, ensuring all numeric fields are numbers
      const syncedItem = { 
        ...backendItem,
        // Ensure all numeric fields are properly typed
        price: typeof backendItem.price === 'number' ? backendItem.price : parseFloat(backendItem.price) || 0,
        stock: typeof backendItem.stock === 'number' ? backendItem.stock : parseInt(backendItem.stock) || 0,
        estimatedCost: backendItem.cost ? (typeof backendItem.cost === 'number' ? backendItem.cost : parseFloat(backendItem.cost) || 0) : 0,
        preparationTime: backendItem.preparation_time ? (typeof backendItem.preparation_time === 'number' ? backendItem.preparation_time : parseInt(backendItem.preparation_time) || 0) : 0,
        available: backendItem.is_available !== false,
        // Ensure image is a string URL (don't use empty strings)
        image: (backendItem.image && backendItem.image !== '') ? backendItem.image : 
               (backendItem.image_url && backendItem.image_url !== '') ? backendItem.image_url : null,
        // Ensure text fields are strings
        name: String(backendItem.name || ''),
        description: String(backendItem.description || ''),
        category: String(backendItem.category || ''),
        synced: true, 
        syncTime: new Date().toISOString() 
      };
      
      console.log('🍽️ MenuContext: Synced item prepared:', syncedItem);
      
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
      console.log('🍽️ MenuContext: Update data:', {
        ...updates,
        photo: updates.photo ? 'File object present' : 'No photo'
      });
      
      // Try to update on backend first
      const response = await menuApi.updateMenuItem(itemId, updates);
      console.log('🍽️ MenuContext: Backend response:', response);
      console.log('🍽️ MenuContext: Response type:', typeof response);
      console.log('🍽️ MenuContext: Response keys:', response ? Object.keys(response) : 'null');
      
      // Remove photo field from updates as it's a file object, not the URL
      const { photo, ...cleanUpdates } = updates;
      
      // Update local state carefully, ensuring all values are properly formatted
      setMenuItems(prev => prev.map(item => {
        if (item.id === itemId) {
          console.log('🍽️ MenuContext: Current item:', item);
          
          // Start with the existing item
          let updatedItem = { ...item };
          
          // Apply clean updates (without photo)
          Object.keys(cleanUpdates).forEach(key => {
            // Ensure price and stock are numbers
            if (key === 'price' || key === 'stock' || key === 'estimatedCost' || key === 'preparationTime') {
              const value = cleanUpdates[key];
              updatedItem[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            } else if (typeof cleanUpdates[key] !== 'object' || cleanUpdates[key] === null) {
              // Only apply non-object values (or null)
              updatedItem[key] = cleanUpdates[key];
            }
          });
          
          // If we got a response from backend, use its data
          if (response && typeof response === 'object') {
            // Update image URL if provided, but DON'T overwrite with empty string
            if (response.image_url && response.image_url !== '') {
              updatedItem.image = response.image_url;
              console.log('🍽️ MenuContext: Updated image from image_url:', response.image_url);
            } else if (response.image && response.image !== '') {
              updatedItem.image = response.image;
              console.log('🍽️ MenuContext: Updated image from image:', response.image);
            } else if (updates.photo) {
              // If we sent a photo but got empty response, it might be processing
              // Keep the existing image or wait for next fetch
              console.log('⚠️ MenuContext: Photo uploaded but no URL returned yet, keeping existing image');
            }
            
            // Ensure backend numeric fields are properly handled
            if (response.price !== undefined) {
              updatedItem.price = typeof response.price === 'number' ? response.price : parseFloat(response.price) || 0;
            }
            if (response.stock !== undefined) {
              updatedItem.stock = typeof response.stock === 'number' ? response.stock : parseInt(response.stock) || 0;
            }
            if (response.cost !== undefined) {
              updatedItem.estimatedCost = typeof response.cost === 'number' ? response.cost : parseFloat(response.cost) || 0;
            }
            if (response.preparation_time !== undefined) {
              updatedItem.preparationTime = typeof response.preparation_time === 'number' ? response.preparation_time : parseInt(response.preparation_time) || 0;
            }
            if (response.is_available !== undefined) {
              updatedItem.available = response.is_available;
            }
          }
          
          // Mark as synced
          updatedItem.synced = true;
          
          console.log('🍽️ MenuContext: Updated item:', updatedItem);
          console.log('🍽️ MenuContext: Updated item price type:', typeof updatedItem.price);
          console.log('🍽️ MenuContext: Updated item stock type:', typeof updatedItem.stock);
          
          return updatedItem;
        }
        return item;
      }));
      
      console.log('✅ MenuContext: Update successful');
      
      // If a photo was uploaded, refresh menu items after a delay to get the image URL
      if (updates.photo) {
        console.log('📸 MenuContext: Photo was uploaded, refreshing menu items in 2 seconds...');
        setTimeout(() => {
          loadMenuItems();
        }, 2000);
      }
      
    } catch (error) {
      console.error('🍽️ MenuContext: Failed to update on backend:', error);
      
      // Remove photo field from updates before merging locally
      const { photo, ...cleanUpdates } = updates;
      
      // Update locally and mark as needing sync, ensuring numeric values
      setMenuItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, synced: false };
          
          Object.keys(cleanUpdates).forEach(key => {
            if (key === 'price' || key === 'stock' || key === 'estimatedCost' || key === 'preparationTime') {
              const value = cleanUpdates[key];
              updatedItem[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            } else if (typeof cleanUpdates[key] !== 'object' || cleanUpdates[key] === null) {
              updatedItem[key] = cleanUpdates[key];
            }
          });
          
          return updatedItem;
        }
        return item;
      }));
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
    return menuItems.filter(item => {
      // Check availability - handle both 'available' and 'is_available' fields
      const isAvailable = item.available !== false && item.is_available !== false;
      
      // Stock check: For POS purposes, only filter out if explicitly out of stock
      // If unlimited_stock = true OR no stock fields defined OR stock > 0, consider available
      const hasStock = item.unlimited_stock === true || 
                      (item.stock === undefined && item.stock_quantity === undefined) || // No stock management
                      (item.stock !== undefined && item.stock > 0) || 
                      (item.stock_quantity !== undefined && item.stock_quantity > 0) ||
                      (item.stock === 0 && item.stock_quantity === undefined && item.unlimited_stock !== false); // Default stock=0 case
      
      console.log('🍔 POS: Item filter check:', {
        name: item.name,
        available: item.available,
        is_available: item.is_available,
        stock: item.stock,
        stock_quantity: item.stock_quantity,
        unlimited_stock: item.unlimited_stock,
        isAvailable,
        hasStock,
        result: isAvailable && hasStock
      });
      
      return isAvailable && hasStock;
    });
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