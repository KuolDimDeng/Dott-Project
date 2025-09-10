import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { useNavigation, useRoute } from '@react-navigation/native';
import orderVerificationApi from '../../services/orderVerificationApi';

export default function CourierVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params;
  
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    getCurrentLocation();
    startExpiryTimer();
  }, []);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      error => console.log('Location error:', error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  const startExpiryTimer = () => {
    if (order.expiresAt) {
      const updateTimer = () => {
        const now = new Date();
        const expiry = new Date(order.expiresAt);
        const diff = expiry - now;
        
        if (diff <= 0) {
          setTimeRemaining('Expired');
          Alert.alert(
            'Code Expired',
            'The delivery code has expired. Please contact support.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  };

  const handlePasscodeChange = (value, index) => {
    const newPasscode = [...passcode];
    newPasscode[index] = value.toUpperCase();
    setPasscode(newPasscode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (index === 5 && value) {
      const fullCode = newPasscode.join('');
      if (fullCode.length === 6) {
        verifyDeliveryCode(fullCode);
      }
    }
  };

  const takeDeliveryPhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchCamera(options, response => {
      if (!response.didCancel && !response.error && response.assets?.[0]) {
        setDeliveryPhoto(response.assets[0].uri);
      }
    });
  };

  const verifyDeliveryCode = async (code) => {
    if (!deliveryPhoto) {
      Alert.alert('Photo Required', 'Please take a photo of the delivered order first.');
      return;
    }
    
    setLoading(true);
    try {
      // Upload delivery proof photo
      await orderVerificationApi.uploadDeliveryProof(order.id, deliveryPhoto);
      
      // Verify delivery code with location
      const result = await orderVerificationApi.verifyDeliveryCode(
        order.id,
        code,
        currentLocation
      );
      
      if (result.success) {
        Alert.alert(
          'Delivery Verified! 🎉',
          `Payment of $${result.courierPayment} has been released to your account.`,
          [
            { 
              text: 'Rate Customer', 
              onPress: () => setShowRatingModal(true)
            },
            {
              text: 'Complete',
              onPress: () => navigation.navigate('CourierDashboard')
            }
          ]
        );
      } else {
        Alert.alert('Invalid Code', 'The delivery code is incorrect. Please try again.');
        setPasscode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify delivery code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    try {
      await orderVerificationApi.submitRating(
        order.id,
        'delivery',
        rating,
        comment
      );
      setShowRatingModal(false);
      navigation.navigate('CourierDashboard');
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const renderRatingModal = () => (
    <Modal
      visible={showRatingModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowRatingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.ratingModal}>
          <Text style={styles.modalTitle}>Rate Customer</Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
              >
                <Icon
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color="#fbbf24"
                />
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setShowRatingModal(false);
                navigation.navigate('CourierDashboard');
              }}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitRating}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Verification</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <Text style={styles.deliveryAddress}>{order.deliveryAddress}</Text>
        </View>

        {timeRemaining && (
          <View style={styles.timerContainer}>
            <Icon name="time-outline" size={20} color="#ef4444" />
            <Text style={styles.timerText}>
              Code expires in: {timeRemaining}
            </Text>
          </View>
        )}

        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Delivery Photo</Text>
          <Text style={styles.sectionHint}>
            Take a photo of the delivered order at the customer's location
          </Text>
          
          {deliveryPhoto ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: deliveryPhoto }} style={styles.photo} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={takeDeliveryPhoto}
              >
                <Icon name="camera-outline" size={20} color="#2563eb" />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.takePhotoButton}
              onPress={takeDeliveryPhoto}
            >
              <Icon name="camera" size={32} color="#2563eb" />
              <Text style={styles.takePhotoText}>Take Delivery Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.passcodeSection}>
          <Text style={styles.sectionTitle}>Enter Delivery Code</Text>
          <Text style={styles.sectionHint}>
            Get this 6-character code from the customer
          </Text>
          
          <View style={styles.passcodeInputs}>
            {passcode.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={styles.passcodeInput}
                value={digit}
                onChangeText={(value) => handlePasscodeChange(value, index)}
                maxLength={1}
                keyboardType="default"
                autoCapitalize="characters"
                editable={!loading && deliveryPhoto !== null}
              />
            ))}
          </View>
          
          {!deliveryPhoto && (
            <Text style={styles.photoWarning}>
              ⚠️ Take delivery photo first
            </Text>
          )}
        </View>

        {currentLocation && (
          <View style={styles.locationInfo}>
            <Icon name="location" size={16} color="#10b981" />
            <Text style={styles.locationText}>
              GPS location captured (±{Math.round(currentLocation.accuracy)}m)
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!deliveryPhoto || passcode.join('').length !== 6) && styles.verifyButtonDisabled
          ]}
          onPress={() => verifyDeliveryCode(passcode.join(''))}
          disabled={!deliveryPhoto || passcode.join('').length !== 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.verifyButtonText}>Verify Delivery</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => {
            Alert.alert(
              'Contact Support',
              'Need help with this delivery?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Call Support', 
                  onPress: () => console.log('Calling support...')
                }
              ]
            );
          }}
        >
          <Icon name="help-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.supportButtonText}>Need Help?</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderRatingModal()}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#14532d',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 24,
  },
  content: {
    padding: 20,
  },
  orderInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  orderId: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  photoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retakeButtonText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 4,
  },
  takePhotoButton: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  takePhotoText: {
    fontSize: 16,
    color: '#2563eb',
    marginTop: 8,
  },
  passcodeSection: {
    marginBottom: 24,
  },
  passcodeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  passcodeInput: {
    width: 48,
    height: 56,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
  },
  photoWarning: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 6,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  commentInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});