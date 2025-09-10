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
  ActivityIndicator,
  Image,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import dualQRApi from '../services/dualQRApi';

const { width: screenWidth } = Dimensions.get('window');

export default function DualQRScreen({ navigation }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  
  // Phase 1: Only show Payment QR for consumers
  const [paymentQR, setPaymentQR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Phase 1: Payment QR only
  const QR_COLOR = {
    primary: '#2563eb',
    secondary: '#60a5fa',
    gradient: ['#2563eb', '#3b82f6', '#60a5fa'],
    icon: '💳',
    label: 'PAYMENT QR',
    description: 'Show this BLUE QR to scan and pay businesses',
  };
  
  useEffect(() => {
    loadQRCode();
    startPulseAnimation();
  }, []);
  
  const loadQRCode = async () => {
    try {
      setLoading(true);
      // Generate consumer payment QR
      setPaymentQR({
        data: JSON.stringify({
          type: 'DOTT_PAY_CONSUMER',
          user_id: user.id,
          user_name: user.name || user.email,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Error loading QR code:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  
  const shareQR = async () => {
    try {
      await Share.share({
        message: `Here's my Dott Pay Payment QR (BLUE). I can scan business QR codes to make payments.`,
        title: 'Dott Pay Payment QR',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const renderQRCode = () => {
    if (!paymentQR) return null;
    
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={QR_COLOR.gradient}
          style={styles.qrContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.qrHeader}>
            <Text style={styles.qrIcon}>{QR_COLOR.icon}</Text>
            <Text style={styles.qrLabel}>{QR_COLOR.label}</Text>
          </View>
          
          <View style={[styles.qrWrapper, { borderColor: QR_COLOR.primary }]}>
            <View style={styles.qrHeader}>
              <Image 
                source={require('../assets/icon.png')} 
                style={styles.qrHeaderLogo} 
              />
              <Text style={[styles.qrHeaderText, { color: QR_COLOR.primary }]}>Dott</Text>
            </View>
            <QRCode
              value={paymentQR.data}
              size={250}
              color={QR_COLOR.primary}
              backgroundColor="white"
              logo={require('../assets/icon.png')}
              logoSize={50}
              logoBackgroundColor="#fff"
              logoBorderRadius={25}
            />
            
            <View style={[styles.corner, styles.cornerTL, { borderColor: QR_COLOR.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: QR_COLOR.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: QR_COLOR.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: QR_COLOR.primary }]} />
          </View>
          
          <Text style={styles.qrDescription}>{QR_COLOR.description}</Text>
        </LinearGradient>
      </Animated.View>
    );
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
        <Text style={styles.headerTitle}>Payment QR Code</Text>
        <TouchableOpacity onPress={shareQR}>
          <Icon name="share-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading QR codes...</Text>
          </View>
        ) : (
          <>
            {renderQRCode()}
            
            {/* Safety Tip */}
            <View style={styles.safetyTip}>
              <Icon name="shield-checkmark" size={20} color="#2563eb" />
              <Text style={styles.safetyText}>
                💙 BLUE QR = You can scan business QR codes to pay
              </Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('QRScanner', { 
                  currentQRType: 'DOTT_PAY_CONSUMER' 
                })}
              >
                <Icon name="scan-outline" size={20} color="#2563eb" />
                <Text style={styles.actionText}>Scan Business QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('P2PHistory')}
              >
                <Icon name="time-outline" size={20} color="#2563eb" />
                <Text style={styles.actionText}>History</Text>
              </TouchableOpacity>
            </View>
            
            {/* Color Guide */}
            <View style={styles.colorGuide}>
              <Text style={styles.guideTitle}>How to Pay with QR</Text>
              <View style={styles.guideRow}>
                <Text style={styles.guideStep}>1.</Text>
                <Text style={styles.guideText}>Find business with GREEN QR code</Text>
              </View>
              <View style={styles.guideRow}>
                <Text style={styles.guideStep}>2.</Text>
                <Text style={styles.guideText}>Tap "Scan Business QR" button</Text>
              </View>
              <View style={styles.guideRow}>
                <Text style={styles.guideStep}>3.</Text>
                <Text style={styles.guideText}>Point camera at business QR code</Text>
              </View>
              <View style={styles.guideRow}>
                <Text style={styles.guideStep}>4.</Text>
                <Text style={styles.guideText}>Enter amount and confirm payment</Text>
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
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
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  guideStep: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginRight: 8,
    width: 20,
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
});