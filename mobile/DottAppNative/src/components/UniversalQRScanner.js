import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';
import LottieView from 'lottie-react-native';
import dualQRApi from '../services/dualQRApi';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function UniversalQRScanner({ 
  visible, 
  onClose, 
  currentQRType,
  onScanSuccess,
  amount,
  currency,
}) {
  const [scanning, setScanning] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorData, setErrorData] = useState(null);
  const [flashAnimation] = useState(new Animated.Value(0));
  const [shakeAnimation] = useState(new Animated.Value(0));
  
  // QR Type Colors
  const QR_COLORS = {
    'DOTT_PAY': '#2563eb',  // Blue - Payment
    'DOTT_RECEIVE_STATIC': '#10b981',  // Green - Receive
    'DOTT_RECEIVE_DYNAMIC': '#10b981',  // Green - Receive
    'DOTT_REQUEST': '#eab308',  // Yellow - Request
    'DOTT_SPLIT': '#9333ea',  // Purple - Split
  };
  
  const getCurrentQRColor = () => QR_COLORS[currentQRType] || '#666';
  
  const handleQRScan = async (event) => {
    if (scanning) return;
    setScanning(true);
    
    try {
      // Decode QR data
      const qrData = event.nativeEvent?.codeStringValue || event.data;
      const decodedData = JSON.parse(atob(qrData));
      
      // Validate QR type and check for color mismatch
      const validationResult = validateQRCombination(currentQRType, decodedData.type);
      
      if (!validationResult.valid) {
        // Show error with multi-sensory feedback
        showSafetyError(validationResult);
        setScanning(false);
        return;
      }
      
      // Valid combination - process scan
      const result = await dualQRApi.universalScan({
        my_qr_type: currentQRType,
        scanned_qr_data: qrData,
        amount: amount,
        currency: currency,
      });
      
      if (result.success) {
        playSuccessSound();
        if (onScanSuccess) {
          onScanSuccess(result);
        }
      } else {
        Alert.alert('Error', result.error || 'Scan failed');
      }
      
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert('Scan Error', 'Failed to read QR code. Please try again.');
    } finally {
      setScanning(false);
    }
  };
  
  const validateQRCombination = (myType, theirType) => {
    // Both BLUE (Payment) - Error!
    if (myType === 'DOTT_PAY' && theirType === 'DOTT_PAY') {
      return {
        valid: false,
        error: 'BOTH_PAYING',
        title: '🔵🔵 Both Showing BLUE!',
        message: "You're both trying to PAY!\nOne must show GREEN to receive.",
        instruction: 'Ask them to switch to GREEN QR',
        visual: '💙 + 💙 = ❌',
        canAutoSwitch: true,
      };
    }
    
    // Both GREEN (Receive) - Error!
    if (myType.includes('RECEIVE') && theirType.includes('RECEIVE')) {
      return {
        valid: false,
        error: 'BOTH_RECEIVING',
        title: '🟢🟢 Both Showing GREEN!',
        message: "You're both trying to RECEIVE!\nOne must show BLUE to pay.",
        instruction: 'Switch to your BLUE QR',
        visual: '💚 + 💚 = ❌',
        canAutoSwitch: true,
      };
    }
    
    // Valid combinations
    return { valid: true };
  };
  
  const showSafetyError = (error) => {
    // Multi-sensory feedback
    flashScreen('#ef4444');  // Red flash
    playErrorSound();
    Vibration.vibrate([100, 50, 100, 50, 100]);  // Triple buzz
    shakeScreen();
    
    setErrorData(error);
    setErrorVisible(true);
  };
  
  const flashScreen = (color) => {
    Animated.sequence([
      Animated.timing(flashAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };
  
  const shakeScreen = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };
  
  const playErrorSound = () => {
    const sound = new Sound('error_buzz.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (!error) sound.play();
    });
  };
  
  const playSuccessSound = () => {
    const sound = new Sound('success_ding.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (!error) sound.play();
    });
  };
  
  const renderSafetyErrorModal = () => (
    <Modal
      visible={errorVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setErrorVisible(false)}
    >
      <View style={styles.errorOverlay}>
        <Animated.View 
          style={[
            styles.errorContainer,
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          {/* Error Animation */}
          <View style={styles.errorAnimation}>
            <LottieView
              source={require('../animations/error-x.json')}
              autoPlay
              loop
              style={{ width: 120, height: 120 }}
            />
          </View>
          
          {/* Visual Formula */}
          <Text style={styles.errorFormula}>{errorData?.visual}</Text>
          
          {/* Error Title */}
          <Text style={styles.errorTitle}>{errorData?.title}</Text>
          
          {/* Error Message */}
          <Text style={styles.errorMessage}>{errorData?.message}</Text>
          
          {/* Correct Way Visual */}
          <View style={styles.correctWay}>
            <Text style={styles.correctTitle}>Correct Way:</Text>
            <View style={styles.correctVisual}>
              <View style={[styles.qrIcon, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.qrIconText}>💙</Text>
              </View>
              <Icon name="arrow-forward" size={24} color="#666" />
              <View style={[styles.qrIcon, { backgroundColor: '#10b981' }]}>
                <Text style={styles.qrIconText}>💚</Text>
              </View>
              <Icon name="checkmark-circle" size={24} color="#10b981" />
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.errorActions}>
            {errorData?.canAutoSwitch && (
              <TouchableOpacity
                style={[styles.errorButton, styles.switchButton]}
                onPress={() => {
                  // Auto switch QR type
                  setErrorVisible(false);
                  onClose();
                  // Navigate to correct QR
                  navigation.navigate('DualQRDisplay', {
                    switchTo: currentQRType === 'DOTT_PAY' ? 'receive' : 'payment'
                  });
                }}
              >
                <Icon name="swap-horizontal" size={20} color="white" />
                <Text style={styles.switchButtonText}>Switch My QR</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.errorButton, styles.retryButton]}
              onPress={() => {
                setErrorVisible(false);
                setErrorData(null);
              }}
            >
              <Icon name="refresh" size={20} color="#2563eb" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.errorButton, styles.cancelButton]}
              onPress={() => {
                setErrorVisible(false);
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      
      {/* Red Flash Overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnimation,
            backgroundColor: '#ef4444',
          }
        ]}
        pointerEvents="none"
      />
    </Modal>
  );
  
  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <View style={styles.scanArea}>
        {/* Color-coded frame */}
        <View style={[styles.scanFrame, { borderColor: getCurrentQRColor() }]}>
          {/* Animated scan line */}
          <Animated.View style={[styles.scanLine, { backgroundColor: getCurrentQRColor() }]} />
          
          {/* Corner markers */}
          <View style={[styles.corner, styles.cornerTL, { borderColor: getCurrentQRColor() }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: getCurrentQRColor() }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: getCurrentQRColor() }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: getCurrentQRColor() }]} />
        </View>
        
        {/* Current QR Type Indicator */}
        <View style={[styles.qrTypeIndicator, { backgroundColor: getCurrentQRColor() }]}>
          <Text style={styles.qrTypeText}>
            You're showing: {currentQRType.includes('PAY') ? 'BLUE (Pay)' : 'GREEN (Receive)'}
          </Text>
        </View>
        
        {/* Hint Text */}
        <Text style={styles.scanHint}>
          {currentQRType.includes('PAY') 
            ? 'Scan GREEN QR to pay' 
            : 'Scan BLUE QR to receive'}
        </Text>
      </View>
      
      {/* Mock scan button for testing */}
      <TouchableOpacity
        style={styles.mockScanButton}
        onPress={() => {
          // Simulate different QR types for testing
          const mockQRs = {
            correct: btoa(JSON.stringify({
              type: currentQRType.includes('PAY') ? 'DOTT_RECEIVE_STATIC' : 'DOTT_PAY',
              merchantId: 'MER_12345',
              timestamp: Date.now(),
            })),
            wrong: btoa(JSON.stringify({
              type: currentQRType,  // Same type - will trigger error
              userId: '67890',
              timestamp: Date.now(),
            })),
          };
          
          // Test with wrong QR to see error
          handleQRScan({ data: mockQRs.wrong });
        }}
      >
        <Text style={styles.mockScanText}>Test Scan (Dev)</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: getCurrentQRColor() }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Universal QR Scanner</Text>
        </View>
        
        {/* Scanner */}
        {renderScanner()}
        
        {/* Safety Tips */}
        <View style={styles.safetyTips}>
          <Text style={styles.tipsTitle}>Remember:</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tip}>✅ Blue + Green = Success</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipError}>❌ Blue + Blue = Error</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipError}>❌ Green + Green = Error</Text>
          </View>
        </View>
      </View>
      
      {/* Error Modal */}
      {renderSafetyErrorModal()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 16,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  scanLine: {
    width: '100%',
    height: 2,
    position: 'absolute',
    top: '50%',
  },
  qrTypeIndicator: {
    position: 'absolute',
    top: -40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  qrTypeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scanHint: {
    position: 'absolute',
    bottom: -40,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  mockScanButton: {
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  mockScanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  safetyTips: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  tipRow: {
    marginVertical: 4,
  },
  tip: {
    fontSize: 14,
    color: '#10b981',
  },
  tipError: {
    fontSize: 14,
    color: '#ef4444',
  },
  
  // Error Modal Styles
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    width: screenWidth - 40,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  errorAnimation: {
    marginBottom: 20,
  },
  errorFormula: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  correctWay: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    marginBottom: 24,
  },
  correctTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 12,
  },
  correctVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  qrIconText: {
    fontSize: 20,
  },
  errorActions: {
    width: '100%',
  },
  errorButton: {
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButton: {
    backgroundColor: '#2563eb',
  },
  switchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  retryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});