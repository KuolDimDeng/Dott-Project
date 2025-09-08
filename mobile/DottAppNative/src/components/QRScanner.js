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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
// For production, use react-native-camera-kit or react-native-vision-camera
// import { CameraScreen } from 'react-native-camera-kit';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function QRScanner({ 
  visible, 
  onClose, 
  onScan, 
  amount,
  currency,
  businessName 
}) {
  const [scanning, setScanning] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleQRRead = async (event) => {
    if (scanning) return; // Prevent multiple scans
    setScanning(true);
    
    try {
      // Decode QR data
      const qrData = event.nativeEvent.codeStringValue || event.data;
      const decodedData = JSON.parse(atob(qrData));
      
      // Validate QR code
      if (decodedData.type !== 'DOTT_PAY') {
        Alert.alert('Invalid QR', 'This is not a valid Dott Pay QR code');
        setScanning(false);
        return;
      }
      
      // Check QR timestamp (optional - for enhanced security)
      const qrAge = Date.now() - decodedData.timestamp;
      if (qrAge > 60000) { // QR older than 60 seconds
        Alert.alert('QR Expired', 'This QR code has expired. Please ask customer to refresh.');
        setScanning(false);
        return;
      }
      
      setCustomerData(decodedData);
      
      // Call the onScan callback with customer data
      if (onScan) {
        await onScan(decodedData);
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert('Scan Error', 'Failed to read QR code. Please try again.');
      setScanning(false);
    }
  };

  // Mock scanner for development
  const MockScanner = () => (
    <View style={styles.mockScanner}>
      <View style={styles.scanArea}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        
        <View style={styles.scanLine} />
        
        <Text style={styles.scanHint}>Position QR code within frame</Text>
      </View>
      
      {/* Mock scan button for testing */}
      <TouchableOpacity
        style={styles.mockScanButton}
        onPress={() => {
          // Simulate successful scan
          const mockData = {
            userId: '123',
            userEmail: 'customer@example.com',
            timestamp: Date.now(),
            type: 'DOTT_PAY',
          };
          handleQRRead({ data: btoa(JSON.stringify(mockData)) });
        }}
      >
        <Text style={styles.mockScanText}>Simulate Scan (Dev Mode)</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentConfirmation = () => (
    <View style={styles.confirmationContainer}>
      <Icon name="checkmark-circle" size={64} color="#10b981" />
      <Text style={styles.confirmationTitle}>Customer Identified</Text>
      <Text style={styles.customerEmail}>{customerData?.userEmail}</Text>
      
      <View style={styles.paymentDetails}>
        <Text style={styles.detailLabel}>Amount to Charge</Text>
        <Text style={styles.amountText}>
          {currency?.symbol || '$'}{amount.toFixed(2)}
        </Text>
        <Text style={styles.businessNameText}>To: {businessName}</Text>
      </View>
      
      <View style={styles.confirmationActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => {
            setCustomerData(null);
            setScanning(false);
            onClose();
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={async () => {
            setProcessing(true);
            try {
              // Process payment
              await onScan(customerData);
            } finally {
              setProcessing(false);
            }
          }}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="checkmark" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Dott Pay QR</Text>
        </View>
        
        {customerData ? (
          renderPaymentConfirmation()
        ) : (
          <>
            {/* In production, replace MockScanner with actual camera */}
            <MockScanner />
            {/* 
            <CameraScreen
              showFrame={true}
              scanBarcode={true}
              laserColor={'#2563eb'}
              frameColor={'#2563eb'}
              colorForScannerFrame={'#2563eb'}
              onReadCode={handleQRRead}
              style={styles.camera}
            />
            */}
            
            <View style={styles.instructions}>
              <Text style={styles.instructionTitle}>How to scan:</Text>
              <View style={styles.instructionItem}>
                <Icon name="camera-outline" size={20} color="#6b7280" />
                <Text style={styles.instructionText}>
                  Ask customer to open their Dott app
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="qr-code-outline" size={20} color="#6b7280" />
                <Text style={styles.instructionText}>
                  Have them show their payment QR code
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Icon name="scan-outline" size={20} color="#6b7280" />
                <Text style={styles.instructionText}>
                  Position the QR code in the frame
                </Text>
              </View>
            </View>
            
            <View style={styles.footer}>
              <View style={styles.securityBadge}>
                <Icon name="shield-checkmark" size={16} color="#10b981" />
                <Text style={styles.securityText}>Secure Payment</Text>
              </View>
              <Text style={styles.amountPreview}>
                Amount: {currency?.symbol || '$'}{amount.toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    color: '#fff',
    marginLeft: 16,
  },
  camera: {
    flex: 1,
  },
  mockScanner: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563eb',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2563eb',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563eb',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2563eb',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#2563eb',
    position: 'absolute',
    opacity: 0.8,
  },
  scanHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  mockScanButton: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  mockScanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  securityText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  amountPreview: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 80,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  customerEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  paymentDetails: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  businessNameText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});