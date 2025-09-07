import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ProgressBarAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const TaxFilingScreen = ({ navigation }) => {
  const [taxReturns, setTaxReturns] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [taxDocuments, setTaxDocuments] = useState([]);
  const [taxSummary, setTaxSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTaxData();
  }, []);

  const loadTaxData = async () => {
    try {
      setLoading(true);
      const [returnsRes, deadlinesRes, documentsRes, summaryRes] = await Promise.all([
        api.get('/tax/returns/').catch(() => ({ data: [] })),
        api.get('/tax/deadlines/').catch(() => ({ data: [] })),
        api.get('/tax/documents/').catch(() => ({ data: [] })),
        api.get('/tax/summary/').catch(() => ({ data: null })),
      ]);

      setTaxReturns(returnsRes.data.results || returnsRes.data || getMockTaxReturns());
      setUpcomingDeadlines(deadlinesRes.data.results || deadlinesRes.data || getMockDeadlines());
      setTaxDocuments(documentsRes.data.results || documentsRes.data || getMockDocuments());
      setTaxSummary(summaryRes.data || getMockSummary());
    } catch (error) {
      console.error('Error loading tax data:', error);
      setTaxReturns(getMockTaxReturns());
      setUpcomingDeadlines(getMockDeadlines());
      setTaxDocuments(getMockDocuments());
      setTaxSummary(getMockSummary());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockTaxReturns = () => [
    {
      id: 1,
      year: 2023,
      type: 'Income Tax',
      status: 'filed',
      filing_date: '2024-03-15',
      refund_amount: 2450,
      payment_amount: 0,
      form_type: '1040',
    },
    {
      id: 2,
      year: 2023,
      type: 'Sales Tax',
      quarter: 'Q4',
      status: 'filed',
      filing_date: '2024-01-31',
      payment_amount: 850,
      form_type: 'Sales Tax Return',
    },
    {
      id: 3,
      year: 2024,
      type: 'Quarterly Tax',
      quarter: 'Q1',
      status: 'pending',
      due_date: '2024-04-15',
      estimated_amount: 1200,
      form_type: '1040-ES',
    },
  ];

  const getMockDeadlines = () => [
    {
      id: 1,
      title: 'Q1 2024 Quarterly Tax Payment',
      due_date: '2024-04-15',
      days_remaining: 45,
      type: 'payment',
      amount: 1200,
      status: 'upcoming',
    },
    {
      id: 2,
      title: 'Sales Tax Return - March',
      due_date: '2024-04-20',
      days_remaining: 50,
      type: 'filing',
      status: 'upcoming',
    },
    {
      id: 3,
      title: 'Annual Business License Renewal',
      due_date: '2024-05-01',
      days_remaining: 61,
      type: 'renewal',
      amount: 250,
      status: 'upcoming',
    },
  ];

  const getMockDocuments = () => [
    {
      id: 1,
      name: 'W-2 Forms',
      type: 'income',
      count: 5,
      status: 'complete',
      year: 2023,
    },
    {
      id: 2,
      name: '1099 Forms',
      type: 'income',
      count: 3,
      status: 'partial',
      year: 2023,
    },
    {
      id: 3,
      name: 'Business Expenses',
      type: 'deduction',
      count: 125,
      status: 'complete',
      year: 2023,
    },
    {
      id: 4,
      name: 'Receipts',
      type: 'deduction',
      count: 342,
      status: 'complete',
      year: 2023,
    },
  ];

  const getMockSummary = () => ({
    current_year_tax: 8500,
    estimated_refund: 1250,
    total_deductions: 24500,
    taxable_income: 65000,
    effective_tax_rate: 13.1,
    ytd_payments: 7250,
    remaining_liability: 1250,
    filing_status: 'Business',
  });

  const handleStartFiling = (type) => {
    Alert.alert(
      'Start Tax Filing',
      `Would you like to start filing your ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            navigation.navigate('TaxFilingWizard', { type });
          },
        },
      ]
    );
  };

  const handleUploadDocument = () => {
    Alert.alert(
      'Upload Document',
      'Choose document type to upload:',
      [
        { text: 'W-2 Form', onPress: () => console.log('Upload W-2') },
        { text: '1099 Form', onPress: () => console.log('Upload 1099') },
        { text: 'Receipt', onPress: () => console.log('Upload Receipt') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleExportDocuments = () => {
    Alert.alert(
      'Export Tax Documents',
      'Choose export format:',
      [
        { text: 'PDF Package', onPress: () => console.log('Export PDF') },
        { text: 'Excel Summary', onPress: () => console.log('Export Excel') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'filed':
      case 'complete':
        return '#22c55e';
      case 'pending':
      case 'partial':
        return '#f59e0b';
      case 'overdue':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading tax information...</Text>
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
        <Text style={styles.headerTitle}>Tax Filing</Text>
        <TouchableOpacity onPress={handleExportDocuments}>
          <Icon name="download-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {taxSummary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tax Year 2024 Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Taxable Income</Text>
              <Text style={styles.summaryValue}>{formatCurrency(taxSummary.taxable_income)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tax Rate</Text>
              <Text style={styles.summaryValue}>{taxSummary.effective_tax_rate}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Est. Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(taxSummary.current_year_tax)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>YTD Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(taxSummary.ytd_payments)}</Text>
            </View>
          </View>
          {taxSummary.estimated_refund > 0 ? (
            <View style={styles.refundBanner}>
              <Icon name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.refundText}>
                Estimated Refund: {formatCurrency(taxSummary.estimated_refund)}
              </Text>
            </View>
          ) : (
            <View style={styles.oweBanner}>
              <Icon name="alert-circle" size={20} color="#f59e0b" />
              <Text style={styles.oweText}>
                Remaining Tax: {formatCurrency(taxSummary.remaining_liability)}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deadlines' && styles.activeTab]}
          onPress={() => setActiveTab('deadlines')}
        >
          <Text style={[styles.tabText, activeTab === 'deadlines' && styles.activeTabText]}>
            Deadlines
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
            Documents
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTaxData} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'overview' && (
          <View style={styles.overviewContainer}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => handleStartFiling('Income Tax')}
              >
                <Icon name="document-text" size={24} color="white" />
                <Text style={styles.primaryButtonText}>Start Income Tax Filing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleStartFiling('Sales Tax')}
              >
                <Icon name="cart-outline" size={24} color="#2563eb" />
                <Text style={styles.secondaryButtonText}>File Sales Tax</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Tax Returns</Text>
            {taxReturns.map(taxReturn => (
              <TouchableOpacity key={taxReturn.id} style={styles.returnCard}>
                <View style={styles.returnHeader}>
                  <View>
                    <Text style={styles.returnType}>{taxReturn.type}</Text>
                    <Text style={styles.returnPeriod}>
                      {taxReturn.year} {taxReturn.quarter ? `- ${taxReturn.quarter}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taxReturn.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(taxReturn.status) }]}>
                      {taxReturn.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.returnDetails}>
                  {taxReturn.filing_date && (
                    <Text style={styles.filingDate}>Filed: {formatDate(taxReturn.filing_date)}</Text>
                  )}
                  {taxReturn.refund_amount > 0 && (
                    <Text style={styles.refundAmount}>
                      Refund: {formatCurrency(taxReturn.refund_amount)}
                    </Text>
                  )}
                  {taxReturn.payment_amount > 0 && (
                    <Text style={styles.paymentAmount}>
                      Payment: {formatCurrency(taxReturn.payment_amount)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Icon name="chevron-forward" size={16} color="#2563eb" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'deadlines' && (
          <View style={styles.deadlinesContainer}>
            {upcomingDeadlines.map(deadline => (
              <View key={deadline.id} style={styles.deadlineCard}>
                <View style={styles.deadlineHeader}>
                  <Icon 
                    name={deadline.type === 'payment' ? 'cash-outline' : 'document-outline'} 
                    size={24} 
                    color={deadline.days_remaining < 30 ? '#f59e0b' : '#2563eb'} 
                  />
                  <View style={styles.deadlineInfo}>
                    <Text style={styles.deadlineTitle}>{deadline.title}</Text>
                    <Text style={styles.deadlineDate}>Due: {formatDate(deadline.due_date)}</Text>
                  </View>
                  <View style={styles.daysRemainingContainer}>
                    <Text style={[
                      styles.daysRemaining,
                      { color: deadline.days_remaining < 30 ? '#f59e0b' : '#22c55e' }
                    ]}>
                      {deadline.days_remaining}
                    </Text>
                    <Text style={styles.daysLabel}>days</Text>
                  </View>
                </View>
                {deadline.amount && (
                  <Text style={styles.deadlineAmount}>
                    Amount Due: {formatCurrency(deadline.amount)}
                  </Text>
                )}
                <TouchableOpacity style={styles.prepareButton}>
                  <Text style={styles.prepareButtonText}>
                    {deadline.type === 'payment' ? 'Make Payment' : 'Prepare Filing'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'documents' && (
          <View style={styles.documentsContainer}>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadDocument}>
              <Icon name="cloud-upload-outline" size={24} color="white" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>

            {taxDocuments.map(doc => (
              <View key={doc.id} style={styles.documentCard}>
                <View style={styles.documentIcon}>
                  <Icon 
                    name={doc.type === 'income' ? 'cash' : 'receipt'} 
                    size={24} 
                    color="#2563eb" 
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{doc.name}</Text>
                  <Text style={styles.documentCount}>{doc.count} documents</Text>
                </View>
                <View style={[styles.documentStatus, { backgroundColor: getStatusColor(doc.status) + '20' }]}>
                  <Text style={[styles.documentStatusText, { color: getStatusColor(doc.status) }]}>
                    {doc.status.toUpperCase()}
                  </Text>
                </View>
              </View>
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
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  summaryItem: {
    width: '50%',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  refundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
  },
  refundText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    marginLeft: 10,
  },
  oweBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
  },
  oweText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    marginLeft: 10,
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
  overviewContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  actionButtons: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  returnCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  returnType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  returnPeriod: {
    fontSize: 13,
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
  returnDetails: {
    marginBottom: 10,
  },
  filingDate: {
    fontSize: 13,
    color: '#666',
  },
  refundAmount: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginRight: 4,
  },
  deadlinesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  deadlineCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  deadlineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deadlineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  deadlineDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  daysRemainingContainer: {
    alignItems: 'center',
  },
  daysRemaining: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  daysLabel: {
    fontSize: 11,
    color: '#666',
  },
  deadlineAmount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 10,
  },
  prepareButton: {
    backgroundColor: '#2563eb20',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  prepareButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  documentsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  documentCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  documentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  documentStatusText: {
    fontSize: 11,
    fontWeight: '600',
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

export default TaxFilingScreen;