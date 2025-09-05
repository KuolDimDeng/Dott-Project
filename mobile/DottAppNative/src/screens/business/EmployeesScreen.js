import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export default function EmployeesScreen() {
  const navigation = useNavigation();
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await api.get('/api/employees/v2/');
      setEmployees(response.data.data || []);
    } catch (error) {
      // Sample data
      setEmployees([
        { id: 1, full_name: 'John Doe', role: 'Manager', status: 'active' },
        { id: 2, full_name: 'Jane Smith', role: 'Cashier', status: 'active' },
        { id: 3, full_name: 'Bob Johnson', role: 'Cook', status: 'active' },
      ]);
    }
  };

  const renderEmployee = ({ item }) => (
    <TouchableOpacity style={styles.employeeCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.full_name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.full_name}</Text>
        <Text style={styles.employeeRole}>{item.role}</Text>
      </View>
      <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity>
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f59e0b',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  list: {
    padding: 20,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  employeeRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  status_active: {
    backgroundColor: '#10b98120',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10b981',
  },
});
