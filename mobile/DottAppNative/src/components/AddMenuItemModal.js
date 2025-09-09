import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { useCurrency } from '../context/CurrencyContext';

const { width: screenWidth } = Dimensions.get('window');

const AddMenuItemModal = ({ 
  visible, 
  onClose, 
  onSave, 
  editItem = null,
  categories = [],
  inventoryItems = [] 
}) => {
  const { currency } = useCurrency();
  const currencySymbol = currency?.symbol || '$';
  
  console.log('🍔 [AddMenuItemModal] === CURRENCY CHECK ===');
  console.log('🍔 [AddMenuItemModal] Currency from context:', currency);
  console.log('🍔 [AddMenuItemModal] Currency symbol being used:', currencySymbol);
  console.log('🍔 [AddMenuItemModal] Is using default?', !currency?.symbol);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'main_courses',
    price: '',
    estimatedCost: '',
    costMethod: 'fixed', // 'fixed' or 'recipe'
    preparationTime: '',
    dietaryTags: [],
    ingredients: [],
    photo: null,
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'costing', 'photo'
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    supply_id: '',
    quantity: '',
    unit: 'pieces',
  });

  const dietaryOptions = [
    { id: 'vegetarian', label: 'Vegetarian', color: '#10b981' },
    { id: 'vegan', label: 'Vegan', color: '#059669' },
    { id: 'halal', label: 'Halal', color: '#0ea5e9' },
    { id: 'gluten_free', label: 'Gluten Free', color: '#f59e0b' },
    { id: 'dairy_free', label: 'Dairy Free', color: '#8b5cf6' },
    { id: 'spicy', label: 'Spicy', color: '#ef4444' },
  ];

  const units = ['pieces', 'kg', 'grams', 'liters', 'ml', 'cups', 'tbsp', 'tsp'];

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        description: editItem.description || '',
        category: editItem.category || 'main_courses',
        price: editItem.price?.toString() || '',
        estimatedCost: editItem.estimatedCost?.toString() || '',
        costMethod: editItem.costMethod || 'fixed',
        preparationTime: editItem.preparationTime?.toString() || '',
        dietaryTags: editItem.dietaryTags || [],
        ingredients: editItem.ingredients || [],
        photo: editItem.image ? { uri: editItem.image } : null,
      });
    } else {
      // Reset form for new item
      setFormData({
        name: '',
        description: '',
        category: 'main_courses',
        price: '',
        estimatedCost: '',
        costMethod: 'fixed',
        preparationTime: '',
        dietaryTags: [],
        ingredients: [],
        photo: null,
      });
    }
    setActiveTab('basic');
  }, [editItem, visible]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDietaryTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter(t => t !== tag)
        : [...prev.dietaryTags, tag]
    }));
  };

  const calculateProfitMargin = () => {
    const price = parseFloat(formData.price) || 0;
    const cost = parseFloat(formData.estimatedCost) || 0;
    if (price > 0 && cost > 0) {
      return ((price - cost) / price * 100).toFixed(1);
    }
    return '0';
  };

  const getProfitColor = () => {
    const margin = parseFloat(calculateProfitMargin());
    if (margin >= 50) return '#10b981'; // Green
    if (margin >= 30) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const selectPhoto = () => {
    Alert.alert(
      'Select Photo',
      'Choose photo source',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1000,
        maxWidth: 1000,
        quality: 0.8,
      },
      handleImageResponse
    );
  };

  const openGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1000,
        maxWidth: 1000,
        quality: 0.8,
      },
      handleImageResponse
    );
  };

  const handleImageResponse = async (response) => {
    if (response.didCancel || response.error) return;

    try {
      const asset = response.assets[0];
      
      // Resize image for better performance
      const resizedImage = await ImageResizer.createResizedImage(
        asset.uri,
        800,
        800,
        'JPEG',
        80
      );

      setFormData(prev => ({
        ...prev,
        photo: {
          uri: resizedImage.uri,
          type: 'image/jpeg',
          fileName: asset.fileName || `menu-item-${Date.now()}.jpg`,
        }
      }));
    } catch (error) {
      console.error('Error resizing image:', error);
      Alert.alert('Error', 'Failed to process image');
    }
  };

  const addIngredient = () => {
    if (!newIngredient.supply_id || !newIngredient.quantity) {
      Alert.alert('Error', 'Please fill in all ingredient fields');
      return;
    }

    const supply = inventoryItems.find(item => item.id === newIngredient.supply_id);
    if (!supply) return;

    const ingredient = {
      supply_id: newIngredient.supply_id,
      supply_name: supply.name,
      quantity: parseFloat(newIngredient.quantity),
      unit: newIngredient.unit,
      estimated_cost: (parseFloat(newIngredient.quantity) * (supply.cost || 0)).toFixed(2),
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient]
    }));

    setNewIngredient({ supply_id: '', quantity: '', unit: 'pieces' });
    setShowIngredientModal(false);

    // Auto-calculate total cost
    const totalCost = [...formData.ingredients, ingredient]
      .reduce((sum, ing) => sum + parseFloat(ing.estimated_cost || 0), 0);
    setFormData(prev => ({ ...prev, estimatedCost: totalCost.toFixed(2) }));
  };

  const removeIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    
    // Recalculate total cost
    const totalCost = newIngredients.reduce((sum, ing) => sum + parseFloat(ing.estimated_cost || 0), 0);
    setFormData(prev => ({ ...prev, estimatedCost: totalCost.toFixed(2) }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        preparationTime: parseInt(formData.preparationTime) || 0,
        photo: formData.photo, // Include the photo data
      };

      await onSave(itemData);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Item Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          placeholder="e.g., Jollof Rice"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          placeholder="Describe your dish..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                formData.category === category.id && styles.categoryChipActive
              ]}
              onPress={() => updateFormData('category', category.id)}
            >
              <Text style={[
                styles.categoryChipText,
                formData.category === category.id && styles.categoryChipTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Selling Price * ({currencySymbol})</Text>
          <TextInput
            style={styles.input}
            value={formData.price}
            onChangeText={(value) => updateFormData('price', value)}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Prep Time (min)</Text>
          <TextInput
            style={styles.input}
            value={formData.preparationTime}
            onChangeText={(value) => updateFormData('preparationTime', value)}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Dietary Tags</Text>
        <View style={styles.tagsContainer}>
          {dietaryOptions.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagChip,
                { borderColor: tag.color },
                formData.dietaryTags.includes(tag.id) && { backgroundColor: tag.color }
              ]}
              onPress={() => toggleDietaryTag(tag.id)}
            >
              <Text style={[
                styles.tagText,
                { color: formData.dietaryTags.includes(tag.id) ? 'white' : tag.color }
              ]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderCostingTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Cost Management</Text>
      
      <View style={styles.costMethodContainer}>
        <Text style={styles.label}>Costing Method</Text>
        <View style={styles.methodButtons}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              formData.costMethod === 'fixed' && styles.methodButtonActive
            ]}
            onPress={() => updateFormData('costMethod', 'fixed')}
          >
            <Icon name="calculator-outline" size={20} color={formData.costMethod === 'fixed' ? 'white' : '#6b7280'} />
            <Text style={[
              styles.methodButtonText,
              formData.costMethod === 'fixed' && styles.methodButtonTextActive
            ]}>
              Fixed Cost
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.methodButton,
              formData.costMethod === 'recipe' && styles.methodButtonActive
            ]}
            onPress={() => updateFormData('costMethod', 'recipe')}
          >
            <Icon name="list-outline" size={20} color={formData.costMethod === 'recipe' ? 'white' : '#6b7280'} />
            <Text style={[
              styles.methodButtonText,
              formData.costMethod === 'recipe' && styles.methodButtonTextActive
            ]}>
              Recipe Cost
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {formData.costMethod === 'fixed' ? (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estimated Cost ({currencySymbol})</Text>
          <TextInput
            style={styles.input}
            value={formData.estimatedCost}
            onChangeText={(value) => updateFormData('estimatedCost', value)}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>
      ) : (
        <View style={styles.ingredientsSection}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.label}>Recipe Ingredients</Text>
            <TouchableOpacity
              style={styles.addIngredientButton}
              onPress={() => setShowIngredientModal(true)}
            >
              <Icon name="add" size={16} color="white" />
              <Text style={styles.addIngredientText}>Add Ingredient</Text>
            </TouchableOpacity>
          </View>
          
          {formData.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem}>
              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName}>{ingredient.supply_name}</Text>
                <Text style={styles.ingredientDetails}>
                  {ingredient.quantity} {ingredient.unit} - {currencySymbol}{ingredient.estimated_cost}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeIngredientButton}
                onPress={() => removeIngredient(index)}
              >
                <Icon name="close" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Profit Analysis */}
      {formData.price && formData.estimatedCost && (
        <View style={styles.profitAnalysis}>
          <Text style={styles.profitTitle}>Profit Analysis</Text>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Selling Price:</Text>
            <Text style={styles.profitValue}>{currencySymbol}{formData.price}</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Cost:</Text>
            <Text style={styles.profitValue}>{currencySymbol}{formData.estimatedCost}</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Profit:</Text>
            <Text style={[styles.profitValue, { color: getProfitColor() }]}>
              {currencySymbol}{(parseFloat(formData.price) - parseFloat(formData.estimatedCost)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Margin:</Text>
            <Text style={[styles.profitValue, { color: getProfitColor() }]}>
              {calculateProfitMargin()}%
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderPhotoTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.photoTabContent}>
      <Text style={styles.sectionTitle}>Item Photo</Text>
      
      <TouchableOpacity style={styles.photoContainer} onPress={selectPhoto}>
        {formData.photo ? (
          <Image source={{ uri: formData.photo.uri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Icon name="camera-outline" size={48} color="#9ca3af" />
            <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {formData.photo && (
        <TouchableOpacity style={styles.changePhotoButton} onPress={selectPhoto}>
          <Icon name="image-outline" size={16} color="#3b82f6" />
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.photoTip}>
        💡 High-quality photos help customers choose your dishes and increase sales!
      </Text>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {editItem ? 'Edit Menu Item' : 'Add Menu Item'}
          </Text>
          
          <TouchableOpacity
            style={[styles.headerButton, styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'basic' && styles.tabActive]}
            onPress={() => setActiveTab('basic')}
          >
            <Icon name="information-circle-outline" size={20} color={activeTab === 'basic' ? '#3b82f6' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}>Basic</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'costing' && styles.tabActive]}
            onPress={() => setActiveTab('costing')}
          >
            <Icon name="calculator-outline" size={20} color={activeTab === 'costing' ? '#3b82f6' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === 'costing' && styles.tabTextActive]}>Costing</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'photo' && styles.tabActive]}
            onPress={() => setActiveTab('photo')}
          >
            <Icon name="camera-outline" size={20} color={activeTab === 'photo' ? '#3b82f6' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === 'photo' && styles.tabTextActive]}>Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'costing' && renderCostingTab()}
          {activeTab === 'photo' && renderPhotoTab()}
        </View>

        {/* Add Ingredient Modal */}
        <Modal
          visible={showIngredientModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowIngredientModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.ingredientModal}>
              <Text style={styles.ingredientModalTitle}>Add Ingredient</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Supply Item</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {inventoryItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.supplyChip,
                        newIngredient.supply_id === item.id && styles.supplyChipActive
                      ]}
                      onPress={() => setNewIngredient(prev => ({ ...prev, supply_id: item.id }))}
                    >
                      <Text style={[
                        styles.supplyChipText,
                        newIngredient.supply_id === item.id && styles.supplyChipTextActive
                      ]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={newIngredient.quantity}
                    onChangeText={(value) => setNewIngredient(prev => ({ ...prev, quantity: value }))}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <ScrollView horizontal>
                    {units.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitChip,
                          newIngredient.unit === unit && styles.unitChipActive
                        ]}
                        onPress={() => setNewIngredient(prev => ({ ...prev, unit }))}
                      >
                        <Text style={[
                          styles.unitChipText,
                          newIngredient.unit === unit && styles.unitChipTextActive
                        ]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.ingredientModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowIngredientModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={addIngredient}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  photoTabContent: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: 'white',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  costMethodContainer: {
    marginBottom: 20,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  methodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6b7280',
  },
  methodButtonTextActive: {
    color: 'white',
  },
  ingredientsSection: {
    marginBottom: 20,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addIngredientText: {
    marginLeft: 4,
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  ingredientDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  removeIngredientButton: {
    padding: 6,
  },
  profitAnalysis: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profitLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  photoContainer: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#9ca3af',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 20,
  },
  changePhotoText: {
    marginLeft: 6,
    color: '#3b82f6',
    fontWeight: '500',
  },
  photoTip: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ingredientModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  ingredientModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  supplyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    marginRight: 8,
  },
  supplyChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  supplyChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  supplyChipTextActive: {
    color: 'white',
  },
  unitChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginRight: 6,
  },
  unitChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  unitChipText: {
    fontSize: 12,
    color: '#6b7280',
  },
  unitChipTextActive: {
    color: 'white',
  },
  ingredientModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default AddMenuItemModal;