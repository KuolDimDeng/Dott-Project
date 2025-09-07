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

const HRScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    loadHRData();
  }, []);

  const loadHRData = async () => {
    try {
      setLoading(true);
      const [employeesRes, departmentsRes, timeOffRes] = await Promise.all([
        api.get('/hr/employees/').catch(() => ({ data: [] })),
        api.get('/hr/departments/').catch(() => ({ data: [] })),
        api.get('/hr/time-off-requests/').catch(() => ({ data: [] })),
      ]);

      setEmployees(employeesRes.data.results || employeesRes.data || getMockEmployees());
      setDepartments(departmentsRes.data.results || departmentsRes.data || getMockDepartments());
      setTimeOffRequests(timeOffRes.data.results || timeOffRes.data || getMockTimeOffRequests());
    } catch (error) {
      console.error('Error loading HR data:', error);
      setEmployees(getMockEmployees());
      setDepartments(getMockDepartments());
      setTimeOffRequests(getMockTimeOffRequests());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockEmployees = () => [
    {
      id: 1,
      name: 'John Smith',
      position: 'Senior Developer',
      department: 'Engineering',
      email: 'john.smith@company.com',
      phone: '+1234567890',
      status: 'active',
      startDate: '2023-01-15',
      salary: '$85,000',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      position: 'Sales Manager',
      department: 'Sales',
      email: 'sarah.j@company.com',
      phone: '+1234567891',
      status: 'active',
      startDate: '2022-06-10',
      salary: '$75,000',
    },
    {
      id: 3,
      name: 'Mike Williams',
      position: 'HR Specialist',
      department: 'Human Resources',
      email: 'mike.w@company.com',
      phone: '+1234567892',
      status: 'active',
      startDate: '2023-03-20',
      salary: '$60,000',
    },
    {
      id: 4,
      name: 'Emily Davis',
      position: 'Marketing Coordinator',
      department: 'Marketing',
      email: 'emily.d@company.com',
      phone: '+1234567893',
      status: 'on_leave',
      startDate: '2023-08-01',
      salary: '$55,000',
    },
  ];

  const getMockDepartments = () => [
    { id: 1, name: 'Engineering', employeeCount: 12, budget: '$500,000' },
    { id: 2, name: 'Sales', employeeCount: 8, budget: '$300,000' },
    { id: 3, name: 'Marketing', employeeCount: 6, budget: '$200,000' },
    { id: 4, name: 'Human Resources', employeeCount: 4, budget: '$150,000' },
  ];

  const getMockTimeOffRequests = () => [
    {
      id: 1,
      employee: 'Emily Davis',
      type: 'Vacation',
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      status: 'pending',
      reason: 'Family vacation',
    },
    {
      id: 2,
      employee: 'John Smith',
      type: 'Sick Leave',
      startDate: '2024-01-20',
      endDate: '2024-01-21',
      status: 'approved',
      reason: 'Medical appointment',
    },
    {
      id: 3,
      employee: 'Sarah Johnson',
      type: 'Personal',
      startDate: '2024-02-15',
      endDate: '2024-02-15',
      status: 'pending',
      reason: 'Personal matters',
    },
  ];

  const handleAddEmployee = () => {
    navigation.navigate('AddEmployee');
  };

  const handleEditEmployee = (employee) => {
    navigation.navigate('EditEmployee', { employee });
  };

  const handleTimeOffAction = (request, action) => {
    Alert.alert(
      `${action} Request`,
      `Are you sure you want to ${action.toLowerCase()} this time off request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.patch(`/hr/time-off-requests/${request.id}/`, {
                status: action === 'Approve' ? 'approved' : 'rejected',
              });
              loadHRData();
              Alert.alert('Success', `Request ${action.toLowerCase()}d successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${action.toLowerCase()} request`);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'approved':
        return '#22c55e';
      case 'on_leave':
      case 'pending':
        return '#f59e0b';
      case 'inactive':
      case 'rejected':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const renderEmployee = ({ item }) => (
    <TouchableOpacity style={styles.employeeCard} onPress={() => handleEditEmployee(item)}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeAvatar}>
          <Text style={styles.avatarText}>{item.name.split(' ').map(n => n[0]).join('')}</Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeePosition}>{item.position}</Text>
          <Text style={styles.employeeDepartment}>{item.department}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.employeeDetails}>
        <View style={styles.detailItem}>
          <Icon name="mail-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.email}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="call-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Started: {item.startDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDepartment = ({ item }) => (
    <View style={styles.departmentCard}>
      <View style={styles.departmentHeader}>
        <Text style={styles.departmentName}>{item.name}</Text>
        <TouchableOpacity>
          <Icon name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      <View style={styles.departmentStats}>
        <View style={styles.statItem}>
          <Icon name="people-outline" size={20} color="#2563eb" />
          <Text style={styles.statValue}>{item.employeeCount}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="cash-outline" size={20} color="#22c55e" />
          <Text style={styles.statValue}>{item.budget}</Text>
          <Text style={styles.statLabel}>Budget</Text>
        </View>
      </View>
    </View>
  );

  const renderTimeOffRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestEmployee}>{item.employee}</Text>
        <View style={[styles.requestBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.requestStatus, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.requestType}>{item.type}</Text>
      <Text style={styles.requestDates}>
        {item.startDate} - {item.endDate}
      </Text>
      <Text style={styles.requestReason}>{item.reason}</Text>
      {item.status === 'pending' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleTimeOffAction(item, 'Approve')}
          >
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleTimeOffAction(item, 'Reject')}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading HR data...</Text>
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
        <Text style={styles.headerTitle}>Human Resources</Text>
        <TouchableOpacity onPress={() => navigation.navigate('HRSettings')}>
          <Icon name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="people" size={24} color="#2563eb" />
          <Text style={styles.statNumber}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="business" size={24} color="#22c55e" />
          <Text style={styles.statNumber}>{departments.length}</Text>
          <Text style={styles.statLabel}>Departments</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="time" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>
            {timeOffRequests.filter(r => r.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending Requests</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.activeTab]}
          onPress={() => setActiveTab('employees')}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.activeTabText]}>
            Employees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'departments' && styles.activeTab]}
          onPress={() => setActiveTab('departments')}
        >
          <Text style={[styles.tabText, activeTab === 'departments' && styles.activeTabText]}>
            Departments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeoff' && styles.activeTab]}
          onPress={() => setActiveTab('timeoff')}
        >
          <Text style={[styles.tabText, activeTab === 'timeoff' && styles.activeTabText]}>
            Time Off
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'employees' && (
        <>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterButton}>
              <Icon name="filter" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployee}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadHRData} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.fab} onPress={handleAddEmployee}>
            <Icon name="add" size={24} color="white" />
          </TouchableOpacity>
        </>
      )}

      {activeTab === 'departments' && (
        <FlatList
          data={departments}
          renderItem={renderDepartment}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadHRData} />
          }
        />
      )}

      {activeTab === 'timeoff' && (
        <FlatList
          data={timeOffRequests}
          renderItem={renderTimeOffRequest}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadHRData} />
          }
        />
      )}
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
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    padding: 5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  employeeCard: {
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
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  employeeAvatar: {
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
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  employeePosition: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
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
  employeeDetails: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  departmentCard: {
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
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  departmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestEmployee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requestStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  requestType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestDates: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  requestReason: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#22c55e20',
  },
  approveText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#ef444420',
  },
  rejectText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default HRScreen;