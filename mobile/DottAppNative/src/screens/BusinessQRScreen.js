import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBusinessContext } from '../context/BusinessContext';

const { width: screenWidth } = Dimensions.get('window');

export default function BusinessQRScreen({ navigation }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { businessData } = useBusinessContext();
  
  const [receiveQR, setReceiveQR] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const businessName = businessData?.businessName || user?.business_name || 'Business';
  
  useEffect(() => {
    generateReceiveQR();
  }, []);
  
  const generateReceiveQR = () => {
    // Generate business receive QR data
    const userId = String(user?.id || '00000000');
    const qrData = {
      type: 'DOTT_RECEIVE_BUSINESS',
      business_id: user?.id,
      business_name: businessName,
      merchant_id: `BIZ${userId.slice(0, 8)}`,
      timestamp: Date.now(),
    };
    
    setReceiveQR({
      data: JSON.stringify(qrData),
      merchant_id: qrData.merchant_id,
    });
    
    setLoading(false);
  };
  
  const shareQR = async () => {
    try {
      await Share.share({
        message: `Scan my GREEN QR to pay ${businessName}. Merchant ID: ${receiveQR?.merchant_id}`,
        title: `${businessName} Payment QR`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleGenerateDynamicQR = () => {
    Alert.alert('Coming Soon', 'Dynamic QR with amount will be available in Phase 2');
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business QR Code</Text>
        <TouchableOpacity onPress={shareQR}>
          <Icon name="share-outline" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Generating QR code...</Text>
          </View>
        ) : (
          <>
            {/* QR Code Display */}
            <LinearGradient
              colors={['#10b981', '#34d399', '#6ee7b7']}
              style={styles.qrContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header */}
              <View style={styles.qrHeader}>
                <Text style={styles.qrIcon}>💰</Text>
                <Text style={styles.qrLabel}>SCAN TO PAY</Text>
                <Text style={styles.businessNameLabel}>{businessName}</Text>
              </View>
              
              {/* QR Code */}
              <View style={[styles.qrWrapper, { borderColor: '#10b981' }]}>
                <View style={styles.qrHeader}>
                  <Image 
                    source={require('../assets/icon.png')} 
                    style={styles.qrHeaderLogo} 
                  />
                  <Text style={[styles.qrHeaderText, { color: '#10b981' }]}>Dott</Text>
                </View>
                <QRCode
                  value={receiveQR?.data || ''}
                  size={250}
                  color="#fff"
                  backgroundColor="#10b981"
                  logo={require('../assets/icon.png')}
                  logoSize={50}
                  logoBackgroundColor="#fff"
                  logoBorderRadius={25}
                />
                
                {/* Animated corners */}
                <View style={[styles.corner, styles.cornerTL, { borderColor: '#10b981' }]} />
                <View style={[styles.corner, styles.cornerTR, { borderColor: '#10b981' }]} />
                <View style={[styles.corner, styles.cornerBL, { borderColor: '#10b981' }]} />
                <View style={[styles.corner, styles.cornerBR, { borderColor: '#10b981' }]} />
              </View>
              
              {/* Description */}
              <Text style={styles.qrDescription}>
                Customers scan this GREEN QR to pay you
              </Text>
              
              {/* Merchant ID */}
              <View style={styles.merchantInfo}>
                <Text style={styles.merchantId}>ID: {receiveQR?.merchant_id}</Text>
              </View>
            </LinearGradient>
            
            {/* Instructions */}
            <View style={styles.instructionCard}>
              <Icon name="information-circle" size={20} color="#10b981" />
              <Text style={styles.instructionTitle}>How it works</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionStep}>1.</Text>
                <Text style={styles.instructionText}>
                  Display this QR code at your checkout or payment counter
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionStep}>2.</Text>
                <Text style={styles.instructionText}>
                  Customer opens their Dott app and scans your GREEN QR
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionStep}>3.</Text>
                <Text style={styles.instructionText}>
                  Customer enters amount and confirms payment
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionStep}>4.</Text>
                <Text style={styles.instructionText}>
                  You receive instant payment notification
                </Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleGenerateDynamicQR}
              >
                <Icon name="qr-code-outline" size={20} color="#10b981" />
                <Text style={styles.actionText}>Dynamic QR</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>SOON</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Transactions')}
              >
                <Icon name="list-outline" size={20} color="#10b981" />
                <Text style={styles.actionText}>Transactions</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={shareQR}
              >
                <Icon name="share-outline" size={20} color="#10b981" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
            
            {/* Safety Notice */}
            <View style={styles.safetyNotice}>
              <Icon name="shield-checkmark" size={20} color="#10b981" />
              <Text style={styles.safetyText}>
                GREEN QR = You Receive Money | Secure & Instant
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  qrContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: screenWidth - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  qrLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
    marginBottom: 4,
  },
  businessNameLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderWidth: 4,
    position: 'relative',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  qrHeaderLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  qrHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  qrDescription: {
    marginTop: 16,
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  merchantInfo: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  merchantId: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  instructionCard: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginTop: 8,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  instructionStep: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginRight: 8,
    width: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  actionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  comingSoonText: {
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  safetyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#065f46',
    fontWeight: '500',
  },
});