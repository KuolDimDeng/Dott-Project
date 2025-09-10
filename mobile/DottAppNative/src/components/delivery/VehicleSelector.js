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

const VehicleSelector = ({ 
  visible, 
  onClose, 
  onSelectVehicle, 
  selectedVehicleId 
}) => {
  const { vehicles, config } = useCountry();
  const [tempSelected, setTempSelected] = useState(selectedVehicleId);

  const handleConfirm = () => {
    if (tempSelected) {
      const selectedVehicle = vehicles.find(v => v.id === tempSelected);
      onSelectVehicle(selectedVehicle);
      onClose();
    }
  };

  const getDeliveryTimeEstimate = (vehicle) => {
    switch (vehicle.speed) {
      case 'fast': return '15-30 min';
      case 'medium': return '30-45 min';
      case 'slow': return '45-60 min';
      default: return '30-45 min';
    }
  };

  const getCapacityText = (capacity) => {
    switch (capacity) {
      case 'small': return 'Small items';
      case 'medium': return 'Medium packages';
      case 'large': return 'Large orders';
      default: return 'Standard';
    }
  };

  const renderVehicleType = (vehicle) => {
    const isSelected = tempSelected === vehicle.id;
    
    return (
      <TouchableOpacity
        key={vehicle.id}
        style={[
          styles.vehicleOption,
          isSelected && styles.selectedVehicle
        ]}
        onPress={() => setTempSelected(vehicle.id)}
      >
        <View style={styles.vehicleLeft}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: vehicle.color + '20' }
          ]}>
            <Icon 
              name={vehicle.icon} 
              size={28} 
              color={vehicle.color} 
            />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            <Text style={styles.vehicleCapacity}>
              {getCapacityText(vehicle.capacity)}
            </Text>
            <Text style={styles.deliveryTime}>
              Est. delivery: {getDeliveryTimeEstimate(vehicle)}
            </Text>
          </View>
        </View>
        
        <View style={styles.vehicleRight}>
          {isSelected && (
            <Icon name="checkmark-circle" size={24} color="#10b981" />
          )}
          <View style={[
            styles.speedIndicator,
            { 
              backgroundColor: vehicle.speed === 'fast' ? '#10b981' : 
                               vehicle.speed === 'medium' ? '#f59e0b' : '#ef4444'
            }
          ]}>
            <Text style={styles.speedText}>
              {vehicle.speed.charAt(0).toUpperCase()}
            </Text>
          </View>
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
            <Text style={styles.headerTitle}>Select Delivery Method</Text>
            <Text style={styles.headerSubtitle}>
              Available couriers in {config.name}
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
              Courier Delivery ({vehicles.length} options)
            </Text>
            <Text style={styles.sectionSubtitle}>
              Choose your preferred delivery vehicle type
            </Text>
          </View>

          <View style={styles.vehicleOptions}>
            {vehicles.map(renderVehicleType)}
          </View>

          <View style={styles.legendSection}>
            <Text style={styles.legendTitle}>Speed Indicators</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Fast (F) - Quick delivery</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>Medium (M) - Standard delivery</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Slow (S) - Economy delivery</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Icon name="information-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Delivery options are customized for {config.name}. 
                Times may vary based on traffic and weather conditions.
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
  vehicleOptions: {
    marginBottom: 24,
  },
  vehicleOption: {
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
  selectedVehicle: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  vehicleCapacity: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  vehicleRight: {
    alignItems: 'center',
    marginLeft: 12,
  },
  speedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  speedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  legendSection: {
    marginBottom: 24,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#6b7280',
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

export default VehicleSelector;