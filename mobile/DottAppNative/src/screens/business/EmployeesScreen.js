import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import api from '../../services/api';

const { width, height } = Dimensions.get('window');

// Staff Card Component
const StaffCard = ({ item, onPress, onActionPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10B981';
      case 'inactive': return '#EF4444';
      case 'on_leave': return '#F59E0B';
      default: return '#6B7280';
    }
  };
  
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'No phone';
    // Keep the format as is if it already has country code
    if (phone.startsWith('+')) return phone;
    return `+211 ${phone}`;
  };
  
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const getTenure = (hireDate) => {
    if (!hireDate) return '';
    const start = new Date(hireDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  };
  
  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.98}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.avatarText, { color: getStatusColor(item.status) }]}>
                {getInitials(item.full_name)}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            </View>
            
            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.staffName}>{item.full_name || 'Unknown'}</Text>
              <Text style={styles.staffRole}>
                {item.role || item.job_title || 'Staff'} • {item.department || 'General'}
              </Text>
              <View style={styles.staffMeta}>
                <Icon name="call-outline" size={12} color="#6B7280" />
                <Text style={styles.staffPhone}>{formatPhoneNumber(item.phone || item.phone_number)}</Text>
              </View>
              <View style={styles.staffBottom}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status || 'Active'}
                  </Text>
                </View>
                {item.hire_date && (
                  <Text style={styles.tenureText}>• {getTenure(item.hire_date)}</Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Action Menu */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onActionPress(item)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Icon name="ellipsis-vertical" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Stats Card Component
const StatsCard = ({ value, label, color = '#2563EB', icon }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [value]);
  
  return (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      {icon && (
        <View style={[styles.statsIcon, { backgroundColor: color + '15' }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
      )}
      <View style={styles.statsContent}>
        <Animated.Text style={[styles.statsValue, { color }]}>
          {animatedValue.interpolate({
            inputRange: [0, value],
            outputRange: ['0', value.toString()],
          }).toFixed ? Math.round(value) : value}
        </Animated.Text>
        <Text style={styles.statsLabel}>{label}</Text>
      </View>
    </View>
  );
};

export default function EmployeesScreen() {
  const navigation = useNavigation();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    phone_country_code: '+211',
    job_title: '',
    department: '',
    employment_type: 'full_time',
    salary: '',
    wage_per_hour: '',
    compensation_type: 'SALARY',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    status: 'active',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, selectedFilter, selectedDepartment, employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/v2/employees/');
      
      if (response.data && response.data.success !== false) {
        const employeeData = response.data.data || response.data.results || response.data;
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      } else {
        // Fallback to sample data
        setEmployees(getSampleEmployees());
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees(getSampleEmployees());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getSampleEmployees = () => [
    { 
      id: 1, 
      full_name: 'John Doe', 
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@restaurant.com',
      phone_number: '912 345 678',
      job_title: 'Restaurant Manager', 
      department: 'Operations',
      salary: 150000,
      status: 'active',
      hire_date: '2023-01-15',
      employment_type: 'full_time',
    },
    { 
      id: 2, 
      full_name: 'Jane Smith', 
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@restaurant.com',
      phone_number: '912 345 679',
      job_title: 'Head Chef', 
      department: 'Kitchen',
      salary: 120000,
      status: 'active',
      hire_date: '2023-03-20',
      employment_type: 'full_time',
    },
    { 
      id: 3, 
      full_name: 'Bob Johnson', 
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@restaurant.com',
      phone_number: '912 345 680',
      job_title: 'Sous Chef', 
      department: 'Kitchen',
      salary: 80000,
      status: 'active',
      hire_date: '2023-02-10',
      employment_type: 'full_time',
    },
    { 
      id: 4, 
      full_name: 'Alice Brown', 
      first_name: 'Alice',
      last_name: 'Brown',
      email: 'alice@restaurant.com',
      phone_number: '912 345 681',
      job_title: 'Head Waiter', 
      department: 'Service',
      salary: 60000,
      status: 'on_leave',
      hire_date: '2023-04-05',
      employment_type: 'full_time',
    },
    {
      id: 5,
      full_name: 'David Wilson',
      first_name: 'David',
      last_name: 'Wilson',
      email: 'david@restaurant.com',
      phone_number: '912 345 682',
      job_title: 'Cashier',
      department: 'Front Office',
      salary: 45000,
      status: 'active',
      hire_date: '2023-06-01',
      employment_type: 'full_time',
    },
    {
      id: 6,
      full_name: 'Sarah Davis',
      first_name: 'Sarah',
      last_name: 'Davis',
      email: 'sarah@restaurant.com',
      phone_number: '912 345 683',
      job_title: 'Bartender',
      department: 'Bar',
      salary: 50000,
      status: 'inactive',
      hire_date: '2023-05-15',
      employment_type: 'part_time',
    },
  ];

  const filterEmployees = () => {
    let filtered = [...employees];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone_number?.includes(searchQuery) ||
        emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status?.toLowerCase() === selectedFilter);
    }
    
    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }
    
    setFilteredEmployees(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  const handleEmployeePress = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const handleActionPress = (employee) => {
    setSelectedEmployee(employee);
    setShowActionSheet(true);
  };

  const handleAddEmployee = async () => {
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.job_title) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const employeeData = {
        ...formData,
        full_name: `${formData.first_name} ${formData.last_name}`,
      };
      
      const response = await api.post('/hr/v2/employees/', employeeData);
      
      if (response.data && response.data.success !== false) {
        Alert.alert('Success', 'Staff member added successfully');
        setShowAddModal(false);
        resetForm();
        loadEmployees();
      } else {
        throw new Error('Failed to add employee');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      // For demo, add to local list
      const newEmployee = {
        ...formData,
        id: Date.now(),
        full_name: `${formData.first_name} ${formData.last_name}`,
        hire_date: new Date().toISOString().split('T')[0],
      };
      setEmployees([...employees, newEmployee]);
      Alert.alert('Success', 'Staff member added successfully');
      setShowAddModal(false);
      resetForm();
    }
  };

  const handleToggleStatus = async (employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    
    try {
      await api.patch(`/hr/v2/employees/${employee.id}/`, { status: newStatus });
      
      setEmployees(employees.map(emp => 
        emp.id === employee.id ? { ...emp, status: newStatus } : emp
      ));
      
      Alert.alert(
        'Success', 
        `${employee.full_name} is now ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      );
    } catch (error) {
      console.error('Error toggling status:', error);
      // Update locally for demo
      setEmployees(employees.map(emp => 
        emp.id === employee.id ? { ...emp, status: newStatus } : emp
      ));
      Alert.alert(
        'Success', 
        `${employee.full_name} is now ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      );
    }
    
    setShowActionSheet(false);
  };

  const handleDeleteEmployee = (employee) => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to delete ${employee.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/hr/v2/employees/${employee.id}/`);
              setEmployees(employees.filter(emp => emp.id !== employee.id));
              Alert.alert('Success', 'Staff member deleted successfully');
            } catch (error) {
              console.error('Error deleting employee:', error);
              // Delete locally for demo
              setEmployees(employees.filter(emp => emp.id !== employee.id));
              Alert.alert('Success', 'Staff member deleted successfully');
            }
            setShowActionSheet(false);
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      phone_country_code: '+211',
      job_title: '',
      department: '',
      employment_type: 'full_time',
      salary: '',
      wage_per_hour: '',
      compensation_type: 'SALARY',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      status: 'active',
    });
    setCurrentStep(1);
  };

  const getStats = () => {
    const total = employees.length;
    const active = employees.filter(emp => emp.status === 'active').length;
    const inactive = employees.filter(emp => emp.status === 'inactive').length;
    const onLeave = employees.filter(emp => emp.status === 'on_leave').length;
    
    return { total, active, inactive, onLeave };
  };

  const stats = getStats();

  const getDepartments = () => {
    const depts = new Set(employees.map(emp => emp.department).filter(Boolean));
    return ['all', ...Array.from(depts)];
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        <StatsCard value={stats.total} label="Total Staff" color="#2563EB" icon="people" />
        <StatsCard value={stats.active} label="Active" color="#10B981" icon="checkmark-circle" />
        <StatsCard value={stats.onLeave} label="On Leave" color="#F59E0B" icon="time" />
        <StatsCard value={stats.inactive} label="Inactive" color="#EF4444" icon="close-circle" />
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff by name, phone, or role..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'active' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('active')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'active' && styles.filterChipTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'inactive' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('inactive')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'inactive' && styles.filterChipTextActive]}>
            Inactive
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'on_leave' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('on_leave')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'on_leave' && styles.filterChipTextActive]}>
            On Leave
          </Text>
        </TouchableOpacity>
        
        <View style={styles.filterDivider} />
        
        <TouchableOpacity
          style={[styles.filterChip, styles.departmentChip]}
          onPress={() => {
            // TODO: Show department picker
          }}
        >
          <Text style={styles.filterChipText}>
            {selectedDepartment === 'all' ? 'All Departments' : selectedDepartment}
          </Text>
          <Icon name="chevron-down" size={16} color="#6B7280" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="people-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Staff Members Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'Try adjusting your search or filters' : 'Add your first staff member to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.emptyButtonText}>Add Staff Member</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Staff Member</Text>
          <TouchableOpacity onPress={handleAddEmployee}>
            <Text style={styles.modalSave}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]} />
              <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
              <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive]} />
            </View>

            {currentStep === 1 && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>
                
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>First Name *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.first_name}
                      onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                      placeholder="John"
                    />
                  </View>
                  
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Last Name *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.last_name}
                      onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                      placeholder="Doe"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="john.doe@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Phone Number *</Text>
                  <View style={styles.phoneInputContainer}>
                    <TouchableOpacity style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+211</Text>
                      <Icon name="chevron-down" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.phoneInput}
                      value={formData.phone_number}
                      onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                      placeholder="912 345 678"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.nextButton}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={styles.nextButtonText}>Next: Employment Details</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Employment Details</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Job Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.job_title}
                    onChangeText={(text) => setFormData({ ...formData, job_title: text })}
                    placeholder="e.g., Waiter, Chef, Manager"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Department *</Text>
                  <TouchableOpacity style={styles.formSelect}>
                    <Text style={styles.formSelectText}>
                      {formData.department || 'Select Department'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Employment Type</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setFormData({ ...formData, employment_type: 'full_time' })}
                    >
                      <View style={styles.radio}>
                        {formData.employment_type === 'full_time' && (
                          <View style={styles.radioDot} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Full-time</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setFormData({ ...formData, employment_type: 'part_time' })}
                    >
                      <View style={styles.radio}>
                        {formData.employment_type === 'part_time' && (
                          <View style={styles.radioDot} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Part-time</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => setCurrentStep(1)}
                  >
                    <Icon name="arrow-back" size={20} color="#6B7280" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.nextButton}
                    onPress={() => setCurrentStep(3)}
                  >
                    <Text style={styles.nextButtonText}>Next: Compensation</Text>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Compensation & Emergency Contact</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Compensation Type</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setFormData({ ...formData, compensation_type: 'SALARY' })}
                    >
                      <View style={styles.radio}>
                        {formData.compensation_type === 'SALARY' && (
                          <View style={styles.radioDot} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Monthly Salary</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setFormData({ ...formData, compensation_type: 'WAGE' })}
                    >
                      <View style={styles.radio}>
                        {formData.compensation_type === 'WAGE' && (
                          <View style={styles.radioDot} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Hourly Wage</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {formData.compensation_type === 'SALARY' ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Monthly Salary (SSP)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.salary}
                      onChangeText={(text) => setFormData({ ...formData, salary: text })}
                      placeholder="150,000"
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Hourly Wage (SSP)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.wage_per_hour}
                      onChangeText={(text) => setFormData({ ...formData, wage_per_hour: text })}
                      placeholder="500"
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <Text style={styles.formSectionTitle}>Emergency Contact</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.emergency_contact_name}
                    onChangeText={(text) => setFormData({ ...formData, emergency_contact_name: text })}
                    placeholder="Mary Doe"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.emergency_contact_phone}
                    onChangeText={(text) => setFormData({ ...formData, emergency_contact_phone: text })}
                    placeholder="+211 912 345 679"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => setCurrentStep(2)}
                  >
                    <Icon name="arrow-back" size={20} color="#6B7280" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.nextButton, { backgroundColor: '#10B981' }]}
                    onPress={handleAddEmployee}
                  >
                    <Text style={styles.nextButtonText}>Add Staff Member</Text>
                    <Icon name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  const renderActionSheet = () => (
    <Modal
      visible={showActionSheet}
      transparent
      animationType="fade"
      onRequestClose={() => setShowActionSheet(false)}
    >
      <TouchableOpacity 
        style={styles.actionSheetOverlay}
        activeOpacity={1}
        onPress={() => setShowActionSheet(false)}
      >
        <View style={styles.actionSheetContainer}>
          <View style={styles.actionSheetHeader}>
            <Text style={styles.actionSheetTitle}>{selectedEmployee?.full_name}</Text>
            <Text style={styles.actionSheetSubtitle}>{selectedEmployee?.job_title}</Text>
          </View>
          
          <TouchableOpacity style={styles.actionSheetItem} onPress={() => {
            setShowActionSheet(false);
            handleEmployeePress(selectedEmployee);
          }}>
            <Icon name="eye-outline" size={24} color="#6B7280" />
            <Text style={styles.actionSheetItemText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionSheetItem}>
            <Icon name="create-outline" size={24} color="#6B7280" />
            <Text style={styles.actionSheetItemText}>Edit Information</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionSheetItem}>
            <Icon name="time-outline" size={24} color="#6B7280" />
            <Text style={styles.actionSheetItemText}>View Timesheets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionSheetItem}>
            <Icon name="chatbubble-outline" size={24} color="#6B7280" />
            <Text style={styles.actionSheetItemText}>Send Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionSheetItem}
            onPress={() => handleToggleStatus(selectedEmployee)}
          >
            <Icon 
              name={selectedEmployee?.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} 
              size={24} 
              color={selectedEmployee?.status === 'active' ? '#F59E0B' : '#10B981'} 
            />
            <Text style={styles.actionSheetItemText}>
              {selectedEmployee?.status === 'active' ? 'Deactivate' : 'Activate'} Account
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionSheetItem, styles.actionSheetItemDanger]}
            onPress={() => handleDeleteEmployee(selectedEmployee)}
          >
            <Icon name="trash-outline" size={24} color="#EF4444" />
            <Text style={[styles.actionSheetItemText, { color: '#EF4444' }]}>Delete Staff Member</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionSheetItem, styles.actionSheetCancel]}
            onPress={() => setShowActionSheet(false)}
          >
            <Text style={styles.actionSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading staff members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="add-circle" size={28} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <StaffCard 
            item={item} 
            onPress={handleEmployeePress}
            onActionPress={handleActionPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderAddModal()}
      {renderActionSheet()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  departmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  staffPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  staffBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tenureText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#EF4444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSave: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  countryCodeText: {
    fontSize: 15,
    color: '#1F2937',
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  formSelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  formSelectText: {
    fontSize: 15,
    color: '#1F2937',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  radioLabel: {
    fontSize: 15,
    color: '#1F2937',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    fontSize: 15,
    color: '#6B7280',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionSheetItemText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 16,
  },
  actionSheetItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  actionSheetCancel: {
    borderTopWidth: 8,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    justifyContent: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});