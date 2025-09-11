import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'react-native-image-picker';
import { useAuth } from '../../context/AuthContext';
import advertisingApi from '../../services/advertisingApi';

const CAMPAIGN_TYPES = [
  { id: 'featured', name: 'Featured Listing', icon: 'star', price: 'FREE', duration: 'Custom duration' },
  { id: 'banner', name: 'Banner Ad', icon: 'image', price: 'FREE', duration: 'Custom duration' },
  { id: 'spotlight', name: 'Spotlight', icon: 'flash', price: 'FREE', duration: 'Custom duration' },
  { id: 'premium', name: 'Premium Package', icon: 'diamond', price: 'FREE', duration: 'Custom duration' },
];

const PLATFORMS = [
  { id: 'marketplace', name: 'Marketplace', icon: 'storefront' },
  { id: 'discovery', name: 'Discovery', icon: 'compass' },
  { id: 'search', name: 'Search Results', icon: 'search' },
  { id: 'homepage', name: 'Homepage', icon: 'home' },
];

const CreateCampaignScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { editMode, campaign: existingCampaign } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState({
    name: existingCampaign?.name || '',
    description: existingCampaign?.description || '',
    type: existingCampaign?.type || 'featured',
    budget: existingCampaign?.budget || 50,
    daily_budget: existingCampaign?.daily_budget || 10,
    start_date: existingCampaign?.start_date ? new Date(existingCampaign.start_date) : new Date(),
    end_date: existingCampaign?.end_date ? new Date(existingCampaign.end_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    platforms: existingCampaign?.platforms || ['marketplace'],
    target_audience: existingCampaign?.target_audience || 'all',
    target_location: existingCampaign?.target_location || 'local',
    image_url: existingCampaign?.image_url || null,
    call_to_action: existingCampaign?.call_to_action || 'Learn More',
    landing_url: existingCampaign?.landing_url || '',
  });
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (editMode && existingCampaign) {
      loadCampaignData();
    }
  }, []);

  const loadCampaignData = () => {
    // Load existing campaign data if in edit mode
    if (existingCampaign?.image_url) {
      setSelectedImage({ uri: existingCampaign.image_url });
    }
  };

  const handleImagePicker = () => {
    const options = {
      title: 'Select Campaign Image',
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
      mediaType: 'photo',
      maxWidth: 1200,
      maxHeight: 800,
      quality: 0.8,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }
      
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setSelectedImage({
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName || 'campaign_image.jpg',
        });
      }
    });
  };

  const uploadImage = async () => {
    if (!selectedImage || selectedImage.uri === campaignData.image_url) {
      return campaignData.image_url;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || 'campaign_image.jpg',
      });
      formData.append('type', 'campaign');

      const response = await advertisingApi.uploadCampaignImage(formData);
      
      if (response.success && response.url) {
        return response.url;
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const calculatePrice = () => {
    // All campaigns are now completely free
    return 0;
  };

  const validateCampaign = () => {
    if (!campaignData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a campaign name');
      return false;
    }
    
    if (!campaignData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a campaign description');
      return false;
    }
    
    if (campaignData.platforms.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one platform');
      return false;
    }
    
    if (campaignData.end_date <= campaignData.start_date) {
      Alert.alert('Validation Error', 'End date must be after start date');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateCampaign()) {
      return;
    }

    setLoading(true);
    try {
      // Upload image first if selected
      let imageUrl = campaignData.image_url;
      if (selectedImage && selectedImage.uri !== campaignData.image_url) {
        imageUrl = await uploadImage();
        if (!imageUrl && campaignData.type === 'banner') {
          Alert.alert('Error', 'Banner ads require an image');
          setLoading(false);
          return;
        }
      }

      // Prepare campaign data - now completely free
      const submitData = {
        name: campaignData.name,
        description: campaignData.description,
        type: campaignData.type,
        platforms: campaignData.platforms,
        target_location: campaignData.target_location,
        target_audience: campaignData.target_audience,
        target_keywords: campaignData.target_keywords || '',
        start_date: campaignData.start_date,
        end_date: campaignData.end_date,
        total_budget: 0, // Free campaigns
        daily_budget: 0, // Free campaigns
        image_url: imageUrl,
        banner_text: campaignData.description,
        call_to_action: campaignData.call_to_action || 'Learn More',
        landing_url: campaignData.landing_url || '',
        payment_method: 'free', // Mark as free
        auto_activate: true, // Auto-activate without payment
      };

      console.log('📤 Submitting free campaign data:', submitData);

      let response;
      if (editMode && existingCampaign?.id) {
        response = await advertisingApi.updateCampaign(existingCampaign.id, submitData);
      } else {
        response = await advertisingApi.createCampaign(submitData);
      }

      if (response.success) {
        console.log('✅ Free campaign created and activated:', response.data.id);
        
        if (!editMode) {
          Alert.alert(
            'Campaign Activated! 🎉',
            'Your FREE advertising campaign is now live and will appear prominently in the marketplace. Customers will see your business featured in search results.',
            [
              {
                text: 'View in Marketplace',
                onPress: () => {
                  navigation.navigate('MainTabs', { 
                    screen: 'Marketplace',
                    params: { refresh: true }
                  });
                },
              },
              {
                text: 'Campaign Dashboard',
                onPress: () => navigation.navigate('AdvertiseScreen'),
                style: 'default',
              },
            ]
          );
        } else {
          Alert.alert(
            'Success',
            'Campaign updated successfully!',
            [{ text: 'OK', onPress: () => navigation.navigate('AdvertiseScreen') }]
          );
        }
      } else {
        throw new Error(response.message || 'Failed to save campaign');
      }
    } catch (error) {
      console.error('Campaign submission error:', error);
      Alert.alert('Error', error.message || 'Failed to save campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const togglePlatform = (platformId) => {
    setCampaignData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Campaign Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Campaign Name *</Text>
        <TextInput
          style={styles.input}
          value={campaignData.name}
          onChangeText={(text) => setCampaignData(prev => ({ ...prev, name: text }))}
          placeholder="e.g., Summer Sale 2024"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={campaignData.description}
          onChangeText={(text) => setCampaignData(prev => ({ ...prev, description: text }))}
          placeholder="Describe your campaign and what you're promoting..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Campaign Type *</Text>
        <View style={styles.typeGrid}>
          {CAMPAIGN_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                campaignData.type === type.id && styles.typeCardActive,
              ]}
              onPress={() => setCampaignData(prev => ({ ...prev, type: type.id }))}
            >
              <Icon
                name={type.icon}
                size={24}
                color={campaignData.type === type.id ? '#2563eb' : '#666'}
              />
              <Text style={[
                styles.typeName,
                campaignData.type === type.id && styles.typeNameActive,
              ]}>
                {type.name}
              </Text>
              <Text style={styles.typePrice}>{type.price} - {type.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Campaign Image</Text>
        <TouchableOpacity
          style={styles.imageUploadBox}
          onPress={handleImagePicker}
          disabled={uploading}
        >
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Icon name="cloud-upload-outline" size={40} color="#999" />
              <Text style={styles.uploadText}>Tap to upload image</Text>
              <Text style={styles.uploadHint}>Recommended: 1200x628px</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Target & Schedule</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Platforms *</Text>
        <View style={styles.platformGrid}>
          {PLATFORMS.map((platform) => (
            <TouchableOpacity
              key={platform.id}
              style={[
                styles.platformCard,
                campaignData.platforms.includes(platform.id) && styles.platformCardActive,
              ]}
              onPress={() => togglePlatform(platform.id)}
            >
              <Icon
                name={platform.icon}
                size={20}
                color={campaignData.platforms.includes(platform.id) ? '#2563eb' : '#666'}
              />
              <Text style={[
                styles.platformName,
                campaignData.platforms.includes(platform.id) && styles.platformNameActive,
              ]}>
                {platform.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Start Date *</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowStartPicker(true)}
        >
          <Icon name="calendar-outline" size={20} color="#666" />
          <Text style={styles.dateText}>
            {campaignData.start_date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={campaignData.start_date}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) {
                setCampaignData(prev => ({ ...prev, start_date: date }));
              }
            }}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>End Date *</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowEndPicker(true)}
        >
          <Icon name="calendar-outline" size={20} color="#666" />
          <Text style={styles.dateText}>
            {campaignData.end_date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={campaignData.end_date}
            mode="date"
            display="default"
            minimumDate={new Date(campaignData.start_date.getTime() + 24 * 60 * 60 * 1000)}
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) {
                setCampaignData(prev => ({ ...prev, end_date: date }));
              }
            }}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Target Location</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setCampaignData(prev => ({ ...prev, target_location: 'local' }))}
          >
            <View style={[styles.radio, campaignData.target_location === 'local' && styles.radioActive]} />
            <Text style={styles.radioLabel}>Local (City)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setCampaignData(prev => ({ ...prev, target_location: 'national' }))}
          >
            <View style={[styles.radio, campaignData.target_location === 'national' && styles.radioActive]} />
            <Text style={styles.radioLabel}>National</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Call to Action</Text>
        <TextInput
          style={styles.input}
          value={campaignData.call_to_action}
          onChangeText={(text) => setCampaignData(prev => ({ ...prev, call_to_action: text }))}
          placeholder="e.g., Shop Now, Learn More, Get Offer"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Payment</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Campaign Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{campaignData.name}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <Text style={styles.summaryValue}>
            {CAMPAIGN_TYPES.find(t => t.id === campaignData.type)?.name}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duration:</Text>
          <Text style={styles.summaryValue}>
            {Math.ceil((campaignData.end_date - campaignData.start_date) / (1000 * 60 * 60 * 24))} days
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Platforms:</Text>
          <Text style={styles.summaryValue}>
            {campaignData.platforms.map(p => 
              PLATFORMS.find(pl => pl.id === p)?.name
            ).join(', ')}
          </Text>
        </View>

        {selectedImage && (
          <View style={styles.summaryImageContainer}>
            <Text style={styles.summaryLabel}>Campaign Image:</Text>
            <Image source={{ uri: selectedImage.uri }} style={styles.summaryImage} />
          </View>
        )}
        
        <View style={styles.divider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Cost:</Text>
          <Text style={styles.totalValue}>FREE</Text>
        </View>
      </View>

      <View style={styles.paymentNote}>
        <Icon name="checkmark-circle" size={20} color="#10b981" />
        <Text style={styles.freeNoteText}>
          Your campaign will be activated immediately - completely FREE!
        </Text>
      </View>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step && styles.stepNumberActive,
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive,
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            {editMode ? 'Updating campaign...' : 'Creating campaign...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editMode ? 'Edit Campaign' : 'Create Campaign'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < 3 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (currentStep === 1 && !campaignData.name) {
                Alert.alert('Required', 'Please enter campaign name');
                return;
              }
              setCurrentStep(currentStep + 1);
            }}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {editMode ? 'Update Campaign' : 'Create FREE Campaign'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

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
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e1e8ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563eb',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e1e8ed',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#2563eb',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  typeCard: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 15,
    margin: '1%',
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
  },
  typeNameActive: {
    color: '#2563eb',
  },
  typePrice: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imageUploadBox: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    margin: 5,
  },
  platformCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  platformName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  platformNameActive: {
    color: '#2563eb',
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    marginRight: 8,
  },
  radioActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  summaryImageContainer: {
    marginTop: 15,
  },
  summaryImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e8ed',
    marginVertical: 15,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 15,
  },
  paymentNoteText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 10,
    flex: 1,
  },
  freeNoteText: {
    fontSize: 14,
    color: '#065f46',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  nextButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default CreateCampaignScreen;