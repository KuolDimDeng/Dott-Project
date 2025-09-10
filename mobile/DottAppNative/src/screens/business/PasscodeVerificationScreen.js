import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Modal,
  Image,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import ImagePicker from 'react-native-image-picker';
import orderVerificationApi from '../../services/orderVerificationApi';

export default function PasscodeVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { order, verificationType = 'pickup' } = route.params || {};
  
  // State
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [photoProof, setPhotoProof] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  
  // Refs
  const passcodeInputs = useRef([]);
  const timerRef = useRef(null);
  
  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
    startExpiryTimer();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const getCurrentLocation = async () => {
    try {
      const location = await orderVerificationApi.getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.log('Location not available:', error);
    }
  };
  
  const startExpiryTimer = () => {
    if (order?.passcode_expires_at) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const expiry = new Date(order.passcode_expires_at);
        const diff = expiry - now;
        
        if (diff <= 0) {
          clearInterval(timerRef.current);
          setTimeRemaining('EXPIRED');
          Alert.alert('Passcode Expired', 'This passcode has expired. Please request a new one.');
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
  };
  
  const handlePasscodeChange = (text) => {
    // Only allow alphanumeric characters
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 6) {
      setPasscode(cleaned);
      
      // Auto-submit when complete
      if (cleaned.length === 6) {
        handleVerify(cleaned);
      }
    }
  };
  
  const handleVerify = async (code = passcode) => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-character code');
      return;
    }
    
    // Check if photo proof is required for pickup
    if (verificationType === 'pickup' && !photoProof) {
      Alert.alert(
        'Photo Required',
        'Please take a photo of the prepared order before verification',
        [{ text: 'Take Photo', onPress: () => setShowPhotoModal(true) }]
      );
      return;
    }
    
    setVerifying(true);
    Vibration.vibrate(10);
    
    try {
      // Upload photo proof first if available
      if (photoProof) {
        await orderVerificationApi.uploadPickupProof(order.id, photoProof.uri);
      }
      
      // Verify the passcode
      let result;
      if (verificationType === 'pickup') {
        result = await orderVerificationApi.verifyPickupCode(
          order.id,
          code,
          currentLocation
        );
      } else {
        result = await orderVerificationApi.verifyDeliveryCode(
          order.id,
          code,
          currentLocation
        );
      }
      
      if (result.success) {
        Vibration.vibrate([0, 50, 100, 50]);
        
        // Show success message
        Alert.alert(
          '✅ Verification Successful',
          verificationType === 'pickup' 
            ? `Payment of ${result.businessPayment} has been released to your account`
            : `Payment of ${result.courierPayment} has been released to your account`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (result.ratingRequired) {
                  setShowRatingModal(true);
                } else {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        Vibration.vibrate([0, 200, 100, 200]);
        Alert.alert('Verification Failed', 'Invalid passcode. Please try again.');
        setPasscode('');
      }
    } catch (error) {
      Vibration.vibrate([0, 200, 100, 200]);
      
      if (error.response?.status === 400) {
        Alert.alert('Invalid Code', error.response.data.message || 'The code you entered is incorrect');
      } else if (error.response?.status === 410) {
        Alert.alert('Code Expired', 'This passcode has expired. Please request a new one.');
      } else {
        Alert.alert('Error', 'Unable to verify passcode. Please try again.');
      }
      setPasscode('');
    } finally {
      setVerifying(false);
    }
  };
  
  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 1024,
      maxHeight: 1024,
    };
    
    ImagePicker.launchCamera(options, (response) => {
      if (!response.didCancel && !response.error) {
        setPhotoProof(response.assets[0]);
        setShowPhotoModal(false);
      }
    });
  };
  
  const handleResendCode = async () => {
    setLoading(true);
    try {
      await orderVerificationApi.resendPasscode(order.id, verificationType);
      Alert.alert('Code Sent', 'A new passcode has been sent to the customer');
    } catch (error) {
      Alert.alert('Error', 'Unable to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReportIssue = () => {
    Alert.prompt(
      'Report Issue',
      'Please describe the problem you\'re experiencing:',
      async (description) => {
        if (description) {
          try {
            await orderVerificationApi.reportPasscodeIssue(
              order.id,
              'verification_failed',
              description
            );
            Alert.alert('Issue Reported', 'Support will contact you shortly');
          } catch (error) {
            Alert.alert('Error', 'Unable to report issue. Please try again.');
          }
        }
      }
    );
  };
  
  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }
    
    try {
      await orderVerificationApi.submitRating(
        order.id,
        verificationType,
        rating,
        ratingComment
      );
      setShowRatingModal(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Unable to submit rating. Please try again.');
    }
  };
  
  const renderPasscodeInput = () => {
    const digits = passcode.padEnd(6, ' ').split('');
    
    return (
      <View style={styles.passcodeContainer}>
        {digits.map((digit, index) => (
          <View key={index} style={styles.passcodeBox}>
            <Text style={styles.passcodeDigit}>
              {digit.trim() || '•'}
            </Text>
          </View>
        ))}
      </View>
    );
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
          <Text style={styles.modalTitle}>Rate Your Experience</Text>
          
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
            value={ratingComment}
            onChangeText={setRatingComment}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.skipButton]}
              onPress={() => {
                setShowRatingModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {verificationType === 'pickup' ? 'Pickup Verification' : 'Delivery Verification'}
            </Text>
            <View style={styles.timerContainer}>
              <Icon name="time-outline" size={20} color="#666" />
              <Text style={styles.timerText}>{timeRemaining || '--:--'}</Text>
            </View>
          </View>
          
          {/* Order Info */}
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>Order #{order?.id}</Text>
            <Text style={styles.orderCustomer}>
              {verificationType === 'pickup' 
                ? `Courier: ${order?.courier_name || 'Awaiting pickup'}`
                : `Customer: ${order?.customer_name}`}
            </Text>
            <Text style={styles.orderAmount}>Amount: ${order?.total || '0.00'}</Text>
          </View>
          
          {/* Instructions */}
          <View style={styles.instructions}>
            <Icon name="information-circle" size={24} color="#2563eb" />
            <Text style={styles.instructionText}>
              {verificationType === 'pickup'
                ? 'Enter the pickup code provided by the courier'
                : 'Enter the delivery code provided by the customer'}
            </Text>
          </View>
          
          {/* Photo Proof */}
          {verificationType === 'pickup' && (
            <TouchableOpacity
              style={styles.photoSection}
              onPress={() => setShowPhotoModal(true)}
            >
              {photoProof ? (
                <Image source={{ uri: photoProof.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="camera" size={32} color="#666" />
                  <Text style={styles.photoText}>Take Photo of Order</Text>
                  <Text style={styles.photoSubtext}>Required for verification</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          
          {/* Passcode Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter 6-Character Code</Text>
            {renderPasscodeInput()}
            <TextInput
              style={styles.hiddenInput}
              value={passcode}
              onChangeText={handlePasscodeChange}
              keyboardType="default"
              autoCapitalize="characters"
              autoFocus
              maxLength={6}
            />
          </View>
          
          {/* GPS Status */}
          {currentLocation && (
            <View style={styles.gpsStatus}>
              <Icon name="location" size={16} color="#10b981" />
              <Text style={styles.gpsText}>
                Location verified (±{Math.round(currentLocation.accuracy)}m)
              </Text>
            </View>
          )}
          
          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.verifyButton, verifying && styles.verifyingButton]}
            onPress={() => handleVerify()}
            disabled={verifying || passcode.length !== 6}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Help Options */}
          <View style={styles.helpOptions}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleResendCode}
              disabled={loading}
            >
              <Icon name="refresh" size={16} color="#2563eb" />
              <Text style={styles.helpButtonText}>Resend Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleReportIssue}
            >
              <Icon name="warning" size={16} color="#ef4444" />
              <Text style={[styles.helpButtonText, { color: '#ef4444' }]}>
                Report Issue
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModal}>
            <Text style={styles.modalTitle}>Take Photo Proof</Text>
            <Text style={styles.modalSubtitle}>
              Take a clear photo of the prepared order
            </Text>
            
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <Icon name="camera" size={32} color="#fff" />
              <Text style={styles.cameraButtonText}>Open Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Rating Modal */}
      {renderRatingModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  orderInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1e40af',
  },
  photoSection: {
    marginBottom: 20,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoPlaceholder: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  photoText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  photoSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#9ca3af',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  passcodeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  passcodeBox: {
    width: 45,
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passcodeDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    width: 1,
    height: 1,
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gpsText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#10b981',
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  verifyingButton: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  helpButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#2563eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  cameraButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  ratingModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#f3f4f6',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});