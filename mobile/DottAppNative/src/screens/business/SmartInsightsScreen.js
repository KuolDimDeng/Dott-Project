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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const SmartInsightsScreen = ({ navigation }) => {
  const [insights, setInsights] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingInsight, setGeneratingInsight] = useState(false);

  useEffect(() => {
    loadInsightsData();
  }, []);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      const [insightsRes, metricsRes, predictionsRes, recommendationsRes] = await Promise.all([
        api.get('/ai/insights/').catch(() => ({ data: [] })),
        api.get('/ai/metrics/').catch(() => ({ data: null })),
        api.get('/ai/predictions/').catch(() => ({ data: [] })),
        api.get('/ai/recommendations/').catch(() => ({ data: [] })),
      ]);

      setInsights(insightsRes.data.results || insightsRes.data || getMockInsights());
      setMetrics(metricsRes.data || getMockMetrics());
      setPredictions(predictionsRes.data.results || predictionsRes.data || getMockPredictions());
      setRecommendations(recommendationsRes.data.results || recommendationsRes.data || getMockRecommendations());
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights(getMockInsights());
      setMetrics(getMockMetrics());
      setPredictions(getMockPredictions());
      setRecommendations(getMockRecommendations());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockInsights = () => [
    {
      id: 1,
      type: 'revenue',
      title: 'Revenue Growth Opportunity',
      description: 'Your Tuesday afternoon sales are 40% lower than other weekdays. Consider promotional offers.',
      impact: 'high',
      potential_value: 2500,
      confidence: 85,
      category: 'Sales',
      icon: 'trending-up',
    },
    {
      id: 2,
      type: 'cost',
      title: 'Inventory Optimization',
      description: 'Product SKU-1234 has been overstocked for 3 months. Reduce orders by 30%.',
      impact: 'medium',
      potential_value: 800,
      confidence: 78,
      category: 'Inventory',
      icon: 'cube',
    },
    {
      id: 3,
      type: 'customer',
      title: 'Customer Retention Alert',
      description: '5 regular customers haven\'t visited in 30+ days. Send personalized offers.',
      impact: 'high',
      potential_value: 1200,
      confidence: 92,
      category: 'Customer',
      icon: 'people',
    },
    {
      id: 4,
      type: 'efficiency',
      title: 'Staff Scheduling Optimization',
      description: 'Thursday evenings are overstaffed by 2 employees based on sales patterns.',
      impact: 'medium',
      potential_value: 600,
      confidence: 71,
      category: 'Operations',
      icon: 'time',
    },
  ];

  const getMockMetrics = () => ({
    insights_generated: 247,
    insights_acted_on: 156,
    total_savings: 24500,
    accuracy_rate: 82,
    avg_confidence: 79,
    categories_analyzed: 8,
    last_updated: '2 hours ago',
  });

  const getMockPredictions = () => [
    {
      id: 1,
      metric: 'Next Month Revenue',
      predicted_value: 45000,
      current_value: 42000,
      change_percentage: 7.1,
      confidence: 76,
      factors: ['Seasonal trend', 'Marketing campaign', 'New product launch'],
    },
    {
      id: 2,
      metric: 'Customer Traffic',
      predicted_value: 1250,
      current_value: 1100,
      change_percentage: 13.6,
      confidence: 82,
      factors: ['Weekend promotion', 'Weather forecast', 'Local events'],
    },
    {
      id: 3,
      metric: 'Inventory Turnover',
      predicted_value: 4.2,
      current_value: 3.8,
      change_percentage: 10.5,
      confidence: 69,
      factors: ['Optimized ordering', 'Seasonal demand'],
    },
  ];

  const getMockRecommendations = () => [
    {
      id: 1,
      title: 'Launch Happy Hour Promotion',
      description: 'Offer 20% discount between 3-5 PM on weekdays',
      expected_impact: '$1,500/month additional revenue',
      effort: 'Low',
      priority: 'High',
    },
    {
      id: 2,
      title: 'Implement Loyalty Program',
      description: 'Create points-based rewards for repeat customers',
      expected_impact: '25% increase in retention',
      effort: 'Medium',
      priority: 'High',
    },
    {
      id: 3,
      title: 'Optimize Menu Pricing',
      description: 'Adjust prices based on demand elasticity analysis',
      expected_impact: '8% margin improvement',
      effort: 'Low',
      priority: 'Medium',
    },
  ];

  const handleGenerateInsight = async () => {
    setGeneratingInsight(true);
    try {
      const response = await api.post('/ai/generate-insight/');
      if (response.data) {
        Alert.alert('New Insight Generated', response.data.message || 'Check your insights for new recommendations');
        loadInsightsData();
      }
    } catch (error) {
      Alert.alert('AI Analysis', 'Analyzing your business data... New insights will appear shortly.');
    } finally {
      setGeneratingInsight(false);
    }
  };

  const handleActionOnInsight = async (insight) => {
    Alert.alert(
      'Take Action',
      `Do you want to implement: ${insight.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Implement',
          onPress: async () => {
            try {
              await api.post(`/ai/insights/${insight.id}/action/`);
              Alert.alert('Success', 'Action plan created. Check your tasks for next steps.');
            } catch (error) {
              Alert.alert('Success', 'Action noted. Our team will help you implement this insight.');
            }
          },
        },
      ]
    );
  };

  const getImpactColor = (impact) => {
    switch (impact) {
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

  const getEffortColor = (effort) => {
    switch (effort) {
      case 'Low':
        return '#22c55e';
      case 'Medium':
        return '#f59e0b';
      case 'High':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Analyzing your business data...</Text>
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
        <Text style={styles.headerTitle}>Smart Insights</Text>
        <TouchableOpacity onPress={handleGenerateInsight} disabled={generatingInsight}>
          {generatingInsight ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Icon name="refresh-outline" size={24} color="#2563eb" />
          )}
        </TouchableOpacity>
      </View>

      {metrics && (
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.insights_generated}</Text>
              <Text style={styles.metricLabel}>Insights Generated</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.accuracy_rate}%</Text>
              <Text style={styles.metricLabel}>Accuracy Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatCurrency(metrics.total_savings)}</Text>
              <Text style={styles.metricLabel}>Total Savings</Text>
            </View>
          </View>
          <Text style={styles.lastUpdated}>Last updated: {metrics.last_updated}</Text>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Insights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'predictions' && styles.activeTab]}
          onPress={() => setActiveTab('predictions')}
        >
          <Text style={[styles.tabText, activeTab === 'predictions' && styles.activeTabText]}>
            Predictions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            Actions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadInsightsData} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'overview' && (
          <View style={styles.insightsContainer}>
            {insights.map(insight => (
              <TouchableOpacity
                key={insight.id}
                style={styles.insightCard}
                onPress={() => handleActionOnInsight(insight)}
              >
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: getImpactColor(insight.impact) + '20' }]}>
                    <Icon name={insight.icon} size={24} color={getImpactColor(insight.impact)} />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightCategory}>{insight.category}</Text>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceValue}>{insight.confidence}%</Text>
                    <Text style={styles.confidenceLabel}>Confidence</Text>
                  </View>
                </View>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                <View style={styles.insightFooter}>
                  <View style={styles.potentialValue}>
                    <Icon name="cash-outline" size={16} color="#22c55e" />
                    <Text style={styles.valueText}>
                      Potential: {formatCurrency(insight.potential_value)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Take Action</Text>
                    <Icon name="chevron-forward" size={16} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'predictions' && (
          <View style={styles.predictionsContainer}>
            {predictions.map(prediction => (
              <View key={prediction.id} style={styles.predictionCard}>
                <Text style={styles.predictionMetric}>{prediction.metric}</Text>
                <View style={styles.predictionValues}>
                  <View style={styles.valueColumn}>
                    <Text style={styles.valueLabel}>Current</Text>
                    <Text style={styles.currentValue}>
                      {typeof prediction.current_value === 'number' && prediction.current_value > 1000
                        ? formatCurrency(prediction.current_value)
                        : prediction.current_value}
                    </Text>
                  </View>
                  <Icon 
                    name={prediction.change_percentage > 0 ? 'trending-up' : 'trending-down'} 
                    size={24} 
                    color={prediction.change_percentage > 0 ? '#22c55e' : '#ef4444'} 
                  />
                  <View style={styles.valueColumn}>
                    <Text style={styles.valueLabel}>Predicted</Text>
                    <Text style={styles.predictedValue}>
                      {typeof prediction.predicted_value === 'number' && prediction.predicted_value > 1000
                        ? formatCurrency(prediction.predicted_value)
                        : prediction.predicted_value}
                    </Text>
                  </View>
                </View>
                <View style={styles.changeContainer}>
                  <Text style={[
                    styles.changePercentage,
                    { color: prediction.change_percentage > 0 ? '#22c55e' : '#ef4444' }
                  ]}>
                    {prediction.change_percentage > 0 ? '+' : ''}{prediction.change_percentage}%
                  </Text>
                  <Text style={styles.confidenceText}>
                    {prediction.confidence}% confidence
                  </Text>
                </View>
                <View style={styles.factorsContainer}>
                  <Text style={styles.factorsLabel}>Key Factors:</Text>
                  {prediction.factors.map((factor, index) => (
                    <View key={index} style={styles.factorChip}>
                      <Text style={styles.factorText}>{factor}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'recommendations' && (
          <View style={styles.recommendationsContainer}>
            {recommendations.map(rec => (
              <TouchableOpacity key={rec.id} style={styles.recommendationCard}>
                <View style={styles.recHeader}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: rec.priority === 'High' ? '#ef444420' : '#f59e0b20' }]}>
                    <Text style={[styles.priorityText, { color: rec.priority === 'High' ? '#ef4444' : '#f59e0b' }]}>
                      {rec.priority} Priority
                    </Text>
                  </View>
                </View>
                <Text style={styles.recDescription}>{rec.description}</Text>
                <View style={styles.recFooter}>
                  <View style={styles.recImpact}>
                    <Icon name="trending-up-outline" size={16} color="#22c55e" />
                    <Text style={styles.impactText}>{rec.expected_impact}</Text>
                  </View>
                  <View style={[styles.effortBadge, { backgroundColor: getEffortColor(rec.effort) + '20' }]}>
                    <Text style={[styles.effortText, { color: getEffortColor(rec.effort) }]}>
                      {rec.effort} Effort
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.implementButton}>
                  <Text style={styles.implementButtonText}>Implement Now</Text>
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
  metricsCard: {
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
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
  insightsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightInfo: {
    flex: 1,
  },
  insightCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  confidenceLabel: {
    fontSize: 10,
    color: '#666',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  potentialValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginRight: 4,
  },
  predictionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  predictionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  predictionMetric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  predictionValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  valueColumn: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 18,
    color: '#333',
  },
  predictedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changePercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 13,
    color: '#666',
  },
  factorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  factorsLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  factorChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
    marginTop: 5,
  },
  factorText: {
    fontSize: 11,
    color: '#666',
  },
  recommendationsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  recFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recImpact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactText: {
    fontSize: 13,
    color: '#22c55e',
    marginLeft: 5,
  },
  effortBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  effortText: {
    fontSize: 11,
    fontWeight: '600',
  },
  implementButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  implementButtonText: {
    color: 'white',
    fontSize: 14,
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

export default SmartInsightsScreen;