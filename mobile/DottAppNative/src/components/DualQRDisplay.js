import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import dualQRApi from '../services/dualQRApi';

const { width: screenWidth } = Dimensions.get('window');

export default function DualQRDisplay({ navigation }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  
  const [activeTab, setActiveTab] = useState('payment'); // 'payment' or 'receive'
  const [paymentQR, setPaymentQR] = useState(null);
  const [receiveQR, setReceiveQR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animatedValue] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // QR Color Schemes
  const QR_COLORS = {
    payment: {
      primary: '#2563eb',  // Blue
      secondary: '#60a5fa',
      gradient: ['#2563eb', '#3b82f6', '#60a5fa'],
      icon: '💳',
      label: 'SCAN TO PAY',
      description: 'Show this BLUE QR when you want to pay',
      animation: 'pulse-out',
    },
    receive: {
      primary: '#10b981',  // Green
      secondary: '#6ee7b7',
      gradient: ['#10b981', '#34d399', '#6ee7b7'],
      icon: '💰',
      label: 'SCAN TO PAY ME',
      description: 'Show this GREEN QR to receive payments',
      animation: 'pulse-in',
    },
  };
  
  useEffect(() => {
    loadQRCodes();
    startPulseAnimation();
  }, []);
  
  const loadQRCodes = async () => {
    try {
      setLoading(true);
      const qrData = await dualQRApi.getMyQRCodes();
      setPaymentQR(qrData.payment_qr);
      setReceiveQR(qrData.receive_qr);
    } catch (error) {
      console.error('Error loading QR codes:', error);
      Alert.alert('Error', 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  };
  
  const startPulseAnimation = () => {
    // Different pulse patterns for payment vs receive
    const pulsePattern = activeTab === 'payment' 
      ? { toValue: 1.05, duration: 1000 }  // Outward pulse for payment
      : { toValue: 0.95, duration: 800 };  // Inward pulse for receive
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          ...pulsePattern,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulsePattern.duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  const switchTab = (tab) => {
    setActiveTab(tab);
    
    // Tab switch animation
    Animated.spring(animatedValue, {
      toValue: tab === 'payment' ? 0 : 1,
      useNativeDriver: true,
      tension: 20,
      friction: 7,
    }).start();
    
    // Restart pulse animation for new tab
    startPulseAnimation();
  };
  
  const shareQR = async () => {
    const qrType = activeTab === 'payment' ? 'Payment' : 'Receive';
    const color = activeTab === 'payment' ? 'BLUE' : 'GREEN';
    
    try {
      await Share.share({
        message: `Here's my Dott Pay ${qrType} QR (${color}). ${
          activeTab === 'payment' 
            ? 'Scan this to pay me' 
            : 'I scan this to pay others'
        }`,
        title: `Dott Pay ${qrType} QR`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const renderQRCode = () => {
    const isPayment = activeTab === 'payment';
    const qrData = isPayment ? paymentQR : receiveQR;
    const colorScheme = QR_COLORS[activeTab];
    
    if (!qrData) return null;
    
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={colorScheme.gradient}
          style={styles.qrContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header */}
          <View style={styles.qrHeader}>
            <Text style={styles.qrIcon}>{colorScheme.icon}</Text>
            <Text style={styles.qrLabel}>{colorScheme.label}</Text>
          </View>
          
          {/* QR Code with colored border */}
          <View style={[styles.qrWrapper, { borderColor: colorScheme.primary }]}>
            <QRCode
              value={qrData.data}
              size={200}
              color={colorScheme.primary}
              backgroundColor="white"
              logo={isPayment ? null : require('../assets/logo.png')}
              logoSize={isPayment ? 0 : 50}
              logoBorderRadius={25}
              logoBackgroundColor="white"
            />
            
            {/* Animated corners */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: colorScheme.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: colorScheme.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: colorScheme.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: colorScheme.primary }]} />
          </View>
          
          {/* Description */}
          <Text style={styles.qrDescription}>{colorScheme.description}</Text>
          
          {/* Merchant ID for receive QR */}
          {!isPayment && receiveQR?.merchant_id && (
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantId}>ID: {receiveQR.merchant_id}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };
  
  const renderSafetyTip = () => (
    <View style={styles.safetyTip}>
      <Icon name="shield-checkmark" size={20} color="#10b981" />
      <Text style={styles.safetyText}>
        Remember: {activeTab === 'payment' ? '💙 Blue = Money Out' : '💚 Green = Money In'}
      </Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'payment' && styles.activeTab,
            { backgroundColor: activeTab === 'payment' ? '#2563eb' : '#f3f4f6' }
          ]}
          onPress={() => switchTab('payment')}
        >
          <Icon 
            name="arrow-up-circle" 
            size={24} 
            color={activeTab === 'payment' ? 'white' : '#666'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'payment' && styles.activeTabText
          ]}>
            PAY (BLUE)
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'receive' && styles.activeTab,
            { backgroundColor: activeTab === 'receive' ? '#10b981' : '#f3f4f6' }
          ]}
          onPress={() => switchTab('receive')}
        >
          <Icon 
            name="arrow-down-circle" 
            size={24} 
            color={activeTab === 'receive' ? 'white' : '#666'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'receive' && styles.activeTabText
          ]}>
            RECEIVE (GREEN)
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* QR Display */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading QR codes...</Text>
          </View>
        ) : (
          <>
            {renderQRCode()}
            {renderSafetyTip()}
            
            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={shareQR}>
                <Icon name="share-outline" size={20} color="#2563eb" />
                <Text style={styles.actionText}>Share QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('QRScanner', { 
                  currentQRType: activeTab === 'payment' ? 'DOTT_PAY' : 'DOTT_RECEIVE_STATIC' 
                })}
              >
                <Icon name="scan-outline" size={20} color="#2563eb" />
                <Text style={styles.actionText}>Scan QR</Text>
              </TouchableOpacity>
              
              {activeTab === 'receive' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('GenerateDynamicQR')}
                >
                  <Icon name="qr-code-outline" size={20} color="#2563eb" />
                  <Text style={styles.actionText}>Dynamic QR</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Color Guide */}
            <View style={styles.colorGuide}>
              <Text style={styles.guideTitle}>QR Color Guide</Text>
              <View style={styles.guideRow}>
                <View style={[styles.colorBox, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.guideText}>BLUE = You Pay (Money Out)</Text>
              </View>
              <View style={styles.guideRow}>
                <View style={[styles.colorBox, { backgroundColor: '#10b981' }]} />
                <Text style={styles.guideText}>GREEN = You Receive (Money In)</Text>
              </View>
              <View style={styles.guideRow}>
                <Icon name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.warningText}>Never scan same colors!</Text>
              </View>
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
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
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderWidth: 4,
    position: 'relative',
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
  safetyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
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
  actions: {
    flexDirection: 'row',
    marginTop: 24,
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
  },
  actionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  colorGuide: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  colorBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 12,
  },
  guideText: {
    fontSize: 14,
    color: '#666',
  },
  warningText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});