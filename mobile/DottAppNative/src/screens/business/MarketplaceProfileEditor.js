import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useBusinessContext } from '../../context/BusinessContext';
import { useMenuContext } from '../../context/MenuContext';
import marketplaceApi from '../../services/marketplaceApi';
import businessDataApi from '../../services/businessDataApi';
import { 
  generateBusinessProfileTemplate,
  calculateProfileCompleteness,
  BusinessTypeTemplates 
} from '../../models/businessProfileTemplate';
import { CATEGORY_HIERARCHY } from '../../config/categoryHierarchy';
import { getCurrencyForCountry } from '../../utils/currencyUtils';

export default function MarketplaceProfileEditor({ navigation }) {
  const { user } = useAuth();
  const { businessData } = useBusinessContext();
  const { menuItems } = useMenuContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Profile data based on template
  const [profile, setProfile] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  
  // Products/Services data
  const [businessOfferings, setBusinessOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  
  // Track changes
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  
  // Currency configuration using comprehensive utility
  const country = businessData?.businessCountry || 'SS';
  const currency = getCurrencyForCountry(country);

  useEffect(() => {
    loadBusinessProfile();
    loadBusinessOfferings();
  }, []);

  // Reload offerings when menu items change (for restaurants)
  useEffect(() => {
    const businessType = businessData?.businessType || 'OTHER';
    if ((businessType.includes('RESTAURANT') || businessType.includes('CAFE')) && menuItems?.length > 0) {
      loadBusinessOfferings();
    }
  }, [menuItems]);

  useEffect(() => {
    if (profile) {
      const comp = calculateProfileCompleteness(profile);
      setCompleteness(comp);
    }
  }, [profile]);

  // Auto-save after 3 seconds of no changes
  useEffect(() => {
    if (hasChanges && !saving) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 3000);
      setAutoSaveTimer(timer);
    }
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [hasChanges, profile]);

  const loadBusinessProfile = async () => {
    try {
      setLoading(true);
      
      // Try to load existing profile
      const existingProfile = await marketplaceApi.getBusinessListing();
      
      if (existingProfile && existingProfile.profile) {
        setProfile(existingProfile.profile);
      } else {
        // Check for local draft first
        try {
          const localDraft = await AsyncStorage.getItem('marketplaceProfileDraft');
          if (localDraft) {
            const draftProfile = JSON.parse(localDraft);
            setProfile(draftProfile);
            Alert.alert(
              'Draft Restored',
              'Your unsaved changes have been restored.',
              [{ text: 'OK' }]
            );
            return;
          }
        } catch (storageError) {
          console.error('Error loading draft:', storageError);
        }
        
        // Generate new profile from template
        const businessType = businessData?.businessType || 'OTHER';
        const newProfile = generateBusinessProfileTemplate(businessType, {
          businessName: businessData?.businessName || user?.business_name,
          phone: user?.phone,
          email: user?.email,
          city: businessData?.businessCity,
          country: businessData?.businessCountry,
        });
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
      
      // Check for local draft as fallback
      try {
        const localDraft = await AsyncStorage.getItem('marketplaceProfileDraft');
        if (localDraft) {
          const draftProfile = JSON.parse(localDraft);
          setProfile(draftProfile);
          Alert.alert(
            'Offline Mode',
            'Working with local data. Changes will sync when connection is restored.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (storageError) {
        console.error('Error loading draft in fallback:', storageError);
      }
      
      // Generate default profile
      const businessType = businessData?.businessType || 'OTHER';
      const newProfile = generateBusinessProfileTemplate(businessType, businessData);
      setProfile(newProfile);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessOfferings = async () => {
    try {
      setLoadingOfferings(true);
      const businessId = businessData?.businessId || user?.business_id;
      const businessType = businessData?.businessType || 'OTHER';
      
      console.log('🍔 Loading business offerings...');
      console.log('🍔 Business Type:', businessType);
      console.log('🍔 Menu items from context:', menuItems?.length || 0);
      console.log('🍔 First menu item:', menuItems?.[0]);
      
      // First try to use MenuContext for restaurants
      if ((businessType.includes('RESTAURANT') || businessType.includes('CAFE')) && menuItems?.length > 0) {
        // Use menu items from context
        const formattedData = menuItems.map(item => ({
          id: item.id,
          name: item.name || item.title,
          description: item.description,
          price: item.price,
          image: item.image_url || item.image,
          category: item.category,
          available: item.available !== false,
        }));
        setBusinessOfferings(formattedData);
        console.log('🍔 Set business offerings from menu context:', formattedData.length);
      } else if (businessId) {
        // Fallback to API
        const result = await businessDataApi.getBusinessOfferings(businessId, businessType);
        if (result.success) {
          // Format data based on type
          let formattedData = [];
          if (businessType.includes('RESTAURANT') || businessType.includes('CAFE')) {
            formattedData = businessDataApi.formatMenuItems(result.data);
          } else if (businessType.includes('RETAIL') || businessType.includes('STORE')) {
            formattedData = businessDataApi.formatInventoryItems(result.data);
          } else if (businessType.includes('SERVICE')) {
            formattedData = businessDataApi.formatServices(result.data);
          } else {
            // Mixed type - data already combined
            formattedData = result.data;
          }
          setBusinessOfferings(formattedData);
        }
      }
    } catch (error) {
      console.error('Error loading business offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handleAutoSave = async () => {
    try {
      await marketplaceApi.updateBusinessListing({ profile });
      setHasChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Save to local storage as fallback
      try {
        await AsyncStorage.setItem('marketplaceProfileDraft', JSON.stringify(profile));
      } catch (storageError) {
        console.error('Failed to save to local storage:', storageError);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('📝 Starting save process...');
      
      // Validate required fields
      if (!profile.basic.description?.trim()) {
        Alert.alert('Error', 'Please add a business description');
        setSaving(false);
        return;
      }
      
      if (!profile.contact.phone?.trim()) {
        Alert.alert('Error', 'Please add a contact phone number');
        setSaving(false);
        return;
      }

      try {
        console.log('🚀 Attempting to save to backend...');
        // Save profile
        const saveResult = await marketplaceApi.updateBusinessListing({ profile });
        console.log('✅ Backend save successful:', saveResult);
        
        // Update operating hours
        await marketplaceApi.updateOperatingHours(profile.operations.operatingHours);
        
        // Sync products/services based on business type
        await syncBusinessOfferings();
        
        // Clear local draft on successful save
        await AsyncStorage.removeItem('marketplaceProfileDraft');
        console.log('🗑️ Cleared local draft');
        
        setHasChanges(false);
        Alert.alert('Success', 'Your marketplace profile has been updated and saved to the database');
        navigation.goBack();
      } catch (apiError) {
        console.error('API Error saving profile:', apiError);
        console.log('📱 API Error Details:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          message: apiError.message,
        });
        
        // Try to save to local storage as fallback
        try {
          await AsyncStorage.setItem('marketplaceProfileDraft', JSON.stringify(profile));
          console.log('✅ Profile saved to local storage successfully');
          Alert.alert(
            'Saved Locally', 
            'Your changes have been saved locally and will sync when connection is restored.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } catch (storageError) {
          console.error('Failed to save to local storage:', storageError);
          Alert.alert('Error', 'Failed to save profile. Please check your connection and try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const syncBusinessOfferings = async () => {
    const businessType = businessData?.businessType || 'OTHER';
    
    try {
      if ((businessType.includes('RESTAURANT') || businessType.includes('CAFE')) && menuItems?.length > 0) {
        // Sync menu items for restaurants from MenuContext
        const formattedMenuItems = menuItems.map(item => ({
          id: item.id,
          name: item.name || item.title,
          description: item.description,
          price: item.price,
          image: item.image_url || item.image,
          category: item.category,
          available: item.available !== false,
        }));
        await marketplaceApi.updateBusinessProducts(formattedMenuItems);
      } else if (businessType.includes('RETAIL') || businessType.includes('STORE') || businessType.includes('PHARMACY')) {
        // Sync inventory for retail businesses
        if (businessOfferings.length > 0) {
          await marketplaceApi.updateBusinessProducts(businessOfferings);
        }
      } else if (businessType.includes('SERVICE')) {
        // Sync services
        if (businessOfferings.length > 0) {
          await marketplaceApi.updateBusinessProducts(businessOfferings);
        }
      }
    } catch (error) {
      console.error('Error syncing business offerings:', error);
      // Don't throw - allow save to continue even if sync fails
    }
  };

  const handleImagePick = async (imageType) => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }
      
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        
        // Handle gallery images array
        if (imageType.startsWith('galleryImages')) {
          const match = imageType.match(/\[(\d+)\]/);
          if (match) {
            const index = parseInt(match[1]);
            const currentGallery = profile?.visuals?.galleryImages || [];
            const newGallery = [...currentGallery];
            
            // Ensure array is large enough
            while (newGallery.length <= index) {
              newGallery.push(null);
            }
            
            newGallery[index] = imageUri;
            updateProfile('visuals.galleryImages', newGallery);
          }
        } else {
          // Handle single images (banner, logo)
          updateProfile(`visuals.${imageType}`, imageUri);
        }
      }
    });
  };

  const updateProfile = (path, value) => {
    const keys = path.split('.');
    const newProfile = JSON.parse(JSON.stringify(profile));
    
    let current = newProfile;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setProfile(newProfile);
    setHasChanges(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Marketplace Profile</Text>
      <TouchableOpacity onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : (
          <Text style={styles.saveButton}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderProfileCompleteness = () => (
    <View style={styles.completenessCard}>
      <View style={styles.completenessHeader}>
        <Text style={styles.completenessTitle}>Profile Completeness</Text>
        <Text style={styles.completenessPercent}>{completeness?.percentage || 0}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${completeness?.percentage || 0}%` }
          ]} 
        />
      </View>
      {!completeness?.isComplete && (
        <Text style={styles.completenessHint}>
          Complete your profile to increase visibility
        </Text>
      )}
    </View>
  );

  const renderTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
    >
      {[
        { id: 'basic', label: 'Basic Info', icon: 'information-circle' },
        { id: 'visuals', label: 'Images', icon: 'images' },
        { id: 'products', label: 'Products', icon: 'pricetags' },
        { id: 'contact', label: 'Contact', icon: 'call' },
        { id: 'hours', label: 'Hours', icon: 'time' },
        { id: 'services', label: 'Services', icon: 'cart' },
        { id: 'social', label: 'Social', icon: 'share-social' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Icon 
            name={tab.icon} 
            size={20} 
            color={activeTab === tab.id ? '#10b981' : '#6b7280'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderBasicInfo = () => {
    // Get subcategories based on business type
    const getSubcategories = () => {
      const businessType = businessData?.businessType;
      if (businessType?.includes('RESTAURANT') || businessType?.includes('CAFE')) {
        return CATEGORY_HIERARCHY.food?.subcategories || [];
      } else if (businessType?.includes('RETAIL') || businessType?.includes('STORE')) {
        return CATEGORY_HIERARCHY.shopping?.subcategories || [];
      } else if (businessType?.includes('SERVICE')) {
        return CATEGORY_HIERARCHY.services?.subcategories || [];
      } else if (businessType?.includes('HEALTH')) {
        return CATEGORY_HIERARCHY.health?.subcategories || [];
      } else if (businessType?.includes('TRANSPORT')) {
        return CATEGORY_HIERARCHY.transport?.subcategories || [];
      }
      return [];
    };

    const subcategories = getSubcategories();
    const selectedSubcategories = profile?.discovery?.subcategories || [];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Name</Text>
          <TextInput
            style={styles.input}
            value={profile?.basic?.businessName}
            onChangeText={(value) => updateProfile('basic.businessName', value)}
            placeholder="Your Business Name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tagline (Optional)</Text>
          <TextInput
            style={styles.input}
            value={profile?.basic?.tagline}
            onChangeText={(value) => updateProfile('basic.tagline', value)}
            placeholder="Your catchy business slogan"
          />
        </View>

        {/* Subcategory Selection */}
        {subcategories.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How customers can find you *</Text>
            <Text style={styles.helperText}>
              Select categories that best describe your business (up to 5)
            </Text>
            <View style={styles.subcategoriesGrid}>
              {subcategories.map((subcat) => {
                const isSelected = selectedSubcategories.includes(subcat.id);
                return (
                  <TouchableOpacity
                    key={subcat.id}
                    style={[
                      styles.subcategoryChip,
                      isSelected && styles.subcategoryChipSelected,
                      selectedSubcategories.length >= 5 && !isSelected && styles.subcategoryChipDisabled
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        // Remove from selection
                        const newSelection = selectedSubcategories.filter(id => id !== subcat.id);
                        updateProfile('discovery.subcategories', newSelection);
                      } else if (selectedSubcategories.length < 5) {
                        // Add to selection
                        const newSelection = [...selectedSubcategories, subcat.id];
                        updateProfile('discovery.subcategories', newSelection);
                      }
                    }}
                    disabled={selectedSubcategories.length >= 5 && !isSelected}
                  >
                    <Icon 
                      name={isSelected ? 'checkmark-circle' : subcat.icon} 
                      size={16} 
                      color={isSelected ? '#fff' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.subcategoryChipText,
                      isSelected && styles.subcategoryChipTextSelected
                    ]}>
                      {subcat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedSubcategories.length > 0 && (
              <Text style={styles.selectedCount}>
                {selectedSubcategories.length}/5 categories selected
              </Text>
            )}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={styles.textArea}
            value={profile?.basic?.description}
            onChangeText={(value) => updateProfile('basic.description', value)}
            placeholder="Describe your business, products, and services..."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Year Established</Text>
          <TextInput
            style={styles.input}
            value={profile?.basic?.established?.toString()}
            onChangeText={(value) => updateProfile('basic.established', value)}
            placeholder="e.g., 2020"
            keyboardType="numeric"
          />
        </View>
      </View>
    );
  };

  const renderVisuals = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Business Images</Text>
      
      {/* Banner Image */}
      <View style={styles.imageSection}>
        <Text style={styles.inputLabel}>Cover Banner</Text>
        <TouchableOpacity 
          style={styles.imageUpload}
          onPress={() => handleImagePick('bannerImage')}
        >
          {profile?.visuals?.bannerImage ? (
            <Image 
              source={{ uri: profile.visuals.bannerImage }} 
              style={styles.uploadedImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={40} color="#9ca3af" />
              <Text style={styles.uploadText}>Upload Banner (1920x400)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Logo/Profile Image */}
      <View style={styles.imageSection}>
        <Text style={styles.inputLabel}>Business Logo</Text>
        <TouchableOpacity 
          style={styles.logoUpload}
          onPress={() => handleImagePick('logoImage')}
        >
          {profile?.visuals?.logoImage ? (
            <Image 
              source={{ uri: profile.visuals.logoImage }} 
              style={styles.uploadedLogo}
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Icon name="camera-outline" size={30} color="#9ca3af" />
              <Text style={styles.uploadText}>Upload Logo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Gallery Images */}
      <View style={styles.imageSection}>
        <Text style={styles.inputLabel}>Gallery Images (Max 10)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...Array(10)].map((_, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.galleryItem}
              onPress={() => handleImagePick(`galleryImages[${index}]`)}
            >
              {profile?.visuals?.galleryImages?.[index] ? (
                <Image 
                  source={{ uri: profile.visuals.galleryImages[index] }} 
                  style={styles.galleryImage}
                />
              ) : (
                <View style={styles.galleryPlaceholder}>
                  <Icon name="add-circle-outline" size={30} color="#9ca3af" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderContact = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={profile?.contact?.phone}
          onChangeText={(value) => updateProfile('contact.phone', value)}
          placeholder="+211 XXX XXX XXX"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>WhatsApp Number</Text>
        <TextInput
          style={styles.input}
          value={profile?.contact?.whatsapp}
          onChangeText={(value) => updateProfile('contact.whatsapp', value)}
          placeholder="+211 XXX XXX XXX"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={profile?.contact?.email}
          onChangeText={(value) => updateProfile('contact.email', value)}
          placeholder="business@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Website</Text>
        <TextInput
          style={styles.input}
          value={profile?.contact?.website}
          onChangeText={(value) => updateProfile('contact.website', value)}
          placeholder="https://www.example.com"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Street Address</Text>
        <TextInput
          style={styles.input}
          value={profile?.contact?.address?.street}
          onChangeText={(value) => updateProfile('contact.address.street', value)}
          placeholder="123 Main Street"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>City *</Text>
        <TextInput
          style={styles.input}
          value={profile?.contact?.address?.city}
          onChangeText={(value) => updateProfile('contact.address.city', value)}
          placeholder="Juba"
        />
      </View>
    </View>
  );

  const renderOperatingHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating Hours</Text>
        
        {days.map(day => (
          <View key={day} style={styles.hourRow}>
            <Text style={styles.dayLabel}>{dayLabels[day]}</Text>
            <View style={styles.hourControls}>
              <Switch
                value={!profile?.operations?.operatingHours?.[day]?.isClosed}
                onValueChange={(value) => 
                  updateProfile(`operations.operatingHours.${day}.isClosed`, !value)
                }
                trackColor={{ false: '#cbd5e1', true: '#34d399' }}
                thumbColor={!profile?.operations?.operatingHours?.[day]?.isClosed ? '#10b981' : '#94a3b8'}
              />
              {!profile?.operations?.operatingHours?.[day]?.isClosed && (
                <View style={styles.timeInputs}>
                  <TextInput
                    style={styles.timeInput}
                    value={profile?.operations?.operatingHours?.[day]?.open}
                    onChangeText={(value) => 
                      updateProfile(`operations.operatingHours.${day}.open`, value)
                    }
                    placeholder="09:00"
                  />
                  <Text style={styles.timeSeparator}>to</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={profile?.operations?.operatingHours?.[day]?.close}
                    onChangeText={(value) => 
                      updateProfile(`operations.operatingHours.${day}.close`, value)
                    }
                    placeholder="17:00"
                  />
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderServiceOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Options</Text>
      
      {/* Delivery */}
      <View style={styles.serviceOption}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionTitle}>Delivery</Text>
          <Switch
            value={profile?.services?.delivery?.enabled}
            onValueChange={(value) => 
              updateProfile('services.delivery.enabled', value)
            }
            trackColor={{ false: '#cbd5e1', true: '#34d399' }}
            thumbColor={profile?.services?.delivery?.enabled ? '#10b981' : '#94a3b8'}
          />
        </View>
        {profile?.services?.delivery?.enabled && (
          <View style={styles.optionDetails}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Radius (km)</Text>
              <TextInput
                style={styles.smallInput}
                value={profile?.services?.delivery?.radius?.toString()}
                onChangeText={(value) => 
                  updateProfile('services.delivery.radius', parseInt(value) || 0)
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Min Order</Text>
              <TextInput
                style={styles.smallInput}
                value={profile?.services?.delivery?.minOrder?.toString()}
                onChangeText={(value) => 
                  updateProfile('services.delivery.minOrder', parseInt(value) || 0)
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Delivery Fee</Text>
              <TextInput
                style={styles.smallInput}
                value={profile?.services?.delivery?.fee?.toString()}
                onChangeText={(value) => 
                  updateProfile('services.delivery.fee', parseInt(value) || 0)
                }
                keyboardType="numeric"
              />
            </View>
          </View>
        )}
      </View>

      {/* Pickup */}
      <View style={styles.serviceOption}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionTitle}>Pickup</Text>
          <Switch
            value={profile?.services?.pickup?.enabled}
            onValueChange={(value) => 
              updateProfile('services.pickup.enabled', value)
            }
            trackColor={{ false: '#cbd5e1', true: '#34d399' }}
            thumbColor={profile?.services?.pickup?.enabled ? '#10b981' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Dine In (for restaurants) */}
      {businessData?.businessType === 'RESTAURANT_CAFE' && (
        <View style={styles.serviceOption}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Dine In</Text>
            <Switch
              value={profile?.services?.dineIn?.enabled}
              onValueChange={(value) => 
                updateProfile('services.dineIn.enabled', value)
              }
              trackColor={{ false: '#cbd5e1', true: '#34d399' }}
              thumbColor={profile?.services?.dineIn?.enabled ? '#10b981' : '#94a3b8'}
            />
          </View>
          {profile?.services?.dineIn?.enabled && (
            <View style={styles.optionDetails}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Reservations</Text>
                <Switch
                  value={profile?.services?.dineIn?.reservations}
                  onValueChange={(value) => 
                    updateProfile('services.dineIn.reservations', value)
                  }
                  trackColor={{ false: '#cbd5e1', true: '#34d399' }}
                  thumbColor={profile?.services?.dineIn?.reservations ? '#10b981' : '#94a3b8'}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Booking (for service businesses) */}
      {['SERVICE_BUSINESS', 'HAIRSTYLIST', 'MEDICAL_DENTAL'].includes(businessData?.businessType) && (
        <View style={styles.serviceOption}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Booking</Text>
            <Switch
              value={profile?.services?.booking?.enabled}
              onValueChange={(value) => 
                updateProfile('services.booking.enabled', value)
              }
              trackColor={{ false: '#cbd5e1', true: '#34d399' }}
              thumbColor={profile?.services?.booking?.enabled ? '#10b981' : '#94a3b8'}
            />
          </View>
        </View>
      )}
    </View>
  );

  const renderSocialMedia = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Social Media</Text>
      
      {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'].map(platform => (
        <View key={platform} style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </Text>
          <TextInput
            style={styles.input}
            value={profile?.social?.[platform]}
            onChangeText={(value) => updateProfile(`social.${platform}`, value)}
            placeholder={`@yourbusiness`}
            autoCapitalize="none"
          />
        </View>
      ))}
    </View>
  );

  const renderProducts = () => {
    const getProductLabel = () => {
      const type = businessData?.businessType;
      if (type?.includes('RESTAURANT') || type?.includes('CAFE')) return 'Menu Items';
      if (type?.includes('SERVICE')) return 'Services';
      if (type?.includes('RETAIL') || type?.includes('STORE')) return 'Products';
      return 'Products & Services';
    };

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{getProductLabel()}</Text>
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={loadBusinessOfferings}
            disabled={loadingOfferings}
          >
            {loadingOfferings ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <>
                <Icon name="sync" size={16} color="#10b981" />
                <Text style={styles.syncButtonText}>Sync</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionDescription}>
          These items are automatically synced from your {getProductLabel().toLowerCase()}
        </Text>

        {businessOfferings.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="basket-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>
              No {getProductLabel().toLowerCase()} found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Add items to your menu, inventory, or services to display them here
            </Text>
          </View>
        ) : (
          <View style={styles.productsList}>
            {businessOfferings.slice(0, 10).map((item, index) => (
              <View key={item.id || index} style={styles.productItem}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.productMeta}>
                    <Text style={styles.productPrice}>
                      {currency.symbol}{item.price?.toFixed(0) || '0'}
                    </Text>
                    {item.available ? (
                      <Text style={styles.productAvailable}>Available</Text>
                    ) : (
                      <Text style={styles.productUnavailable}>Unavailable</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
            {businessOfferings.length > 10 && (
              <Text style={styles.moreItemsText}>
                +{businessOfferings.length - 10} more items
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo();
      case 'visuals':
        return renderVisuals();
      case 'products':
        return renderProducts();
      case 'contact':
        return renderContact();
      case 'hours':
        return renderOperatingHours();
      case 'services':
        return renderServiceOptions();
      case 'social':
        return renderSocialMedia();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderProfileCompleteness()}
      {renderTabs()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderContent()}
        
        {/* Preview Buttons */}
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Preview how customers will see your business:</Text>
          
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={() => navigation.navigate('BusinessDetail', {
              businessId: businessData?.businessId || 'preview',
              businessName: profile?.basic?.businessName,
              previewMode: true,
              previewData: profile,
            })}
          >
            <Icon name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.previewButtonText}>Preview Full Profile</Text>
          </TouchableOpacity>
          
          <View style={styles.listingPreview}>
            <Text style={styles.listingPreviewTitle}>Marketplace Listing Preview:</Text>
            <View style={styles.businessCard}>
              {profile?.visuals?.logoImage ? (
                <Image source={{ uri: profile.visuals.logoImage }} style={styles.businessLogo} />
              ) : (
                <View style={styles.businessLogoPlaceholder}>
                  <Icon name="business-outline" size={24} color="#9ca3af" />
                </View>
              )}
              <View style={styles.businessInfo}>
                <Text style={styles.businessName} numberOfLines={1}>
                  {profile?.basic?.businessName || 'Your Business Name'}
                </Text>
                <Text style={styles.businessCategory}>
                  {profile?.discovery?.mainCategory || 'Business Category'}
                </Text>
                <View style={styles.businessMeta}>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={14} color="#fbbf24" />
                    <Text style={styles.rating}>
                      {profile?.reputation?.rating || '0.0'} ({profile?.reputation?.reviewCount || 0})
                    </Text>
                  </View>
                  <Text style={styles.businessLocation}>
                    {profile?.contact?.address?.city || 'City'}
                  </Text>
                </View>
                {profile?.reputation?.verified && (
                  <View style={styles.verifiedBadge}>
                    <Icon name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
        
        {/* Auto-save indicator */}
        {hasChanges && (
          <View style={styles.autoSaveIndicator}>
            <ActivityIndicator size="small" color="#6b7280" />
            <Text style={styles.autoSaveText}>Auto-saving...</Text>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveButton: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completenessCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completenessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  completenessPercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  completenessHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 4,
    minHeight: 50,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 48,
  },
  activeTab: {
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
    lineHeight: 18,
  },
  activeTabText: {
    color: '#10b981',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 20,
  },
  imageUpload: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 150,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  logoUpload: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 60,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  uploadedLogo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  galleryItem: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayLabel: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  hourControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
    fontSize: 14,
    textAlign: 'center',
  },
  timeSeparator: {
    marginHorizontal: 8,
    color: '#6b7280',
  },
  serviceOption: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  optionDetails: {
    paddingLeft: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 80,
    fontSize: 14,
    textAlign: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  autoSaveText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  syncButtonText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#4b5563',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  productsList: {
    marginTop: 8,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  productAvailable: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  productUnavailable: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  moreItemsText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  previewSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  listingPreview: {
    marginTop: 20,
    marginBottom: 20,
  },
  listingPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12,
  },
  businessCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  businessLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  businessLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    color: '#4b5563',
    marginLeft: 4,
  },
  businessLocation: {
    fontSize: 13,
    color: '#6b7280',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  subcategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    marginBottom: 8,
  },
  subcategoryChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  subcategoryChipDisabled: {
    opacity: 0.5,
  },
  subcategoryChipText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 6,
    fontWeight: '500',
  },
  subcategoryChipTextSelected: {
    color: '#fff',
  },
  selectedCount: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '500',
  },
});