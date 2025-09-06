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
import { Picker } from '@react-native-picker/picker';
import inventoryApi from '../../services/inventoryApi';
import { useBusinessContext } from '../../context/BusinessContext';
import { getQuickAddTemplates, getCustomButtons, isFeatureEnabled } from '../../utils/inventoryConfig';

export default function AdaptiveInventoryScreen() {
  const navigation = useNavigation();
  const {
    businessData,
    inventoryConfig,
    getInventoryTerminology,
    getInventoryCategories,
    getInventoryFeatures,
  } = useBusinessContext();

  const terminology = getInventoryTerminology();
  const categories = getInventoryCategories();
  const features = getInventoryFeatures();
  const quickTemplates = getQuickAddTemplates(businessData.businessType);
  const customButtons = getCustomButtons(businessData.businessType);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
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
    category: '',
    is_active: true,
    // Business-specific fields
    expiry_date: '',
    batch_number: '',
    storage_temperature: '',
    manufacturer: '',
    material_type: 'consumable',
    unit: 'piece',
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
      if (refreshing) {
        Alert.alert('Error', 'Failed to refresh ' + terminology.itemPlural.toLowerCase());
      }
      setProducts([]);
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode_number?.includes(searchQuery);
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
      category: product.category || categories[0] || '',
      is_active: product.is_active ?? true,
      // Business-specific fields
      expiry_date: product.expiry_date || '',
      batch_number: product.batch_number || '',
      storage_temperature: product.storage_temperature || '',
      manufacturer: product.manufacturer || '',
      material_type: product.material_type || 'consumable',
      unit: product.unit || 'piece',
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
      category: categories[0] || '',
      is_active: true,
      expiry_date: '',
      batch_number: '',
      storage_temperature: '',
      manufacturer: '',
      material_type: 'consumable',
      unit: 'piece',
    });
    setEditMode(true);
    setShowProductModal(true);
  };

  const handleQuickAdd = (template) => {
    setSelectedProduct(null);
    setFormData({
      ...formData,
      name: template.name,
      category: template.category,
      unit: template.unit || 'piece',
      material_type: template.material_type || 'consumable',
    });
    setEditMode(true);
    setShowProductModal(true);
    setShowQuickAdd(false);
  };

  const handleSaveProduct = async () => {
    try {
      if (!formData.name) {
        Alert.alert('Error', terminology.itemSingular + ' name is required');
        return;
      }

      // Check for required fields based on business type
      const requiredFields = inventoryConfig?.requiredFields || ['name', 'quantity_on_hand'];
      for (const field of requiredFields) {
        if (!formData[field] && formData[field] !== 0) {
          const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          Alert.alert('Error', `${fieldLabel} is required`);
          return;
        }
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        quantity_on_hand: parseInt(formData.quantity_on_hand) || 0,
        reorder_point: parseInt(formData.reorder_point) || 0,
      };

      if (selectedProduct && !editMode) {
        await inventoryApi.updateProduct(selectedProduct.id, productData);
        Alert.alert('Success', terminology.itemSingular + ' updated successfully');
      } else {
        await inventoryApi.createProduct(productData);
        Alert.alert('Success', terminology.itemSingular + ' created successfully');
      }

      setShowProductModal(false);
      loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save ' + terminology.itemSingular.toLowerCase());
      console.error(error);
    }
  };

  const handleCustomAction = (action) => {
    switch (action) {
      case 'recordWaste':
        Alert.alert('Daily Waste', 'Waste recording feature coming soon');
        break;
      case 'calculateRecipe':
        Alert.alert('Recipe Cost', 'Recipe costing feature coming soon');
        break;
      case 'orderSupplies':
        Alert.alert('Order Supplies', 'Supplier ordering feature coming soon');
        break;
      default:
        Alert.alert('Feature', `${action} feature coming soon`);
    }
  };

  const renderFieldIfNeeded = (field, label, placeholder, keyboardType = 'default', multiline = false) => {
    const hiddenFields = inventoryConfig?.hiddenFields || [];
    const requiredFields = inventoryConfig?.requiredFields || [];
    const optionalFields = inventoryConfig?.optionalFields || [];
    
    if (hiddenFields.includes(field)) {
      return null;
    }
    
    const isRequired = requiredFields.includes(field);
    const showField = isRequired || optionalFields.includes(field) || 
                      !hiddenFields.length; // Show by default if no config
    
    if (!showField) {
      return null;
    }
    
    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {label} {isRequired && '*'}
        </Text>
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          value={formData[field]}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          editable={editMode}
        />
      </View>
    );
  };

  const renderProduct = ({ item }) => {
    const isLowStock = item.quantity_on_hand <= item.reorder_point;
    const isExpiring = features.expiryTracking && item.expiry_date && 
                       new Date(item.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
      >
        <View style={styles.productMain}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.sku && <Text style={styles.productSku}>SKU: {item.sku}</Text>}
            {features.batchTracking && item.batch_number && (
              <Text style={styles.productBatch}>Batch: {item.batch_number}</Text>
            )}
            <Text style={styles.productPrice}>${item.price}</Text>
            <Text style={styles.productStock}>
              Stock: {item.quantity_on_hand} {item.unit || 'units'}
            </Text>
            {features.expiryTracking && item.expiry_date && (
              <Text style={[styles.productExpiry, isExpiring && styles.expiringText]}>
                Expires: {new Date(item.expiry_date).toLocaleDateString()}
              </Text>
            )}
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
        
        {(isLowStock || isExpiring) && (
          <View style={styles.alertBadges}>
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Icon name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.lowStockText}>Low Stock</Text>
              </View>
            )}
            {isExpiring && (
              <View style={styles.expiringBadge}>
                <Icon name="time-outline" size={16} color="#f59e0b" />
                <Text style={styles.expiringText}>Expiring Soon</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleDeleteProduct = async () => {
    Alert.alert(
      `Delete ${terminology.itemSingular}`,
      `Are you sure you want to delete this ${terminology.itemSingular.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryApi.deleteProduct(selectedProduct.id);
              Alert.alert('Success', `${terminology.itemSingular} deleted successfully`);
              setShowProductModal(false);
              loadProducts();
            } catch (error) {
              Alert.alert('Error', `Failed to delete ${terminology.itemSingular.toLowerCase()}`);
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
      Alert.alert('Error', `Failed to toggle ${terminology.itemSingular.toLowerCase()} status`);
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
            {editMode ? `Edit ${terminology.itemSingular}` : selectedProduct ? selectedProduct.name : `New ${terminology.itemSingular}`}
          </Text>
          {selectedProduct && !editMode && (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Icon name="create-outline" size={24} color="#2563eb" />
            </TouchableOpacity>
          )}
          {!selectedProduct && <View style={{ width: 24 }} />}
        </View>

        <ScrollView style={styles.modalContent}>
          {renderFieldIfNeeded('name', `${terminology.itemSingular} Name`, `Enter ${terminology.itemSingular.toLowerCase()} name`)}
          
          {categories.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  enabled={editMode}
                >
                  {categories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {renderFieldIfNeeded('sku', 'SKU', 'Auto-generated if empty')}
          {features.barcodeScanning && renderFieldIfNeeded('barcode_number', 'Barcode', 'Enter barcode number')}
          
          <View style={styles.formRow}>
            {renderFieldIfNeeded('price', 'Price', '0.00', 'decimal-pad')}
            {renderFieldIfNeeded('cost', 'Cost', '0.00', 'decimal-pad')}
          </View>

          <View style={styles.formRow}>
            {renderFieldIfNeeded('quantity_on_hand', 'Quantity on Hand', '0', 'numeric')}
            {renderFieldIfNeeded('reorder_point', 'Reorder Point', '0', 'numeric')}
          </View>

          {/* Business-specific fields */}
          {features.expiryTracking && renderFieldIfNeeded('expiry_date', 'Expiry Date', 'YYYY-MM-DD')}
          {features.batchTracking && renderFieldIfNeeded('batch_number', 'Batch Number', 'Enter batch number')}
          {features.temperatureMonitoring && renderFieldIfNeeded('storage_temperature', 'Storage Temperature', 'e.g., 2-8°C')}
          {features.prescriptionTracking && renderFieldIfNeeded('manufacturer', 'Manufacturer', 'Enter manufacturer')}
          
          {renderFieldIfNeeded('description', 'Description', `Enter ${terminology.itemSingular.toLowerCase()} description`, 'default', true)}

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

  const QuickAddModal = () => (
    <Modal
      visible={showQuickAdd}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowQuickAdd(false)}
    >
      <View style={styles.quickAddOverlay}>
        <View style={styles.quickAddContent}>
          <Text style={styles.quickAddTitle}>Quick Add Templates</Text>
          <ScrollView style={styles.quickAddList}>
            {quickTemplates.map((template, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickAddItem}
                onPress={() => handleQuickAdd(template)}
              >
                <Text style={styles.quickAddItemName}>{template.name}</Text>
                <Text style={styles.quickAddItemCategory}>{template.category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={styles.quickAddClose}
            onPress={() => setShowQuickAdd(false)}
          >
            <Text style={styles.quickAddCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>{terminology.menuLabel}</Text>
        <TouchableOpacity onPress={handleCreateProduct}>
          <Icon name="add" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${terminology.itemPlural.toLowerCase()}...`}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {categories.length > 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryFilter}
        >
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'All' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('All')}
          >
            <Text style={[styles.categoryChipText, selectedCategory === 'All' && styles.categoryChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {customButtons.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.customButtonsContainer}
        >
          {customButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={styles.customButton}
              onPress={() => handleCustomAction(button.action)}
            >
              <Icon name={button.icon} size={20} color="#fff" />
              <Text style={styles.customButtonText}>{button.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Total {terminology.itemPlural}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {products.filter(p => p.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        {features.expiryTracking && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {products.filter(p => p.expiry_date && new Date(p.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
            </Text>
            <Text style={styles.statLabel}>Expiring</Text>
          </View>
        )}
        {!features.expiryTracking && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {products.filter(p => p.quantity_on_hand <= p.reorder_point).length}
            </Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
        )}
      </View>

      {quickTemplates.length > 0 && products.length === 0 && (
        <TouchableOpacity 
          style={styles.quickAddButton}
          onPress={() => setShowQuickAdd(true)}
        >
          <Icon name="flash" size={20} color="#2563eb" />
          <Text style={styles.quickAddButtonText}>Quick Add from Templates</Text>
        </TouchableOpacity>
      )}

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
              {searchQuery ? `No ${terminology.itemPlural.toLowerCase()} found` : `No ${terminology.itemPlural.toLowerCase()} yet`}
            </Text>
            {!searchQuery && (
              <>
                <TouchableOpacity 
                  style={styles.addFirstButton}
                  onPress={handleCreateProduct}
                >
                  <Icon name="add" size={20} color="#fff" />
                  <Text style={styles.addFirstText}>Add Your First {terminology.itemSingular}</Text>
                </TouchableOpacity>
                {quickTemplates.length > 0 && (
                  <TouchableOpacity 
                    style={styles.templatesButton}
                    onPress={() => setShowQuickAdd(true)}
                  >
                    <Icon name="flash-outline" size={20} color="#2563eb" />
                    <Text style={styles.templatesButtonText}>Use Quick Templates</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
      />

      <ProductModal />
      <QRModal />
      <QuickAddModal />
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
  categoryFilter: {
    paddingHorizontal: 20,
    marginBottom: 10,
    maxHeight: 40,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  customButtonsContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
    maxHeight: 45,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    gap: 8,
  },
  customButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  quickAddButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
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
  productBatch: {
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
  productExpiry: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  expiringText: {
    color: '#f59e0b',
    fontWeight: '500',
  },
  productActions: {
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 8,
  },
  alertBadges: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  lowStockText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
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
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  templatesButtonText: {
    color: '#2563eb',
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
    gap: 10,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  quickAddOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  quickAddContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  quickAddTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  quickAddList: {
    maxHeight: 400,
  },
  quickAddItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickAddItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  quickAddItemCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  quickAddClose: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAddCloseText: {
    fontSize: 16,
    color: '#4b5563',
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