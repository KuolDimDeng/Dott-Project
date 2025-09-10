import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCountry } from '../../context/CountryContext';

const PaymentMethodSelector = ({ 
  visible, 
  onClose, 
  onSelectPayment, 
  selectedPaymentId 
}) => {
  const { payments, config, formatPrice } = useCountry();
  const [tempSelected, setTempSelected] = useState(selectedPaymentId);

  const handleConfirm = () => {
    if (tempSelected) {
      const selectedPayment = payments.find(p => p.id === tempSelected);
      onSelectPayment(selectedPayment);
      onClose();
    }
  };

  const renderPaymentMethod = (payment) => {
    const isSelected = tempSelected === payment.id;
    
    return (
      <TouchableOpacity
        key={payment.id}
        style={[
          styles.paymentMethod,
          isSelected && styles.selectedPayment
        ]}
        onPress={() => setTempSelected(payment.id)}
      >
        <View style={styles.paymentLeft}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: payment.color + '20' }
          ]}>
            <Icon 
              name={payment.icon} 
              size={24} 
              color={payment.color} 
            />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentName}>{payment.name}</Text>
            <Text style={styles.paymentType}>
              {payment.type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.paymentRight}>
          {isSelected && (
            <Icon name="checkmark-circle" size={24} color="#10b981" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Select Payment Method</Text>
            <Text style={styles.headerSubtitle}>
              Available in {config.name}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleConfirm}
            style={[
              styles.confirmButton,
              !tempSelected && styles.confirmButtonDisabled
            ]}
            disabled={!tempSelected}
          >
            <Text style={[
              styles.confirmButtonText,
              !tempSelected && styles.confirmButtonTextDisabled
            ]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Payment Methods ({payments.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Methods are listed by popularity in {config.name}
            </Text>
          </View>

          <View style={styles.paymentMethods}>
            {payments.map(renderPaymentMethod)}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Icon name="information-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Payment methods are customized for your location. 
                Some methods may have different fees or processing times.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#9ca3af',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentMethods: {
    marginBottom: 24,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPayment: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  paymentType: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  paymentRight: {
    marginLeft: 12,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});

export default PaymentMethodSelector;