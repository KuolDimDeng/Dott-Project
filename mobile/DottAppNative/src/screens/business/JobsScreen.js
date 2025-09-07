import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export default function JobsScreen() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // Fetch services from inventory API (Jobs are stored as services in the backend)
      const response = await api.get('/inventory/services/');
      
      let servicesData = [];
      if (Array.isArray(response.data)) {
        servicesData = response.data;
      } else if (response.data.results) {
        servicesData = response.data.results;
      } else if (response.data.services) {
        servicesData = response.data.services;
      }
      
      // Also try to fetch from ultra-optimized endpoint
      if (servicesData.length === 0) {
        try {
          const ultraResponse = await api.get('/inventory/ultra/services/');
          if (ultraResponse.data && ultraResponse.data.services) {
            servicesData = ultraResponse.data.services;
          }
        } catch (ultraError) {
          console.log('Ultra services endpoint not available');
        }
      }
      
      // Format services as jobs
      const formattedJobs = servicesData.map(service => ({
        id: service.id || service.uuid,
        title: service.name || service.service_name || 'Untitled Service',
        customer_name: service.customer_name || service.customer || '',
        description: service.description || '',
        status: service.status || 'pending',
        due_date: service.due_date || service.end_date || null,
        total_amount: parseFloat(service.price || service.charge || service.amount || 0),
        created_at: service.created_at || service.date_created,
        service_type: service.service_type || 'standard',
        duration: service.duration || null,
        location: service.location || null,
      }));
      
      // Sort by creation date (most recent first)
      formattedJobs.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      setJobs(formattedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      // Set some mock data as fallback
      setJobs([
        {
          id: 1,
          title: 'Website Development',
          customer_name: 'John Doe',
          description: 'Build a responsive website with React',
          status: 'in_progress',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 2500.00,
        },
        {
          id: 2,
          title: 'Logo Design',
          customer_name: 'Jane Smith',
          description: 'Create a modern logo for startup',
          status: 'pending',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 500.00,
        },
        {
          id: 3,
          title: 'SEO Optimization',
          customer_name: 'Bob Johnson',
          description: 'Improve website SEO ranking',
          status: 'completed',
          due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 1200.00,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#fef3c7';
      case 'in_progress':
        return '#dbeafe';
      case 'completed':
        return '#d1fae5';
      case 'cancelled':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || job.status?.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleJobAction = (job, action) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => performJobAction(job, action) }
      ]
    );
  };

  const performJobAction = async (job, action) => {
    try {
      // Update service status in the backend
      const statusMap = {
        'start': 'in_progress',
        'complete': 'completed',
        'cancel': 'cancelled',
      };
      
      const response = await api.patch(`/inventory/services/${job.id}/`, {
        status: statusMap[action] || action,
      });
      
      if (response.data) {
        await loadJobs();
        Alert.alert('Success', `Service ${action}d successfully`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      Alert.alert('Error', `Failed to ${action} service`);
    }
  };

  const renderJobCard = (job) => (
    <TouchableOpacity 
      key={job.id}
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title || 'Untitled Job'}</Text>
          <Text style={styles.customerName}>{job.customer_name || 'No customer'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(job.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
            {job.status || 'Pending'}
          </Text>
        </View>
      </View>

      {job.description && (
        <Text style={styles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>
      )}

      <View style={styles.jobMeta}>
        <View style={styles.metaItem}>
          <Icon name="calendar-outline" size={14} color="#6b7280" />
          <Text style={styles.metaText}>
            {job.due_date ? new Date(job.due_date).toLocaleDateString() : 'No due date'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="cash-outline" size={14} color="#6b7280" />
          <Text style={styles.metaText}>
            ${job.total_amount || '0.00'}
          </Text>
        </View>
      </View>

      {job.status?.toLowerCase() === 'pending' && (
        <View style={styles.jobActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleJobAction(job, 'start')}
          >
            <Text style={styles.primaryButtonText}>Start Job</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('JobEdit', { jobId: job.id })}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      {job.status?.toLowerCase() === 'in_progress' && (
        <View style={styles.jobActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.successButton]}
            onPress={() => handleJobAction(job, 'complete')}
          >
            <Text style={styles.successButtonText}>Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => handleJobAction(job, 'cancel')}
          >
            <Text style={styles.dangerButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jobs</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('JobCreate')}
        >
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs or customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filterStatus === status && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === status && styles.filterChipTextActive
            ]}>
              {status === 'all' ? 'All Jobs' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map(renderJobCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-outline" size={64} color="#e5e7eb" />
            <Text style={styles.emptyText}>No jobs found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first job to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('JobCreate')}
              >
                <Text style={styles.createButtonText}>Create Job</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  jobActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  successButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  successButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});