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

const PayrollScreen = ({ navigation }) => {
  const [payrollData, setPayrollData] = useState({
    currentPeriod: null,
    employees: [],
    payHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPayrollData();
  }, []);

  const loadPayrollData = async () => {
    try {
      setLoading(true);
      const [currentRes, employeesRes, historyRes] = await Promise.all([
        api.get('/payroll/current-period/').catch(() => ({ data: null })),
        api.get('/payroll/employees/').catch(() => ({ data: [] })),
        api.get('/payroll/history/').catch(() => ({ data: [] })),
      ]);

      setPayrollData({
        currentPeriod: currentRes.data || getMockCurrentPeriod(),
        employees: employeesRes.data.results || employeesRes.data || getMockPayrollEmployees(),
        payHistory: historyRes.data.results || historyRes.data || getMockPayHistory(),
      });
    } catch (error) {
      console.error('Error loading payroll data:', error);
      setPayrollData({
        currentPeriod: getMockCurrentPeriod(),
        employees: getMockPayrollEmployees(),
        payHistory: getMockPayHistory(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockCurrentPeriod = () => ({
    period: 'January 16-31, 2024',
    totalEmployees: 12,
    totalGross: 45250.00,
    totalDeductions: 8542.50,
    totalNet: 36707.50,
    payDate: '2024-02-01',
    status: 'pending',
  });

  const getMockPayrollEmployees = () => [
    {
      id: 1,
      name: 'John Smith',
      position: 'Senior Developer',
      hoursWorked: 80,
      hourlyRate: 45.00,
      grossPay: 3600.00,
      deductions: 720.00,
      netPay: 2880.00,
      status: 'approved',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      position: 'Sales Manager',
      hoursWorked: 80,
      hourlyRate: 40.00,
      grossPay: 3200.00,
      deductions: 640.00,
      netPay: 2560.00,
      status: 'pending',
    },
    {
      id: 3,
      name: 'Mike Williams',
      position: 'HR Specialist',
      hoursWorked: 75,
      hourlyRate: 35.00,
      grossPay: 2625.00,
      deductions: 525.00,
      netPay: 2100.00,
      status: 'approved',
    },
    {
      id: 4,
      name: 'Emily Davis',
      position: 'Marketing Coordinator',
      hoursWorked: 80,
      hourlyRate: 30.00,
      grossPay: 2400.00,
      deductions: 480.00,
      netPay: 1920.00,
      status: 'pending',
    },
  ];

  const getMockPayHistory = () => [
    {
      id: 1,
      period: 'January 1-15, 2024',
      payDate: '2024-01-16',
      employees: 12,
      totalGross: 44850.00,
      totalNet: 36350.00,
      status: 'completed',
    },
    {
      id: 2,
      period: 'December 16-31, 2023',
      payDate: '2024-01-01',
      employees: 12,
      totalGross: 45100.00,
      totalNet: 36600.00,
      status: 'completed',
    },
    {
      id: 3,
      period: 'December 1-15, 2023',
      payDate: '2023-12-16',
      employees: 11,
      totalGross: 42300.00,
      totalNet: 34200.00,
      status: 'completed',
    },
  ];

  const handleRunPayroll = () => {
    Alert.alert(
      'Run Payroll',
      'Are you sure you want to process payroll for the current period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            try {
              await api.post('/payroll/process/', {
                periodId: payrollData.currentPeriod.id,
              });
              Alert.alert('Success', 'Payroll processed successfully');
              loadPayrollData();
            } catch (error) {
              Alert.alert('Error', 'Failed to process payroll');
            }
          },
        },
      ]
    );
  };

  const handleApproveTimesheet = (employee) => {
    Alert.alert(
      'Approve Timesheet',
      `Approve timesheet for ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.patch(`/payroll/employees/${employee.id}/approve/`);
              Alert.alert('Success', 'Timesheet approved');
              loadPayrollData();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve timesheet');
            }
          },
        },
      ]
    );
  };

  const handleExportPayroll = () => {
    Alert.alert(
      'Export Payroll',
      'Choose export format:',
      [
        { text: 'PDF Report', onPress: () => console.log('Export PDF') },
        { text: 'Excel File', onPress: () => console.log('Export Excel') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  const filteredEmployees = payrollData.employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeePosition}>{item.position}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.payrollDetails}>
        <View style={styles.payrollRow}>
          <Text style={styles.payrollLabel}>Hours Worked:</Text>
          <Text style={styles.payrollValue}>{item.hoursWorked} hrs</Text>
        </View>
        <View style={styles.payrollRow}>
          <Text style={styles.payrollLabel}>Hourly Rate:</Text>
          <Text style={styles.payrollValue}>{formatCurrency(item.hourlyRate)}/hr</Text>
        </View>
        <View style={styles.payrollRow}>
          <Text style={styles.payrollLabel}>Gross Pay:</Text>
          <Text style={styles.payrollValue}>{formatCurrency(item.grossPay)}</Text>
        </View>
        <View style={styles.payrollRow}>
          <Text style={styles.payrollLabel}>Deductions:</Text>
          <Text style={[styles.payrollValue, { color: '#ef4444' }]}>
            -{formatCurrency(item.deductions)}
          </Text>
        </View>
        <View style={[styles.payrollRow, styles.netPayRow]}>
          <Text style={styles.netPayLabel}>Net Pay:</Text>
          <Text style={styles.netPayValue}>{formatCurrency(item.netPay)}</Text>
        </View>
      </View>
      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveTimesheet(item)}
        >
          <Text style={styles.approveButtonText}>Approve Timesheet</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPayHistory = ({ item }) => (
    <TouchableOpacity style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyPeriod}>{item.period}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.historyDetails}>
        <View style={styles.historyRow}>
          <Text style={styles.historyLabel}>Pay Date:</Text>
          <Text style={styles.historyValue}>{item.payDate}</Text>
        </View>
        <View style={styles.historyRow}>
          <Text style={styles.historyLabel}>Employees:</Text>
          <Text style={styles.historyValue}>{item.employees}</Text>
        </View>
        <View style={styles.historyRow}>
          <Text style={styles.historyLabel}>Total Gross:</Text>
          <Text style={styles.historyValue}>{formatCurrency(item.totalGross)}</Text>
        </View>
        <View style={styles.historyRow}>
          <Text style={styles.historyLabel}>Total Net:</Text>
          <Text style={styles.historyValue}>{formatCurrency(item.totalNet)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.viewDetailsButton}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Icon name="chevron-forward" size={16} color="#2563eb" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading payroll data...</Text>
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
        <Text style={styles.headerTitle}>Payroll</Text>
        <TouchableOpacity onPress={handleExportPayroll}>
          <Icon name="download-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {payrollData.currentPeriod && (
        <View style={styles.currentPeriodCard}>
          <Text style={styles.periodTitle}>Current Pay Period</Text>
          <Text style={styles.periodDates}>{payrollData.currentPeriod.period}</Text>
          <View style={styles.periodStats}>
            <View style={styles.periodStat}>
              <Text style={styles.periodStatLabel}>Employees</Text>
              <Text style={styles.periodStatValue}>{payrollData.currentPeriod.totalEmployees}</Text>
            </View>
            <View style={styles.periodStat}>
              <Text style={styles.periodStatLabel}>Total Gross</Text>
              <Text style={styles.periodStatValue}>
                {formatCurrency(payrollData.currentPeriod.totalGross)}
              </Text>
            </View>
            <View style={styles.periodStat}>
              <Text style={styles.periodStatLabel}>Total Net</Text>
              <Text style={styles.periodStatValue}>
                {formatCurrency(payrollData.currentPeriod.totalNet)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.runPayrollButton} onPress={handleRunPayroll}>
            <Icon name="play-circle" size={20} color="white" />
            <Text style={styles.runPayrollText}>Run Payroll</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            Current Period
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Pay History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'current' && (
        <>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployee}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadPayrollData} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            }
          />
        </>
      )}

      {activeTab === 'history' && (
        <FlatList
          data={payrollData.payHistory}
          renderItem={renderPayHistory}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadPayrollData} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="time-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No pay history found</Text>
            </View>
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
  currentPeriodCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  periodTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  periodDates: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  periodStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  periodStat: {
    alignItems: 'center',
  },
  periodStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  periodStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  runPayrollButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runPayrollText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  payrollDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payrollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  payrollLabel: {
    fontSize: 13,
    color: '#666',
  },
  payrollValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  netPayRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  netPayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  netPayValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  approveButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyLabel: {
    fontSize: 13,
    color: '#666',
  },
  historyValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
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
});

export default PayrollScreen;