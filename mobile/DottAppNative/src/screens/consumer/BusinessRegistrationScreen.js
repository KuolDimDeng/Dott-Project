import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../../context/AuthContext';
import { driverApi } from '../../services/driverApi';

const BUSINESS_TYPES = [
  { value: 'Transport/Delivery', label: 'Transport & Delivery Services' },
  { value: 'Food & Beverages', label: 'Food & Beverages' },
  { value: 'Shopping/Retail', label: 'Shopping & Retail' },
  { value: 'Health Services', label: 'Health Services' },
  { value: 'Professional Services', label: 'Professional Services' },
  { value: 'Home Services', label: 'Home Services' },
  { value: 'Beauty & Wellness', label: 'Beauty & Wellness' },
  { value: 'Education', label: 'Education & Training' },
  { value: 'Entertainment', label: 'Entertainment & Events' },
  { value: 'Other', label: 'Other Services' },
];

const LEGAL_STRUCTURES = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietor/Individual' },
  { value: 'LIMITED_COMPANY', label: 'Limited Company (Ltd)' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'NGO', label: 'NGO/Non-Profit' },
  { value: 'CORPORATION', label: 'Corporation' },
];

const VEHICLE_TYPES = [
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'car', label: 'Car' },
  { value: 'van', label: 'Van/Pickup' },
  { value: 'truck', label: 'Truck' },
  { value: 'scooter', label: 'E-Scooter' },
];

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
];

