import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function ReportsScreen() {
  const navigation = useNavigation();

  const reports = [
    { id: 1, title: 'Sales Report', icon: 'trending-up', color: '#10b981' },
    { id: 2, title: 'Inventory Report', icon: 'cube', color: '#ec4899' },
    { id: 3, title: 'Employee Report', icon: 'people', color: '#f59e0b' },
    { id: 4, title: 'Expense Report', icon: 'card', color: '#ef4444' },
    { id: 5, title: 'Tax Report', icon: 'receipt', color: '#8b5cf6' },
    { id: 6, title: 'Payroll Report', icon: 'cash', color: '#06b6d4' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity>
          <Icon name="filter-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {reports.map(report => (
          <TouchableOpacity key={report.id} style={styles.reportCard}>
            <View style={[styles.iconContainer, { backgroundColor: report.color + '20' }]}>
              <Icon name={report.icon} size={24} color={report.color} />
            </View>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Icon name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    backgroundColor: '#8b5cf6',
    borderBottomWidth: 1,
    borderBottomColor: '#8b5cf6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
});
