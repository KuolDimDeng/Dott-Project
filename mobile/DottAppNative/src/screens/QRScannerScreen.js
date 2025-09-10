import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import dualQRApi from '../services/dualQRApi';

export default function QRScannerScreen({ navigation, route }) {
  const { user } = useAuth();
  const { currentQRType, mode, onScanSuccess } = route.params || {};
  const scannerRef = useRef(null);
  
  const [scanning, setScanning] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [flashAnimation] = useState(new Animated.Value(1));
  const [currentColor, setCurrentColor] = useState('#2563eb'); // Default blue
  
  useEffect(() => {
    // Request camera permission
    requestCameraPermission();
    
    // Set color based on current QR type or mode
    if (mode === 'merchant_scan') {
      setCurrentColor('#9333ea'); // Purple for merchant scanning
    } else if (currentQRType?.includes('PAY')) {
      setCurrentColor('#2563eb'); // Blue for payment
    } else if (currentQRType?.includes('RECEIVE')) {
      setCurrentColor('#10b981'); // Green for receive
    }
  }, [currentQRType, mode]);
  
  const requestCameraPermission = async () => {
    try {
      // For iOS, if permissions are already granted or in simulator, just allow
      if (Platform.OS === 'ios') {
        setHasPermission(true);
        return;
      }
      
      const result = await request(PERMISSIONS.ANDROID.CAMERA);
      setHasPermission(result === RESULTS.GRANTED);
      
      if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in Settings to scan QR codes',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
      // Fallback to assuming permission is granted
      setHasPermission(true);
    }
  };
  
  const flashScreen = (color) => {
    Animated.sequence([
      Animated.timing(flashAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const showSafetyError = (error) => {
    // Multi-sensory feedback
    flashScreen('#ef4444'); // Red flash
    Vibration.vibrate([100, 50, 100, 50, 100]); // Triple buzz pattern
    
    Alert.alert(
      error.title || 'QR Color Mismatch!',
      error.message,
      [
        {
          text: 'Got It',
          onPress: () => setScanning(true),
          style: 'default',
        },
      ],
      { cancelable: false }
    );
  };
  
  const onQRCodeRead = async (e) => {
    if (!scanning) return;
    const data = e.data;
    setScanning(false);
    
    try {
      // Handle merchant scanning mode for POS payments
      if (mode === 'merchant_scan') {
        // For merchant scanning, extract customer ID from QR code
        let customerInfo;
        
        try {
          // Try to parse as JSON first (structured QR)
          const qrData = JSON.parse(data);
          const customerId = qrData.id || qrData.customer_id || data;
          
          // Get customer info from API
          const response = await dualQRApi.getCustomerInfo(customerId);
          customerInfo = response;
        } catch (parseError) {
          // If not JSON, treat as plain customer ID
          const response = await dualQRApi.getCustomerInfo(data);
          customerInfo = response;
        }
        
        if (onScanSuccess) {
          onScanSuccess(customerInfo);
        }
        
        navigation.goBack();
        return;
      }
      
      // Parse the scanned QR data for P2P payments
      const scannedData = JSON.parse(data);
      const scannedQRType = scannedData.type;
      
      // Validate QR combination locally first
      const validation = dualQRApi.validateQRCombination(currentQRType, scannedQRType);
      
      if (!validation.valid) {
        // Show safety error
        let errorDetails = {
          title: '🔴 Safety Error',
          message: 'Invalid QR combination!',
        };
        
        if (validation.error === 'BOTH_PAYING') {
          errorDetails = {
            title: '🔵🔵 Both Showing BLUE QR!',
            message: 'Both parties are trying to PAY. One person must show GREEN (Receive) QR to accept payment.',
          };
        } else if (validation.error === 'BOTH_RECEIVING') {
          errorDetails = {
            title: '💚💚 Both Showing GREEN QR!',
            message: 'Both parties are trying to RECEIVE. One person must show BLUE (Payment) QR to send payment.',
          };
        }
        
        showSafetyError(errorDetails);
        // Reactivate scanner after error
        setTimeout(() => {
          scannerRef.current?.reactivate();
          setScanning(true);
        }, 2000);
        return;
      }
      
      // Valid combination - proceed to payment flow
      navigation.navigate('P2PPayment', {
        scannedQRData: data,
        qrType: currentQRType,
      });
      
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Invalid QR Code',
        mode === 'merchant_scan' ? 'Customer QR code not recognized' : 'This QR code is not valid for Dott Pay',
        [
          {
            text: 'Try Again',
            onPress: () => {
              scannerRef.current?.reactivate();
              setScanning(true);
            },
          },
        ]
      );
    }
  };
  
  const renderQRGuide = () => {
    const isPayment = currentQRType?.includes('PAY');
    
    return (
      <View style={styles.guideContainer}>
        <View style={[styles.currentQRIndicator, { backgroundColor: currentColor }]}>
          <Icon 
            name={isPayment ? 'arrow-up-circle' : 'arrow-down-circle'} 
            size={24} 
            color="white" 
          />
          <Text style={styles.currentQRText}>
            You're showing: {isPayment ? 'PAYMENT (BLUE)' : 'RECEIVE (GREEN)'} QR
          </Text>
        </View>
        
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Scan the other person's QR</Text>
          <Text style={styles.instructionText}>
            {isPayment 
              ? '✅ Look for GREEN (Receive) QR to pay them'
              : '✅ Look for BLUE (Payment) QR to receive from them'}
          </Text>
          <Text style={[styles.warningText, { color: '#ef4444' }]}>
            {isPayment 
              ? '❌ Don\'t scan another BLUE QR!'
              : '❌ Don\'t scan another GREEN QR!'}
          </Text>
        </View>
      </View>
    );
  };
  
  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color="#9ca3af" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Please enable camera access to scan QR codes
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <QRCodeScanner
        ref={scannerRef}
        onRead={onQRCodeRead}
        reactivateTimeout={5000}
        showMarker={false}
        cameraStyle={styles.camera}
        topViewStyle={styles.zeroContainer}
        bottomViewStyle={styles.zeroContainer}
        customMarker={(
          <View style={StyleSheet.absoluteFillObject}>
        {/* Flash overlay for error feedback */}
        <Animated.View 
          style={[
            styles.flashOverlay,
            {
              opacity: flashAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 0],
              }),
            },
          ]}
          pointerEvents="none"
        />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={28} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Icon 
              name={flashOn ? 'flash' : 'flash-off'} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
        
        {/* QR Guide */}
        {renderQRGuide()}
        
        {/* Scan Frame */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.cornerTL, styles.corner]} />
            <View style={[styles.cornerTR, styles.corner]} />
            <View style={[styles.cornerBL, styles.corner]} />
            <View style={[styles.cornerBR, styles.corner]} />
          </View>
          
          <Text style={styles.scanHint}>
            Align QR code within the frame
          </Text>
        </View>
        
        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('DualQRDisplay')}
          >
            <Icon name="qr-code-outline" size={24} color="white" />
            <Text style={styles.actionText}>My QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Coming Soon', 'Manual entry will be available soon')}
          >
            <Icon name="keypad-outline" size={24} color="white" />
            <Text style={styles.actionText}>Enter Code</Text>
          </TouchableOpacity>
        </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    height: '100%',
  },
  zeroContainer: {
    height: 0,
    flex: 0,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  guideContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  currentQRIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  currentQRText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  instructionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#10b981',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: 'white',
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanHint: {
    marginTop: 20,
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: 'white',
  },
});