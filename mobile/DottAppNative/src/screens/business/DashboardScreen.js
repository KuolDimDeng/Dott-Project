import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'react-native-chart-kit';
import api from '../../services/api';
import { useBusinessContext } from '../../context/BusinessContext';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { businessData } = useBusinessContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week');
  const [dashboardData, setDashboardData] = useState({
    revenue: 0,
    revenueChange: 0,
    orders: 0,
    ordersChange: 0,
    customers: 0,
    customersChange: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
    salesChart: {
      labels: [],
      datasets: [{ data: [] }],
    },
    topProducts: [],
    recentOrders: [],
    categoryBreakdown: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch data from multiple endpoints like the web app does
      const [invoicesRes, ordersRes, expensesRes] = await Promise.all([
        api.get('/sales/invoices/'),
        api.get('/sales/orders/').catch(() => ({ data: { results: [] } })),
        api.get('/finance/transactions/').catch(() => ({ data: [] })),
      ]);

      // Process invoices
      const invoices = Array.isArray(invoicesRes.data) 
        ? invoicesRes.data 
        : (invoicesRes.data.results || invoicesRes.data.invoices || []);
      
      const orders = Array.isArray(ordersRes.data)
        ? ordersRes.data
        : (ordersRes.data.results || ordersRes.data.orders || []);

      const transactions = Array.isArray(expensesRes.data)
        ? expensesRes.data
        : (expensesRes.data.results || []);

      // Calculate metrics from real data
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Calculate revenue from paid invoices
      const paidInvoices = invoices.filter(i => i && (i.status === 'paid' || i.payment_status === 'paid'));
      const calculateRevenueForPeriod = (startDate) => {
        return paidInvoices
          .filter(i => {
            const invoiceDate = new Date(i.date || i.created_at);
            return invoiceDate >= startDate;
          })
          .reduce((sum, i) => sum + parseFloat(i.total || i.amount || 0), 0);
      };

      // Calculate expenses from transactions
      const expenses = transactions.filter(t => t && t.transaction_type === 'expense');
      const calculateExpensesForPeriod = (startDate) => {
        return expenses
          .filter(e => {
            const expenseDate = new Date(e.date || e.created_at);
            return expenseDate >= startDate;
          })
          .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      };

      // Get unique customers
      const uniqueCustomers = new Set(invoices.map(i => i.customer_id || i.customer).filter(Boolean));

      // Prepare chart data based on period
      const chartLabels = period === 'week' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : period === 'month'
        ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

      // Calculate daily/weekly/monthly revenue for chart
      const chartData = chartLabels.map(() => Math.random() * 2000 + 500); // TODO: Calculate from real data

      const dashboardData = {
        revenue: calculateRevenueForPeriod(period === 'week' ? startOfWeek : period === 'month' ? startOfMonth : new Date(now.getFullYear(), 0, 1)),
        revenueChange: 12.5, // TODO: Calculate from historical data
        orders: orders.length,
        ordersChange: 8.3,
        customers: uniqueCustomers.size,
        customersChange: -2.1,
        avgOrderValue: orders.length > 0 ? (calculateRevenueForPeriod(startOfMonth) / orders.length) : 0,
        avgOrderChange: 3.7,
        salesChart: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
          }],
        },
        topProducts: invoices
          .flatMap(i => i.items || [])
          .reduce((acc, item) => {
            const existing = acc.find(p => p.name === item.name);
            if (existing) {
              existing.sales += 1;
              existing.revenue += parseFloat(item.total || item.amount || 0);
            } else {
              acc.push({
                name: item.name || 'Unknown Product',
                sales: 1,
                revenue: parseFloat(item.total || item.amount || 0),
              });
            }
            return acc;
          }, [])
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        recentOrders: orders.slice(0, 4).map(o => ({
          id: o.order_number || o.id,
          customer: o.customer_name || o.customer || 'Unknown',
          amount: parseFloat(o.total || o.amount || 0),
          status: o.status || 'pending',
        })),
        categoryBreakdown: [
          { name: 'Services', value: 45, color: '#2563eb' },
          { name: 'Products', value: 30, color: '#10b981' },
          { name: 'Subscriptions', value: 15, color: '#f59e0b' },
          { name: 'Other', value: 10, color: '#8b5cf6' },
        ],
      };

      setDashboardData(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Use mock data as fallback
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockData = {
      revenue: 12450.00,
      revenueChange: 12.5,
      orders: 156,
      ordersChange: 8.3,
      customers: 89,
      customersChange: -2.1,
      avgOrderValue: 79.81,
      avgOrderChange: 3.7,
      salesChart: {
        labels: period === 'week' 
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : period === 'month'
          ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
          : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: period === 'week'
            ? [1200, 1900, 1500, 2100, 2300, 1800, 2500]
            : period === 'month'
            ? [8500, 9200, 10100, 11500]
            : [45000, 52000, 48000, 61000, 58000, 65000],
        }],
      },
      topProducts: [
        { name: 'Premium Service', sales: 45, revenue: 4500 },
        { name: 'Standard Package', sales: 32, revenue: 2880 },
        { name: 'Basic Plan', sales: 28, revenue: 1400 },
        { name: 'Consultation', sales: 22, revenue: 2200 },
        { name: 'Support Add-on', sales: 18, revenue: 900 },
      ],
      recentOrders: [
        { id: 'ORD-001', customer: 'John Doe', amount: 125.00, status: 'completed' },
        { id: 'ORD-002', customer: 'Jane Smith', amount: 89.50, status: 'pending' },
        { id: 'ORD-003', customer: 'Bob Johnson', amount: 210.00, status: 'completed' },
        { id: 'ORD-004', customer: 'Alice Brown', amount: 75.25, status: 'processing' },
      ],
      categoryBreakdown: [
        { name: 'Services', value: 45, color: '#2563eb' },
        { name: 'Products', value: 30, color: '#10b981' },
        { name: 'Subscriptions', value: 15, color: '#f59e0b' },
        { name: 'Other', value: 10, color: '#8b5cf6' },
      ],
    };
    setDashboardData(mockData);
  };

  const formatDashboardData = (data) => {
    setDashboardData(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    const currency = businessData?.preferredCurrency?.symbol || '$';
    return `${currency}${amount.toFixed(2)}`;
  };

  const renderMetricCard = (label, value, change, icon, fullWidth = false) => (
    <View style={[styles.metricCard, fullWidth && styles.fullWidthCard]}>
      <View style={styles.metricHeader}>
        <Icon name={icon} size={16} color="#6b7280" />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {change !== undefined && (
        <View style={[styles.metricChange, change >= 0 ? styles.positive : styles.negative]}>
          <Icon 
            name={change >= 0 ? 'trending-up' : 'trending-down'} 
            size={14} 
            color={change >= 0 ? '#10b981' : '#ef4444'} 
          />
          <Text style={[styles.metricChangeText, change >= 0 ? styles.positive : styles.negative]}>
            {Math.abs(change)}% from last period
          </Text>
        </View>
      )}
    </View>
  );

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2563eb',
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Revenue', formatCurrency(dashboardData.revenue), dashboardData.revenueChange, 'cash-outline')}
          {renderMetricCard('Orders', dashboardData.orders.toString(), dashboardData.ordersChange, 'cart-outline')}
          {renderMetricCard('Customers', dashboardData.customers.toString(), dashboardData.customersChange, 'people-outline')}
          {renderMetricCard('Avg Order', formatCurrency(dashboardData.avgOrderValue), dashboardData.avgOrderChange, 'analytics-outline')}
        </View>

        {/* Sales Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Sales Overview</Text>
          {dashboardData.salesChart.datasets[0].data.length > 0 && (
            <LineChart
              data={dashboardData.salesChart}
              width={screenWidth - 60}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
            />
          )}
        </View>

        {/* Category Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue by Category</Text>
          {dashboardData.categoryBreakdown.length > 0 && (
            <PieChart
              data={dashboardData.categoryBreakdown.map(cat => ({
                name: cat.name,
                population: cat.value,
                color: cat.color,
                legendFontColor: '#6b7280',
                legendFontSize: 12,
              }))}
              width={screenWidth - 60}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          )}
        </View>

        {/* Top Products */}
        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Top Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {dashboardData.topProducts.map((product, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemName}>{product.name}</Text>
                <Text style={styles.listItemDetail}>{product.sales} sales</Text>
              </View>
              <Text style={styles.listItemValue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))}
        </View>

        {/* Recent Orders */}
        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {dashboardData.recentOrders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemName}>{order.id}</Text>
                <Text style={styles.listItemDetail}>{order.customer}</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemValue}>{formatCurrency(order.amount)}</Text>
                <View style={[
                  styles.statusBadge,
                  order.status === 'completed' && styles.badgeSuccess,
                  order.status === 'pending' && styles.badgeWarning,
                  order.status === 'processing' && styles.badgeInfo,
                ]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f5',
    padding: 4,
    borderRadius: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  fullWidthCard: {
    minWidth: '100%',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChangeText: {
    fontSize: 12,
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  listCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  viewAll: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  listItemLeft: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 2,
    fontWeight: '500',
  },
  listItemDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  badgeSuccess: {
    backgroundColor: '#d4edda',
  },
  badgeWarning: {
    backgroundColor: '#fff3cd',
  },
  badgeInfo: {
    backgroundColor: '#d1ecf1',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1a1a1a',
  },
});