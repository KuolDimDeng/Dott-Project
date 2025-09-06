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
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import inventoryApi from '../../services/inventoryApi';

export default function InventoryScreen() {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode_number: '',
    price: '',
    cost: '',
    quantity_on_hand: '',
    reorder_point: '',
    description: '',
    is_active: true,
  });

  const qrRef = React.useRef();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getProducts();
      setProducts(response.products || response || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Don't show alert on initial load to avoid disrupting user experience
      if (refreshing) {
        Alert.alert('Error', 'Failed to refresh products');
      }
      setProducts([]); // Set empty array to show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode_number?.includes(searchQuery)
  );

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      barcode_number: product.barcode_number || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      quantity_on_hand: product.quantity_on_hand?.toString() || '',
      reorder_point: product.reorder_point?.toString() || '',
      description: product.description || '',
      is_active: product.is_active ?? true,
    });
    setEditMode(false);
    setShowProductModal(true);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      sku: '',
      barcode_number: '',
      price: '',
      cost: '',
      quantity_on_hand: '',
      reorder_point: '',
      description: '',
      is_active: true,
    });
    setEditMode(true);
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (!formData.name) {
        Alert.alert('Error', 'Product name is required');
        return;
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        quantity_on_hand: parseInt(formData.quantity_on_hand) || 0,
        reorder_point: parseInt(formData.reorder_point) || 0,
      };

      if (selectedProduct && !editMode) {
        // Update existing product
        await inventoryApi.updateProduct(selectedProduct.id, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        // Create new product
        await inventoryApi.createProduct(productData);
        Alert.alert('Success', 'Product created successfully');
      }

      setShowProductModal(false);
      loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save product');
      console.error(error);
    }
  };

  const handleDeleteProduct = async () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryApi.deleteProduct(selectedProduct.id);
              Alert.alert('Success', 'Product deleted successfully');
              setShowProductModal(false);
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (product) => {
    try {
      await inventoryApi.toggleProductStatus(product.id);
      loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle product status');
      console.error(error);
    }
  };

  const handleShowQR = (product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
  };

  const handleShareQR = async () => {
    try {
      const uri = await qrRef.current.capture();
      await Share.open({
        url: uri,
        message: `QR Code for ${selectedProduct.name}`,
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  const handlePrintQR = () => {
    Alert.alert(
      'Print QR Code',
      'QR code printing will open your device\'s print dialog',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Print', onPress: () => {
          // In a real implementation, this would use a print library
          Alert.alert('Info', 'Print functionality requires additional setup');
        }},
      ]
    );
  };

  const handleAdjustStock = (product, adjustment) => {
    Alert.prompt(
      'Adjust Stock',
      `Current stock: ${product.quantity_on_hand}\nEnter adjustment (+ or -):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adjust',
          onPress: async (value) => {
            try {
              const adj = parseInt(value);
              if (isNaN(adj)) {
                Alert.alert('Error', 'Please enter a valid number');
                return;
              }
              await inventoryApi.adjustStock(product.id, adj);
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to adjust stock');
              console.error(error);
            }
          },
        },
      ],
      'plain-text',
      adjustment > 0 ? `+${adjustment}` : adjustment.toString()
    );
  };

  const renderProduct = ({ item }) => {
    const isLowStock = item.quantity_on_hand <= item.reorder_point;
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
      >
        <View style={styles.productMain}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
            <Text style={styles.productPrice}>${item.price}</Text>
            <Text style={styles.productStock}>
              Stock: {item.quantity_on_hand} units
            </Text>
          </View>
          
          <View style={styles.productActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleShowQR(item)}
            >
              <Icon name="qr-code" size={24} color="#2563eb" />
            </TouchableOpacity>
            
            <Switch
              value={item.is_active}
              onValueChange={() => handleToggleStatus(item)}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={item.is_active ? '#10b981' : '#9ca3af'}
            />
          </View>
        </View>
        
        {isLowStock && (
          <View style={styles.lowStockBadge}>
            <Icon name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ProductModal = () => (
    <Modal
      visible={showProductModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowProductModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowProductModal(false)}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editMode ? 'Edit Product' : selectedProduct ? selectedProduct.name : 'New Product'}
          </Text>
          {selectedProduct && !editMode && (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Icon name="create-outline" size={24} color="#2563eb" />
            </TouchableOpacity>
          )}
          {!selectedProduct && (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter product name"
              editable={editMode}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={styles.input}
              value={formData.sku}
              onChangeText={(text) => setFormData({ ...formData, sku: text })}
              placeholder="Auto-generated if empty"
              editable={editMode}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              value={formData.barcode_number}
              onChangeText={(text) => setFormData({ ...formData, barcode_number: text })}
              placeholder="Enter barcode number"
              editable={editMode}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={editMode}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Cost</Text>
              <TextInput
                style={styles.input}
                value={formData.cost}
                onChangeText={(text) => setFormData({ ...formData, cost: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={editMode}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Quantity on Hand</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity_on_hand}
                onChangeText={(text) => setFormData({ ...formData, quantity_on_hand: text })}
                placeholder="0"
                keyboardType="numeric"
                editable={editMode}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Reorder Point</Text>
              <TextInput
                style={styles.input}
                value={formData.reorder_point}
                onChangeText={(text) => setFormData({ ...formData, reorder_point: text })}
                placeholder="0"
                keyboardType="numeric"
                editable={editMode}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Enter product description"
              multiline
              numberOfLines={4}
              editable={editMode}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                disabled={!editMode}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={formData.is_active ? '#10b981' : '#9ca3af'}
              />
            </View>
          </View>

          {!editMode && selectedProduct && (
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => handleAdjustStock(selectedProduct, 1)}
              >
                <Icon name="add-circle-outline" size={20} color="#2563eb" />
                <Text style={styles.quickActionText}>+1</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => handleAdjustStock(selectedProduct, -1)}
              >
                <Icon name="remove-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.quickActionText}>-1</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => handleAdjustStock(selectedProduct, 10)}
              >
                <Icon name="add-circle" size={20} color="#2563eb" />
                <Text style={styles.quickActionText}>+10</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => handleAdjustStock(selectedProduct, -10)}
              >
                <Icon name="remove-circle" size={20} color="#ef4444" />
                <Text style={styles.quickActionText}>-10</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          {editMode ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : selectedProduct ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.deleteButton]}
                onPress={handleDeleteProduct}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.qrButton]}
                onPress={() => handleShowQR(selectedProduct)}
              >
                <Icon name="qr-code" size={20} color="#fff" />
                <Text style={styles.qrButtonText}>QR Code</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const QRModal = () => (
    <Modal
      visible={showQRModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowQRModal(false)}
    >
      <View style={styles.qrModalOverlay}>
        <View style={styles.qrModalContent}>
          <Text style={styles.qrModalTitle}>{selectedProduct?.name}</Text>
          <Text style={styles.qrModalSku}>SKU: {selectedProduct?.sku}</Text>
          
          <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.qrContainer}>
              {selectedProduct && (
                <QRCode
                  value={inventoryApi.generateQRData(selectedProduct)}
                  size={250}
                  color="#000"
                  backgroundColor="#fff"
                />
              )}
              <Text style={styles.qrLabel}>{selectedProduct?.name}</Text>
              <Text style={styles.qrPrice}>${selectedProduct?.price}</Text>
            </View>
          </ViewShot>

          <View style={styles.qrActions}>
            <TouchableOpacity 
              style={styles.qrActionButton}
              onPress={handleShareQR}
            >
              <Icon name="share-outline" size={20} color="#2563eb" />
              <Text style={styles.qrActionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.qrActionButton}
              onPress={handlePrintQR}
            >
              <Icon name="print-outline" size={20} color="#2563eb" />
              <Text style={styles.qrActionText}>Print</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.closeQRButton}
            onPress={() => setShowQRModal(false)}
          >
            <Text style={styles.closeQRText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory</Text>
        <TouchableOpacity onPress={handleCreateProduct}>
          <Icon name="add" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, SKU, or barcode..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {products.filter(p => p.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {products.filter(p => p.quantity_on_hand <= p.reorder_point).length}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No products found' : 'No products yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={handleCreateProduct}
              >
                <Icon name="add" size={20} color="#fff" />
                <Text style={styles.addFirstText}>Add Your First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ProductModal />
      <QRModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingTop: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 14,
    color: '#4b5563',
  },
  productActions: {
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 8,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  lowStockText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  addFirstText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#4b5563',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  qrButton: {
    backgroundColor: '#2563eb',
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  qrModalSku: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginTop: 12,
  },
  qrPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 4,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  qrActionText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  closeQRButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  closeQRText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
});