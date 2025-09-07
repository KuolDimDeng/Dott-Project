import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const TransportScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [transportStats, setTransportStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('deliveries');

  useEffect(() => {
    loadTransportData();
  }, []);

  const loadTransportData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, deliveriesRes, driversRes, routesRes, statsRes] = await Promise.all([
        api.get('/transport/vehicles/').catch(() => ({ data: [] })),
        api.get('/transport/deliveries/').catch(() => ({ data: [] })),
        api.get('/transport/drivers/').catch(() => ({ data: [] })),
        api.get('/transport/routes/').catch(() => ({ data: [] })),
        api.get('/transport/stats/').catch(() => ({ data: null })),
      ]);

      setVehicles(vehiclesRes.data.results || vehiclesRes.data || getMockVehicles());
      setDeliveries(deliveriesRes.data.results || deliveriesRes.data || getMockDeliveries());
      setDrivers(driversRes.data.results || driversRes.data || getMockDrivers());
      setRoutes(routesRes.data.results || routesRes.data || getMockRoutes());
      setTransportStats(statsRes.data || getMockStats());
    } catch (error) {
      console.error('Error loading transport data:', error);
      setVehicles(getMockVehicles());
      setDeliveries(getMockDeliveries());
      setDrivers(getMockDrivers());
      setRoutes(getMockRoutes());
      setTransportStats(getMockStats());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockVehicles = () => [
    {
      id: 1,
      make: 'Toyota',
      model: 'Hiace',
      year: 2020,
      license_plate: 'KAA 123X',
      status: 'available',
      driver: 'John Smith',
      fuel_level: 75,
      next_service: '2024-03-15',
      capacity: '15 passengers',
    },
    {
      id: 2,
      make: 'Isuzu',
      model: 'NQR',
      year: 2019,
      license_plate: 'KBB 456Y',
      status: 'in_transit',
      driver: 'Sarah Johnson',
      fuel_level: 45,
      next_service: '2024-03-20',
      capacity: '3 tons',
    },
    {
      id: 3,
      make: 'Mercedes',
      model: 'Sprinter',
      year: 2021,
      license_plate: 'KCC 789Z',
      status: 'maintenance',
      driver: null,
      fuel_level: 100,
      next_service: 'In Progress',
      capacity: '2 tons',
    },
  ];

  const getMockDeliveries = () => [
    {
      id: 1,
      order_number: 'DEL-001',
      customer: 'ABC Company',
      pickup_location: 'Warehouse A',
      delivery_location: '123 Main St, Juba',
      status: 'in_transit',
      driver: 'John Smith',
      vehicle: 'KAA 123X',
      eta: '2:30 PM',
      distance: '15 km',
      priority: 'high',
    },
    {
      id: 2,
      order_number: 'DEL-002',
      customer: 'XYZ Store',
      pickup_location: 'Warehouse B',
      delivery_location: '456 Market Ave',
      status: 'pending',
      driver: null,
      vehicle: null,
      scheduled_time: '3:00 PM',
      distance: '8 km',
      priority: 'medium',
    },
    {
      id: 3,
      order_number: 'DEL-003',
      customer: 'John Doe',
      pickup_location: 'Store Location',
      delivery_location: '789 Park Rd',
      status: 'delivered',
      driver: 'Sarah Johnson',
      vehicle: 'KBB 456Y',
      delivered_time: '1:45 PM',
      distance: '12 km',
      priority: 'low',
    },
  ];

  const getMockDrivers = () => [
    {
      id: 1,
      name: 'John Smith',
      license_number: 'DL123456',
      phone: '+211 123 456 789',
      status: 'on_duty',
      current_vehicle: 'KAA 123X',
      trips_today: 5,
      rating: 4.8,
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      license_number: 'DL789012',
      phone: '+211 987 654 321',
      status: 'on_duty',
      current_vehicle: 'KBB 456Y',
      trips_today: 3,
      rating: 4.9,
    },
    {
      id: 3,
      name: 'Mike Williams',
      license_number: 'DL345678',
      phone: '+211 555 123 456',
      status: 'off_duty',
      current_vehicle: null,
      trips_today: 0,
      rating: 4.7,
    },
  ];

  const getMockRoutes = () => [
    {
      id: 1,
      name: 'City Center Route',
      stops: 8,
      distance: '25 km',
      estimated_time: '1.5 hours',
      status: 'active',
    },
    {
      id: 2,
      name: 'Airport Express',
      stops: 3,
      distance: '35 km',
      estimated_time: '45 mins',
      status: 'active',
    },
    {
      id: 3,
      name: 'Industrial Zone',
      stops: 12,
      distance: '40 km',
      estimated_time: '2 hours',
      status: 'planned',
    },
  ];

  const getMockStats = () => ({
    total_deliveries_today: 24,
    pending_deliveries: 8,
    in_transit: 5,
    completed: 11,
    on_time_rate: 87,
    average_delivery_time: '42 mins',
    total_distance: '345 km',
    fuel_cost: 850,
  });

  const handleAssignDriver = (delivery) => {
    const availableDrivers = drivers.filter(d => d.status === 'on_duty');
    if (availableDrivers.length === 0) {
      Alert.alert('No Drivers Available', 'All drivers are currently busy or off duty.');
      return;
    }

    Alert.alert(
      'Assign Driver',
      'Select a driver for this delivery:',
      availableDrivers.map(driver => ({
        text: `${driver.name} (${driver.trips_today} trips)`,
        onPress: () => {
          console.log(`Assigned ${driver.name} to delivery ${delivery.order_number}`);
          loadTransportData();
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleTrackDelivery = (delivery) => {
    navigation.navigate('DeliveryTracking', { delivery });
  };

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle');
  };

  const handleVehicleMaintenance = (vehicle) => {
    Alert.alert(
      'Schedule Maintenance',
      `Schedule maintenance for ${vehicle.make} ${vehicle.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule',
          onPress: async () => {
            try {
              await api.post(`/transport/vehicles/${vehicle.id}/maintenance/`);
              Alert.alert('Success', 'Maintenance scheduled successfully');
              loadTransportData();
            } catch (error) {
              Alert.alert('Error', 'Failed to schedule maintenance');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
      case 'available':
      case 'on_duty':
      case 'active':
        return '#22c55e';
      case 'in_transit':
      case 'planned':
        return '#2563eb';
      case 'pending':
      case 'off_duty':
        return '#f59e0b';
      case 'cancelled':
      case 'maintenance':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#22c55e';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading transport data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transport</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TransportSettings')}>
          <Icon name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {transportStats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="cube-outline" size={20} color="#2563eb" />
            <Text style={styles.statValue}>{transportStats.total_deliveries_today}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="time-outline" size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{transportStats.pending_deliveries}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="car-outline" size={20} color="#22c55e" />
            <Text style={styles.statValue}>{transportStats.in_transit}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="checkmark-circle-outline" size={20} color="#22c55e" />
            <Text style={styles.statValue}>{transportStats.on_time_rate}%</Text>
            <Text style={styles.statLabel}>On Time</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="speedometer-outline" size={20} color="#8b5cf6" />
            <Text style={styles.statValue}>{transportStats.total_distance}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </ScrollView>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deliveries' && styles.activeTab]}
          onPress={() => setActiveTab('deliveries')}
        >
          <Text style={[styles.tabText, activeTab === 'deliveries' && styles.activeTabText]}>
            Deliveries
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vehicles' && styles.activeTab]}
          onPress={() => setActiveTab('vehicles')}
        >
          <Text style={[styles.tabText, activeTab === 'vehicles' && styles.activeTabText]}>
            Vehicles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drivers' && styles.activeTab]}
          onPress={() => setActiveTab('drivers')}
        >
          <Text style={[styles.tabText, activeTab === 'drivers' && styles.activeTabText]}>
            Drivers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.activeTab]}
          onPress={() => setActiveTab('routes')}
        >
          <Text style={[styles.tabText, activeTab === 'routes' && styles.activeTabText]}>
            Routes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTransportData} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'deliveries' && (
          <View style={styles.deliveriesContainer}>
            {deliveries.map(delivery => (
              <TouchableOpacity
                key={delivery.id}
                style={styles.deliveryCard}
                onPress={() => handleTrackDelivery(delivery)}
              >
                <View style={styles.deliveryHeader}>
                  <View>
                    <Text style={styles.orderNumber}>{delivery.order_number}</Text>
                    <Text style={styles.customerName}>{delivery.customer}</Text>
                  </View>
                  <View style={styles.deliveryBadges}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(delivery.priority) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(delivery.priority) }]}>
                        {delivery.priority?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                        {delivery.status?.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.locationContainer}>
                  <View style={styles.locationRow}>
                    <Icon name="location" size={16} color="#22c55e" />
                    <Text style={styles.locationText}>{delivery.pickup_location}</Text>
                  </View>
                  <Icon name="arrow-down" size={16} color="#999" style={styles.arrowIcon} />
                  <View style={styles.locationRow}>
                    <Icon name="location" size={16} color="#ef4444" />
                    <Text style={styles.locationText}>{delivery.delivery_location}</Text>
                  </View>
                </View>
                <View style={styles.deliveryFooter}>
                  {delivery.driver ? (
                    <Text style={styles.driverInfo}>
                      <Icon name="person" size={14} /> {delivery.driver} • {delivery.vehicle}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => handleAssignDriver(delivery)}
                    >
                      <Text style={styles.assignButtonText}>Assign Driver</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.distanceText}>{delivery.distance}</Text>
                </View>
                {delivery.eta && (
                  <Text style={styles.etaText}>ETA: {delivery.eta}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'vehicles' && (
          <View style={styles.vehiclesContainer}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
              <Icon name="add-circle-outline" size={24} color="white" />
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
            {vehicles.map(vehicle => (
              <View key={vehicle.id} style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <View>
                    <Text style={styles.vehicleName}>
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </Text>
                    <Text style={styles.licensePlate}>{vehicle.license_plate}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(vehicle.status) }]}>
                      {vehicle.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.vehicleDetails}>
                  <View style={styles.detailItem}>
                    <Icon name="speedometer-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>Fuel: {vehicle.fuel_level}%</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Icon name="cube-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{vehicle.capacity}</Text>
                  </View>
                  {vehicle.driver && (
                    <View style={styles.detailItem}>
                      <Icon name="person-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{vehicle.driver}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.vehicleFooter}>
                  <Text style={styles.serviceText}>Next Service: {vehicle.next_service}</Text>
                  {vehicle.status === 'available' && (
                    <TouchableOpacity
                      style={styles.maintenanceButton}
                      onPress={() => handleVehicleMaintenance(vehicle)}
                    >
                      <Text style={styles.maintenanceButtonText}>Schedule Service</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'drivers' && (
          <View style={styles.driversContainer}>
            {drivers.map(driver => (
              <TouchableOpacity key={driver.id} style={styles.driverCard}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.avatarText}>
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverLicense}>License: {driver.license_number}</Text>
                  <Text style={styles.driverPhone}>{driver.phone}</Text>
                </View>
                <View style={styles.driverStats}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(driver.status) }]}>
                      {driver.status?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.tripsText}>{driver.trips_today} trips</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={14} color="#f59e0b" />
                    <Text style={styles.ratingText}>{driver.rating}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'routes' && (
          <View style={styles.routesContainer}>
            {routes.map(route => (
              <TouchableOpacity key={route.id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(route.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(route.status) }]}>
                      {route.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeDetails}>
                  <View style={styles.routeItem}>
                    <Icon name="flag-outline" size={16} color="#666" />
                    <Text style={styles.routeText}>{route.stops} stops</Text>
                  </View>
                  <View style={styles.routeItem}>
                    <Icon name="navigate-outline" size={16} color="#666" />
                    <Text style={styles.routeText}>{route.distance}</Text>
                  </View>
                  <View style={styles.routeItem}>
                    <Icon name="time-outline" size={16} color="#666" />
                    <Text style={styles.routeText}>{route.estimated_time}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.viewRouteButton}>
                  <Text style={styles.viewRouteButtonText}>View Route Map</Text>
                  <Icon name="chevron-forward" size={16} color="#2563eb" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  statCard: {
    marginHorizontal: 10,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563eb',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  deliveriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  deliveryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deliveryBadges: {
    flexDirection: 'row',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  arrowIcon: {
    marginLeft: 8,
    marginVertical: 2,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    fontSize: 13,
    color: '#666',
  },
  assignButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 13,
    color: '#999',
  },
  etaText: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 8,
    fontWeight: '600',
  },
  vehiclesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  licensePlate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  vehicleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  serviceText: {
    fontSize: 13,
    color: '#999',
  },
  maintenanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f59e0b20',
    borderRadius: 6,
  },
  maintenanceButtonText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  driversContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  driverCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  driverLicense: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  driverPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  driverStats: {
    alignItems: 'flex-end',
  },
  tripsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 3,
  },
  routesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  viewRouteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewRouteButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default TransportScreen;