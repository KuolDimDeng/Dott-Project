import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../../context/AuthContext';
import { businessApi } from '../../services/businessApi';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ENTITY_TYPES,
  INDIVIDUAL_CATEGORIES,
  BUSINESS_CATEGORIES,
  REGISTRATION_STATUS,
  VEHICLE_TYPES,
  mapToBackendType,
} from '../../constants/businessTypes';

export default function BusinessRegistrationScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Entity Type
    entityType: '',
    
    // Step 2: Business Category
    businessCategory: '',
    businessType: '',
    
    // Step 3: Basic Info
    businessName: '',
    registrationStatus: '',
    registrationNumber: '',
    
    // Step 4: Contact Info
    businessPhone: '',
    businessEmail: user?.email || '',
    businessAddress: '',
    city: '',
    country: 'SS', // Default to South Sudan
    
    // Step 5: Additional Services (Courier option)
    offersCourier: false,
    vehicleType: '',
    vehicleRegistration: '',
    
    // Documents
    governmentId: null,
    driversLicense: null,
    businessLicense: null,
  });

  const totalSteps = 5;

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.entityType) {
          Alert.alert('Required', 'Please select your business entity type');
          return false;
        }
        break;
      case 2:
        if (!formData.businessCategory || !formData.businessType) {
          Alert.alert('Required', 'Please select your business category and type');
          return false;
        }
        break;
      case 3:
        // Business name is optional for individual service providers
        const isIndividual = formData.entityType === 'INDIVIDUAL';
        if (!isIndividual && !formData.businessName) {
          Alert.alert('Required', 'Please enter your business name');
          return false;
        }
        if (!formData.registrationStatus) {
          Alert.alert('Required', 'Please select your registration status');
          return false;
        }
        break;
      case 4:
        if (!formData.businessPhone || !formData.businessAddress || !formData.city) {
          Alert.alert('Required', 'Please fill in all contact information');
          return false;
        }
        break;
      case 5:
        if (formData.offersCourier && !formData.vehicleType) {
          Alert.alert('Required', 'Please select your vehicle type');
          return false;
        }
        break;
    }
    return true;
  };

  const handleImagePicker = (fieldName) => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.7,
    };

    launchImageLibrary(options, (response) => {
      if (!response.didCancel && !response.error) {
        const imageData = `data:${response.assets[0].type};base64,${response.assets[0].base64}`;
        setFormData({ ...formData, [fieldName]: imageData });
      }
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // For individual service providers without a business name, use their personal name or a default
      let businessName = formData.businessName;
      if (formData.entityType === 'INDIVIDUAL' && !businessName) {
        // Get the business type label for context
        const selectedType = INDIVIDUAL_CATEGORIES[formData.businessCategory]?.types.find(
          t => t.value === formData.businessType
        );
        // Use user's name + service type, or just service type
        businessName = user?.name ? 
          `${user.name} - ${selectedType?.label || 'Service Provider'}` : 
          selectedType?.label || 'Individual Service Provider';
      }
      
      // Prepare submission data
      const submissionData = {
        business_name: businessName,
        business_type: mapToBackendType(formData.businessType),
        entity_type: formData.entityType,
        registration_status: formData.registrationStatus,
        registration_number: formData.registrationNumber || '',
        phone: formData.businessPhone,
        email: formData.businessEmail,
        address: formData.businessAddress,
        city: formData.city,
        country: formData.country,
        offers_courier_services: formData.offersCourier,
      };

      // If offering courier services, add courier-specific data
      if (formData.offersCourier) {
        submissionData.courier_data = {
          vehicle_type: formData.vehicleType,
          vehicle_registration: formData.vehicleRegistration || '',
          government_id: formData.governmentId,
          drivers_license: formData.driversLicense,
        };
      }

      // Submit to backend
      const response = await businessApi.registerBusiness(submissionData);

      Alert.alert(
        'Success',
        'Your business registration has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              refreshUser();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to register business');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {[...Array(totalSteps)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressStep,
              index < currentStep && styles.progressStepCompleted,
              index === currentStep - 1 && styles.progressStepActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderEntityTypeStep();
      case 2:
        return renderBusinessCategoryStep();
      case 3:
        return renderBasicInfoStep();
      case 4:
        return renderContactInfoStep();
      case 5:
        return renderAdditionalServicesStep();
      default:
        return null;
    }
  };

  const renderEntityTypeStep = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>What type of business entity are you?</Text>
        <Text style={styles.stepSubtitle}>
          This helps us customize your experience
        </Text>

        {ENTITY_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.entityCard,
              formData.entityType === type.value && styles.entityCardSelected,
            ]}
            onPress={() => setFormData({ ...formData, entityType: type.value })}
          >
            <View style={styles.entityCardContent}>
              <Text style={[
                styles.entityCardTitle,
                formData.entityType === type.value && styles.entityCardTitleSelected
              ]}>
                {type.label}
              </Text>
              <Text style={[
                styles.entityCardDescription,
                formData.entityType === type.value && styles.entityCardDescriptionSelected
              ]}>
                {type.description}
              </Text>
            </View>
            {formData.entityType === type.value && (
              <Icon name="checkmark-circle" size={24} color="#2563eb" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderBusinessCategoryStep = () => {
    const categories = formData.entityType === 'INDIVIDUAL' 
      ? INDIVIDUAL_CATEGORIES 
      : BUSINESS_CATEGORIES;

    const selectedCategory = categories[formData.businessCategory];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select your business category</Text>
        <Text style={styles.stepSubtitle}>
          Choose the category that best describes your {formData.entityType === 'INDIVIDUAL' ? 'service' : 'business'}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Category Selection */}
          {!formData.businessCategory ? (
            <View>
              {Object.entries(categories).map(([key, category]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.categoryCard}
                  onPress={() => setFormData({ ...formData, businessCategory: key, businessType: '' })}
                >
                  <Icon name={category.icon} size={28} color="#2563eb" />
                  <Text style={styles.categoryCardTitle}>{category.label}</Text>
                  <Icon name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={styles.selectedCategoryHeader}
                onPress={() => setFormData({ ...formData, businessCategory: '', businessType: '' })}
              >
                <Icon name="arrow-back" size={20} color="#2563eb" />
                <Text style={styles.selectedCategoryTitle}>{selectedCategory.label}</Text>
              </TouchableOpacity>

              {/* Type Selection within Category */}
              {selectedCategory.types.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    formData.businessType === type.value && styles.typeCardSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, businessType: type.value })}
                >
                  <Text style={[
                    styles.typeCardTitle,
                    formData.businessType === type.value && styles.typeCardTitleSelected
                  ]}>
                    {type.label}
                  </Text>
                  {formData.businessType === type.value && (
                    <Icon name="checkmark" size={20} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderBasicInfoStep = () => {
    const isIndividual = formData.entityType === 'INDIVIDUAL';
    
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {isIndividual ? 'Service Provider Information' : 'Business Information'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {isIndividual ? 'Tell us about your services' : 'Tell us about your business'}
        </Text>

        {/* Only show business name for non-individual entities */}
        {!isIndividual && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
              placeholder="Enter your business name"
            />
          </View>
        )}

        {/* Optional display name for individuals */}
        {isIndividual && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
              placeholder={`${user?.name || 'Your name'} - ${formData.businessType ? 
                INDIVIDUAL_CATEGORIES[formData.businessCategory]?.types.find(t => t.value === formData.businessType)?.label : 
                'Service Provider'}`}
            />
            <Text style={styles.inputHint}>
              Leave blank to use your personal name
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isIndividual ? 'Are you legally registered?' : 'Registration Status'} *
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.registrationStatus}
              onValueChange={(value) => setFormData({ ...formData, registrationStatus: value })}
            >
              <Picker.Item label="Select status" value="" />
              {REGISTRATION_STATUS.map((status) => (
                <Picker.Item key={status.value} label={status.label} value={status.value} />
              ))}
            </Picker>
          </View>
        </View>

        {formData.registrationStatus === 'REGISTERED' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Registration/License Number</Text>
            <TextInput
              style={styles.input}
              value={formData.registrationNumber}
              onChangeText={(text) => setFormData({ ...formData, registrationNumber: text })}
              placeholder={isIndividual ? 'Enter license/permit number' : 'Enter registration number'}
            />
          </View>
        )}

        {formData.registrationStatus === 'REGISTERED' && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleImagePicker('businessLicense')}
          >
            <Icon name="document-outline" size={24} color="#2563eb" />
            <Text style={styles.uploadButtonText}>
              {formData.businessLicense ? 
                (isIndividual ? 'License/Permit Uploaded ✓' : 'Business License Uploaded ✓') : 
                (isIndividual ? 'Upload License/Permit' : 'Upload Business License')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContactInfoStep = () => {
    const isIndividual = formData.entityType === 'INDIVIDUAL';
    
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Contact Information</Text>
        <Text style={styles.stepSubtitle}>How can customers reach you?</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isIndividual ? 'Contact Phone' : 'Business Phone'} *
          </Text>
          <TextInput
            style={styles.input}
            value={formData.businessPhone}
            onChangeText={(text) => setFormData({ ...formData, businessPhone: text })}
            placeholder="+211 xxx xxx xxx"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isIndividual ? 'Contact Email' : 'Business Email'}
          </Text>
          <TextInput
            style={styles.input}
            value={formData.businessEmail}
            onChangeText={(text) => setFormData({ ...formData, businessEmail: text })}
            placeholder={isIndividual ? 'your@email.com' : 'business@example.com'}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {isIndividual ? 'Service Location' : 'Business Address'} *
          </Text>
          <TextInput
            style={styles.input}
            value={formData.businessAddress}
            onChangeText={(text) => setFormData({ ...formData, businessAddress: text })}
            placeholder="Street address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>City *</Text>
          <TextInput
            style={styles.input}
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="e.g., Juba"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Country</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.country}
              onValueChange={(value) => setFormData({ ...formData, country: value })}
            >
              <Picker.Item label="South Sudan" value="SS" />
              <Picker.Item label="Kenya" value="KE" />
              <Picker.Item label="Uganda" value="UG" />
              <Picker.Item label="Tanzania" value="TZ" />
              <Picker.Item label="Rwanda" value="RW" />
              <Picker.Item label="Ethiopia" value="ET" />
            </Picker>
          </View>
        </View>
      </View>
    );
  };

  const renderAdditionalServicesStep = () => {
    const isTransportCategory = formData.businessCategory === 'TRANSPORT_DELIVERY';
    const isCourierType = formData.businessType === 'COURIER';

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Additional Services</Text>
        <Text style={styles.stepSubtitle}>Would you like to offer delivery services?</Text>

        {!isTransportCategory && (
          <View style={styles.courierOptionContainer}>
            <TouchableOpacity
              style={[
                styles.courierOption,
                formData.offersCourier === true && styles.courierOptionSelected,
              ]}
              onPress={() => setFormData({ ...formData, offersCourier: true })}
            >
              <Icon name="bicycle" size={32} color={formData.offersCourier ? '#2563eb' : '#6b7280'} />
              <Text style={styles.courierOptionTitle}>Yes, I want to be a courier</Text>
              <Text style={styles.courierOptionSubtitle}>Deliver products and earn extra income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.courierOption,
                formData.offersCourier === false && styles.courierOptionSelected,
              ]}
              onPress={() => setFormData({ ...formData, offersCourier: false })}
            >
              <Icon name="business" size={32} color={!formData.offersCourier ? '#2563eb' : '#6b7280'} />
              <Text style={styles.courierOptionTitle}>No, just my business</Text>
              <Text style={styles.courierOptionSubtitle}>Focus on my primary business only</Text>
            </TouchableOpacity>
          </View>
        )}

        {(formData.offersCourier || isTransportCategory || isCourierType) && (
          <View style={styles.courierDetails}>
            <Text style={styles.sectionTitle}>Delivery Service Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vehicle Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.vehicleType}
                  onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                >
                  <Picker.Item label="Select vehicle" value="" />
                  {VEHICLE_TYPES.map((vehicle) => (
                    <Picker.Item key={vehicle.value} label={vehicle.label} value={vehicle.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {formData.vehicleType && formData.vehicleType !== 'bicycle' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Registration</Text>
                <TextInput
                  style={styles.input}
                  value={formData.vehicleRegistration}
                  onChangeText={(text) => setFormData({ ...formData, vehicleRegistration: text })}
                  placeholder="Enter vehicle registration number"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImagePicker('governmentId')}
            >
              <Icon name="card-outline" size={24} color="#2563eb" />
              <Text style={styles.uploadButtonText}>
                {formData.governmentId ? 'Government ID Uploaded ✓' : 'Upload Government ID *'}
              </Text>
            </TouchableOpacity>

            {formData.vehicleType && formData.vehicleType !== 'bicycle' && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleImagePicker('driversLicense')}
              >
                <Icon name="car-outline" size={24} color="#2563eb" />
                <Text style={styles.uploadButtonText}>
                  {formData.driversLicense ? 'Driver\'s License Uploaded ✓' : 'Upload Driver\'s License *'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Registration</Text>
        <View style={{ width: 28 }} />
      </View>

      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.disabledButton]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Submit' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginBottom: 2,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressStepCompleted: {
    backgroundColor: '#10b981',
  },
  progressStepActive: {
    backgroundColor: '#2563eb',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  entityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entityCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  entityCardContent: {
    flex: 1,
  },
  entityCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  entityCardTitleSelected: {
    color: '#2563eb',
  },
  entityCardDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  entityCardDescriptionSelected: {
    color: '#1e40af',
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 16,
  },
  selectedCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  selectedCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 12,
  },
  typeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  typeCardTitle: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  typeCardTitleSelected: {
    color: '#2563eb',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '500',
    marginLeft: 8,
  },
  courierOptionContainer: {
    marginBottom: 24,
  },
  courierOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  courierOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  courierOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  courierOptionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  courierDetails: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});