import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import inventoryApi from '../../services/inventoryApi';

export default function StoreCatalogScreen({ route }) {
  const navigation = useNavigation();
  const [storeItems, setStoreItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState({
    price: '',
    cost: '',
    quantity_on_hand: '',
    reorder_point: '',
    location: '',
  });

  useEffect(() => {
    loadStoreItems();
  }, []);

  // Handle scanned product from barcode scanner
  useEffect(() => {
    if (route.params?.scannedProduct) {
      const product = route.params.scannedProduct;
      const barcode = route.params.barcode;

      // Set search query to barcode to show the found product
      setSearchQuery(barcode || product.barcode || '');

      // If product was found, show import modal
      if (product) {
        handleImportItem(product);
      }
    }
  }, [route.params?.scannedProduct]);

  const loadStoreItems = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading store items catalog...');
      // Increased limit to show all catalog items (2008+ items)
      const response = await inventoryApi.getStoreItems({ limit: 2500 });
      console.log('📦 Store items loaded:', response.results?.length || 0);
      setStoreItems(response.results || []);
    } catch (error) {
      console.error('Error fetching store items:', error);
      if (refreshing) {
        Alert.alert('Error', 'Failed to refresh catalog');
      }
      setStoreItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStoreItems();
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const handleScanBarcode = () => {
    navigation.navigate('BarcodeScanner', {
      source: 'catalog',
      onScanSuccess: (product) => {
        // Product found, handle it
        if (product) {
          handleImportItem(product);
        }
      }
    });
  };

  const handleImportItem = (item) => {
    setSelectedItem(item);
    setImportData({
      price: '',
      cost: '',
      quantity_on_hand: '0',
      reorder_point: '5',
      location: 'Main Store',
    });
    setShowImportModal(true);
  };

  const confirmImport = async () => {
    if (!importData.price) {
      Alert.alert('Error', 'Please enter a selling price');
      return;
    }

    try {
      const productData = {
        name: selectedItem.name,
        barcode_number: selectedItem.barcode,
        description: selectedItem.description || '',
        category: selectedItem.category || '',
        brand: selectedItem.brand || '',
        price: parseFloat(importData.price),
        cost: importData.cost ? parseFloat(importData.cost) : null,
        quantity_on_hand: parseInt(importData.quantity_on_hand) || 0,
        reorder_point: parseInt(importData.reorder_point) || 5,
        location: importData.location || 'Main Store',
        image_url: selectedItem.thumbnail_url || selectedItem.image_url,
      };

      console.log('📦 Importing product:', productData);
      await inventoryApi.createProduct(productData);

      Alert.alert(
        'Success',
        `${selectedItem.name} has been added to your inventory!`,
        [
          {
            text: 'View Inventory',
            onPress: () => navigation.navigate('Inventory'),
          },
          {
            text: 'Add More',
            style: 'cancel',
          },
        ]
      );

      setShowImportModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error importing product:', error);
      Alert.alert('Error', 'Failed to add product to inventory. Please try again.');
    }
  };

  const filteredItems = storeItems.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.barcode?.includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  });

  const renderStoreItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleImportItem(item)}
    >
      {item.thumbnail_url || item.image_url ? (
        <Image
          source={{ uri: item.thumbnail_url || item.image_url }}
          style={styles.itemImage}
        />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <Icon name="image-outline" size={30} color="#999" />
        </View>
      )}

      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>

        {item.brand && (
          <Text style={styles.itemBrand}>{item.brand}</Text>
        )}

        <Text style={styles.itemCategory}>
          {item.category || 'Uncategorized'}
        </Text>

        {item.barcode && (
          <Text style={styles.itemBarcode}>{item.barcode}</Text>
        )}

        {item.size && (
          <Text style={styles.itemSize}>Size: {item.size}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleImportItem(item)}
      >
        <Icon name="add-circle" size={32} color="#2563eb" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Product Catalog</Text>
          {!loading && storeItems.length > 0 && (
            <Text style={styles.itemCount}>{storeItems.length} products</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Inventory')}
          style={styles.inventoryButton}
        >
          <Icon name="cube-outline" size={24} color="#333" />
          <Text style={styles.inventoryButtonText}>My Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, barcode, or brand..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanBarcode}
        >
          <Icon name="scan" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Product List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading catalog...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No products found matching your search'
              : 'No products in catalog'}
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderStoreItem}
          keyExtractor={(item) => item.id?.toString() || item.barcode}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563eb']}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 100,
            offset: 100 * index,
            index,
          })}
        />
      )}

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Inventory</Text>
              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.productInfo}>
                  {selectedItem.thumbnail_url && (
                    <Image
                      source={{ uri: selectedItem.thumbnail_url }}
                      style={styles.modalProductImage}
                    />
                  )}
                  <Text style={styles.modalProductName}>{selectedItem.name}</Text>
                  {selectedItem.brand && (
                    <Text style={styles.modalProductBrand}>{selectedItem.brand}</Text>
                  )}
                  <Text style={styles.modalProductBarcode}>
                    Barcode: {selectedItem.barcode}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Selling Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={importData.price}
                    onChangeText={(text) =>
                      setImportData({ ...importData, price: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cost Price</Text>
                  <TextInput
                    style={styles.input}
                    value={importData.cost}
                    onChangeText={(text) =>
                      setImportData({ ...importData, cost: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00 (optional)"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Initial Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={importData.quantity_on_hand}
                    onChangeText={(text) =>
                      setImportData({ ...importData, quantity_on_hand: text })
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Reorder Point</Text>
                  <TextInput
                    style={styles.input}
                    value={importData.reorder_point}
                    onChangeText={(text) =>
                      setImportData({ ...importData, reorder_point: text })
                    }
                    keyboardType="number-pad"
                    placeholder="5"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={importData.location}
                    onChangeText={(text) =>
                      setImportData({ ...importData, location: text })
                    }
                    placeholder="Main Store"
                  />
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmImport}
              >
                <Text style={styles.confirmButtonText}>Add to Inventory</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  itemCount: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  inventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inventoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212529',
  },
  scanButton: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: 12,
    color: '#2563eb',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6c757d',
  },
  itemBarcode: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  itemSize: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  addButton: {
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginLeft: 84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  modalProductBrand: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 4,
  },
  modalProductBarcode: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#212529',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});