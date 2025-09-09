import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../../context/AuthContext';
import { courierApi } from '../../services/courierApi';
import { Picker } from '@react-native-picker/picker';

const RequestDeliveryScreen = ({ navigation }) => {
  const { session } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Pickup details
    pickup_business_name: session?.user?.business_name || '',
    pickup_contact_name: session?.user?.name || '',
    pickup_phone: session?.user?.phone || '',
    pickup_address: '',
    pickup_city: '',
    pickup_notes: '',
    
    // Delivery details
    delivery_name: '',
    delivery_phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_notes: '',
    
    // Package details
    package_description: '',
    package_weight: '',
    fragile: false,
    perishable: false,
    delivery_category: 'general',
    priority: 'standard',
    
    // Payment
    payment_method: 'cash',
  });

  const deliveryCategories = [
    { value: 'food', label: 'Food & Beverages' },
    { value: 'groceries', label: 'Groceries' },
    { value: 'pharmacy', label: 'Pharmacy/Medical' },
    { value: 'documents', label: 'Documents' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'general', label: 'General Items' },
  ];

  const priorityOptions = [
    { value: 'standard', label: 'Standard (2-4 hours)', price: 5 },
    { value: 'express', label: 'Express (1-2 hours)', price: 10 },
    { value: 'urgent', label: 'Urgent (30-60 min)', price: 20 },
  ];

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.pickup_address || !formData.delivery_address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await courierApi.requestDelivery({
        ...formData,
        package_weight: formData.package_weight ? parseFloat(formData.package_weight) : null,
      });
      
      Alert.alert(
        'Success',
        `Delivery request created! Order #${response.order_number}\nA courier will be assigned soon.`,
        [
          {
            text: 'Track Order',
            onPress: () => navigation.navigate('TrackDelivery', { orderId: response.id }),
          },
        ]
      );
    } catch (error) {
      console.error('Error requesting delivery:', error);
      Alert.alert('Error', 'Failed to create delivery request');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Pickup Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.pickup_business_name}
                onChangeText={(text) => setFormData({ ...formData, pickup_business_name: text })}
                placeholder="Enter business name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.pickup_contact_name}
                onChangeText={(text) => setFormData({ ...formData, pickup_contact_name: text })}
                placeholder="Contact person name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.pickup_phone}
                onChangeText={(text) => setFormData({ ...formData, pickup_phone: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pickup Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.pickup_address}
                onChangeText={(text) => setFormData({ ...formData, pickup_address: text })}
                placeholder="Full pickup address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={formData.pickup_city}
                onChangeText={(text) => setFormData({ ...formData, pickup_city: text })}
                placeholder="City"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pickup Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.pickup_notes}
                onChangeText={(text) => setFormData({ ...formData, pickup_notes: text })}
                placeholder="Any special instructions for pickup"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Delivery Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.delivery_name}
                onChangeText={(text) => setFormData({ ...formData, delivery_name: text })}
                placeholder="Recipient's name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.delivery_phone}
                onChangeText={(text) => setFormData({ ...formData, delivery_phone: text })}
                placeholder="Recipient's phone"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.delivery_address}
                onChangeText={(text) => setFormData({ ...formData, delivery_address: text })}
                placeholder="Full delivery address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={formData.delivery_city}
                onChangeText={(text) => setFormData({ ...formData, delivery_city: text })}
                placeholder="City"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.delivery_notes}
                onChangeText={(text) => setFormData({ ...formData, delivery_notes: text })}
                placeholder="Any special instructions for delivery"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Package Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Package Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.package_description}
                onChangeText={(text) => setFormData({ ...formData, package_description: text })}
                placeholder="What are you sending?"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estimated Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={formData.package_weight}
                onChangeText={(text) => setFormData({ ...formData, package_weight: text })}
                placeholder="e.g., 2.5"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.delivery_category}
                  onValueChange={(value) => setFormData({ ...formData, delivery_category: value })}
                >
                  {deliveryCategories.map(cat => (
                    <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityOptions}>
                {priorityOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      formData.priority === option.value && styles.priorityOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, priority: option.value })}
                  >
                    <Text style={[
                      styles.priorityLabel,
                      formData.priority === option.value && styles.priorityLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.priorityPrice,
                      formData.priority === option.value && styles.priorityPriceSelected,
                    ]}>
                      +${option.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, fragile: !formData.fragile })}
              >
                <Icon
                  name={formData.fragile ? 'checkbox' : 'square-outline'}
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.checkboxLabel}>Fragile Item</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, perishable: !formData.perishable })}
              >
                <Icon
                  name={formData.perishable ? 'checkbox' : 'square-outline'}
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.checkboxLabel}>Perishable Item</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentOptions}>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    formData.payment_method === 'cash' && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, payment_method: 'cash' })}
                >
                  <Icon name="cash-outline" size={20} color="#007AFF" />
                  <Text style={styles.paymentLabel}>Cash</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    formData.payment_method === 'card' && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, payment_method: 'card' })}
                >
                  <Icon name="card-outline" size={20} color="#007AFF" />
                  <Text style={styles.paymentLabel}>Card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    formData.payment_method === 'mobile_money' && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, payment_method: 'mobile_money' })}
                >
                  <Icon name="phone-portrait-outline" size={20} color="#007AFF" />
                  <Text style={styles.paymentLabel}>Mobile Money</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Delivery</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Form */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.buttonTextSecondary}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < 3 ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => setCurrentStep(currentStep + 1)}
            >
              <Text style={styles.buttonTextPrimary}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextPrimary}>Request Delivery</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 30,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  priorityOptions: {
    gap: 10,
  },
  priorityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  priorityOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  priorityLabel: {
    fontSize: 16,
    color: '#333',
  },
  priorityLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  priorityPrice: {
    fontSize: 14,
    color: '#666',
  },
  priorityPriceSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkboxContainer: {
    marginTop: 20,
    gap: 15,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  paymentOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
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
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RequestDeliveryScreen;