export default function BusinessRegistrationScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Business Information
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [legalStructure, setLegalStructure] = useState('SOLE_PROPRIETORSHIP');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Driver-specific fields (shown only for Transport/Delivery)
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');

  // License Information
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licenseFrontPhoto, setLicenseFrontPhoto] = useState(null);
  const [licenseBackPhoto, setLicenseBackPhoto] = useState(null);

  // ID Verification
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [idFrontPhoto, setIdFrontPhoto] = useState(null);
  const [idBackPhoto, setIdBackPhoto] = useState(null);
  const [selfieWithId, setSelfieWithId] = useState(null);

  // Service Configuration (for drivers)
  const [serviceRadius, setServiceRadius] = useState('10');
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [acceptsFood, setAcceptsFood] = useState(true);

  // Banking Information
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('mpesa');

  // Emergency Contact (for drivers)
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const isDriverBusiness = businessType === 'Transport/Delivery';

  const selectImage = (type) => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      const base64Image = `data:${response.assets[0].type};base64,${response.assets[0].base64}`;
      
      switch (type) {
        case 'licenseFront':
          setLicenseFrontPhoto(base64Image);
          break;
        case 'licenseBack':
          setLicenseBackPhoto(base64Image);
          break;
        case 'idFront':
          setIdFrontPhoto(base64Image);
          break;
        case 'idBack':
          setIdBackPhoto(base64Image);
          break;
        case 'selfie':
          setSelfieWithId(base64Image);
          break;
      }
    });
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!businessName || !businessType || !city || !country || !phoneNumber) {
          Alert.alert('Error', 'Please fill in all required fields');
          return false;
        }
        break;
      case 2:
        if (!idType || !idNumber || !idFrontPhoto) {
          Alert.alert('Error', 'Please provide ID information and upload ID photo');
          return false;
        }
        if (!selfieWithId) {
          Alert.alert('Error', 'Please take a selfie holding your ID');
          return false;
        }
        break;
      case 3:
        if (isDriverBusiness) {
          if (!vehicleType || !vehicleRegistration || !licenseNumber || !licenseExpiry) {
            Alert.alert('Error', 'Please fill in all vehicle and license information');
            return false;
          }
          if (!licenseFrontPhoto || !licenseBackPhoto) {
            Alert.alert('Error', 'Please upload both sides of your driver\'s license');
            return false;
          }
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < (isDriverBusiness ? 4 : 3)) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const registrationData = {
        business_name: businessName,
        business_type: businessType,
        legal_structure: legalStructure,
        city,
        country,
        phone_number: phoneNumber,
        id_type: idType,
        id_number: idNumber,
        id_front_photo: idFrontPhoto,
        id_back_photo: idBackPhoto,
        selfie_with_id: selfieWithId,
      };

      if (isDriverBusiness) {
        Object.assign(registrationData, {
          vehicle_type: vehicleType,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
          vehicle_color: vehicleColor,
          vehicle_registration: vehicleRegistration,
          license_number: licenseNumber,
          license_expiry: licenseExpiry,
          license_front_photo: licenseFrontPhoto,
          license_back_photo: licenseBackPhoto,
          service_radius_km: parseInt(serviceRadius),
          accepts_cash: acceptsCash,
          accepts_food_delivery: acceptsFood,
          bank_account_number: bankAccount,
          bank_name: bankName,
          mpesa_number: mpesaNumber,
          preferred_payout_method: payoutMethod,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
        });
      }

      const response = await driverApi.registerBusiness(registrationData);
      
      if (response.success) {
        await refreshUser();
        Alert.alert(
          'Success',
          isDriverBusiness
            ? 'Your driver application has been submitted for verification. You will be notified once approved.'
            : 'Your business has been registered successfully!',
          [{ text: 'OK', onPress: () => navigation.navigate('Business') }]
        );
      } else {
        Alert.alert('Error', response.message || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to register business. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Business Information</Text>
      
      <Text style={styles.label}>Business Name *</Text>
      <TextInput
        style={styles.input}
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="Enter your business name"
      />

      <Text style={styles.label}>Business Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={businessType}
          onValueChange={setBusinessType}
          style={styles.picker}
        >
          <Picker.Item label="Select business type..." value="" />
          {BUSINESS_TYPES.map((type) => (
            <Picker.Item key={type.value} label={type.label} value={type.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Legal Structure *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={legalStructure}
          onValueChange={setLegalStructure}
          style={styles.picker}
        >
          {LEGAL_STRUCTURES.map((structure) => (
            <Picker.Item key={structure.value} label={structure.label} value={structure.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>City *</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Enter city"
      />

      <Text style={styles.label}>Country *</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="Enter country code (e.g., US, KE)"
        maxLength={2}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="+254712345678"
        keyboardType="phone-pad"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Identity Verification</Text>
      <Text style={styles.subtitle}>To prevent fraud and ensure safety</Text>

      <Text style={styles.label}>ID Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={idType}
          onValueChange={setIdType}
          style={styles.picker}
        >
          {ID_TYPES.map((type) => (
            <Picker.Item key={type.value} label={type.label} value={type.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>ID Number *</Text>
      <TextInput
        style={styles.input}
        value={idNumber}
        onChangeText={setIdNumber}
        placeholder="Enter ID number"
      />

      <Text style={styles.label}>ID Front Photo *</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => selectImage('idFront')}
      >
        {idFrontPhoto ? (
          <Image source={{ uri: idFrontPhoto }} style={styles.uploadedImage} />
        ) : (
          <Text style={styles.uploadText}>📷 Upload ID Front</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>ID Back Photo</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => selectImage('idBack')}
      >
        {idBackPhoto ? (
          <Image source={{ uri: idBackPhoto }} style={styles.uploadedImage} />
        ) : (
          <Text style={styles.uploadText}>📷 Upload ID Back</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Selfie with ID *</Text>
      <Text style={styles.hint}>Take a selfie holding your ID document</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => selectImage('selfie')}
      >
        {selfieWithId ? (
          <Image source={{ uri: selfieWithId }} style={styles.uploadedImage} />
        ) : (
          <Text style={styles.uploadText}>🤳 Take Selfie with ID</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep3Driver = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Vehicle & License Information</Text>

      <Text style={styles.label}>Vehicle Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={vehicleType}
          onValueChange={setVehicleType}
          style={styles.picker}
        >
          {VEHICLE_TYPES.map((type) => (
            <Picker.Item key={type.value} label={type.label} value={type.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Vehicle Registration *</Text>
      <TextInput
        style={styles.input}
        value={vehicleRegistration}
        onChangeText={setVehicleRegistration}
        placeholder="e.g., KBA 123X"
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Vehicle Make</Text>
      <TextInput
        style={styles.input}
        value={vehicleMake}
        onChangeText={setVehicleMake}
        placeholder="e.g., Toyota"
      />

      <Text style={styles.label}>Vehicle Model</Text>
      <TextInput
        style={styles.input}
        value={vehicleModel}
        onChangeText={setVehicleModel}
        placeholder="e.g., Corolla"
      />

      <Text style={styles.label}>Vehicle Color</Text>
      <TextInput
        style={styles.input}
        value={vehicleColor}
        onChangeText={setVehicleColor}
        placeholder="e.g., White"
      />

      <Text style={styles.label}>Driver's License Number *</Text>
      <TextInput
        style={styles.input}
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        placeholder="Enter license number"
      />

      <Text style={styles.label}>License Expiry Date *</Text>
      <TextInput
        style={styles.input}
        value={licenseExpiry}
        onChangeText={setLicenseExpiry}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>License Front Photo *</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => selectImage('licenseFront')}
      >
        {licenseFrontPhoto ? (
          <Image source={{ uri: licenseFrontPhoto }} style={styles.uploadedImage} />
        ) : (
          <Text style={styles.uploadText}>📷 Upload License Front</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>License Back Photo *</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => selectImage('licenseBack')}
      >
        {licenseBackPhoto ? (
          <Image source={{ uri: licenseBackPhoto }} style={styles.uploadedImage} />
        ) : (
          <Text style={styles.uploadText}>📷 Upload License Back</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep4Driver = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Service & Payment Settings</Text>

      <Text style={styles.label}>Service Radius (km)</Text>
      <TextInput
        style={styles.input}
        value={serviceRadius}
        onChangeText={setServiceRadius}
        placeholder="10"
        keyboardType="numeric"
      />

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={[styles.checkbox, acceptsCash && styles.checkboxChecked]}
          onPress={() => setAcceptsCash(!acceptsCash)}
        >
          <Text style={styles.checkboxText}>Accept Cash Payments</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={[styles.checkbox, acceptsFood && styles.checkboxChecked]}
          onPress={() => setAcceptsFood(!acceptsFood)}
        >
          <Text style={styles.checkboxText}>Accept Food Deliveries</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Payment Information</Text>

      <Text style={styles.label}>Preferred Payout Method</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={payoutMethod}
          onValueChange={setPayoutMethod}
          style={styles.picker}
        >
          <Picker.Item label="M-Pesa" value="mpesa" />
          <Picker.Item label="Bank Transfer" value="bank" />
          <Picker.Item label="Cash Pickup" value="cash" />
        </Picker>
      </View>

      {payoutMethod === 'mpesa' && (
        <>
          <Text style={styles.label}>M-Pesa Number</Text>
          <TextInput
            style={styles.input}
            value={mpesaNumber}
            onChangeText={setMpesaNumber}
            placeholder="+254712345678"
            keyboardType="phone-pad"
          />
        </>
      )}

      {payoutMethod === 'bank' && (
        <>
          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g., Equity Bank"
          />

          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={bankAccount}
            onChangeText={setBankAccount}
            placeholder="Enter account number"
          />
        </>
      )}

      <Text style={styles.sectionTitle}>Emergency Contact</Text>

      <Text style={styles.label}>Contact Name</Text>
      <TextInput
        style={styles.input}
        value={emergencyName}
        onChangeText={setEmergencyName}
        placeholder="Emergency contact name"
      />

      <Text style={styles.label}>Contact Phone</Text>
      <TextInput
        style={styles.input}
        value={emergencyPhone}
        onChangeText={setEmergencyPhone}
        placeholder="+254712345678"
        keyboardType="phone-pad"
      />
    </View>
  );

  const getTotalSteps = () => isDriverBusiness ? 4 : 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Your Business</Text>
        <Text style={styles.progress}>Step {step} of {getTotalSteps()}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && !isDriverBusiness && renderStep2()}
        {step === 3 && isDriverBusiness && renderStep3Driver()}
        {step === 4 && isDriverBusiness && renderStep4Driver()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === getTotalSteps() ? 'Submit' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  progress: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  checkboxContainer: {
    marginTop: 10,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  checkboxChecked: {
    backgroundColor: '#e6f2ff',
    borderColor: '#2563eb',
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#2563eb',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});