import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import inventoryApi from '../../services/inventoryApi';

export default function BarcodeScannerScreen({ navigation, route }) {
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const { onScanSuccess, source = 'inventory' } = route.params || {};

  const handleBarCodeRead = async ({ data, type }) => {
    if (!scanning) return;

    setScanning(false);
    setLoading(true);

    try {
      // Search for product by barcode
      const response = await inventoryApi.scanBarcode(data);

      if (response && response.product) {
        // Product found in catalog
        if (onScanSuccess) {
          onScanSuccess(response.product);
          navigation.goBack();
        } else {
          Alert.alert(
            'Product Found',
            `${response.product.name}\nBarcode: ${data}`,
            [
              {
                text: 'Add to Inventory',
                onPress: () => {
                  navigation.goBack();
                  navigation.navigate('StoreCatalog', {
                    scannedProduct: response.product,
                    barcode: data
                  });
                }
              },
              {
                text: 'Scan Another',
                onPress: () => {
                  setScanning(true);
                  setLoading(false);
                },
                style: 'cancel'
              }
            ]
          );
        }
      } else {
        // Product not found - offer to add it
        Alert.alert(
          'Product Not Found',
          `No product found with barcode: ${data}\n\nWould you like to add this product to your inventory?`,
          [
            {
              text: 'Add to My Inventory',
              onPress: () => {
                // Navigate to inventory screen with barcode pre-filled
                navigation.navigate('Inventory', {
                  newProductBarcode: data,
                  openAddModal: true
                });
              }
            },
            {
              text: 'Scan Again',
              onPress: () => {
                setScanning(true);
                setLoading(false);
              }
            },
            {
              text: 'Cancel',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      Alert.alert(
        'Scan Error',
        'Failed to process barcode. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setScanning(true);
              setLoading(false);
            }
          },
          {
            text: 'Cancel',
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
        <TouchableOpacity
          onPress={() => setTorchOn(!torchOn)}
          style={styles.torchButton}
        >
          <Icon
            name={torchOn ? "flashlight" : "flashlight-outline"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        flashMode={torchOn ? RNCamera.Constants.FlashMode.torch : RNCamera.Constants.FlashMode.off}
        onBarCodeRead={handleBarCodeRead}
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera to scan barcodes',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />

          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />

            <View style={styles.scanArea}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>Processing...</Text>
                </View>
              )}
            </View>

            <View style={styles.sideOverlay} />
          </View>

          <View style={styles.bottomOverlay}>
            <Text style={styles.instructionText}>
              Position the barcode within the frame
            </Text>
            <Text style={styles.subInstructionText}>
              Scanning will happen automatically
            </Text>
          </View>
        </View>
      </RNCamera>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
  },
  torchButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
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
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  subInstructionText: {
    color: '#ccc',
    fontSize: 14,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
});