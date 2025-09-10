import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import healthCheckService from '../services/healthCheck';

export default function DiagnosticsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    loadLastHealthCheck();
  }, []);

  const loadLastHealthCheck = async () => {
    const lastCheck = await healthCheckService.getLastHealthCheck();
    if (lastCheck) {
      setHealthData(lastCheck);
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const results = await healthCheckService.runFullHealthCheck();
      setHealthData(results);
      
      // Show summary alert
      const failureRate = results.performance?.failureRate || 0;
      if (failureRate === 0) {
        Alert.alert('✅ All Systems Operational', 'All API endpoints are working correctly.');
      } else if (failureRate < 20) {
        Alert.alert('⚠️ Minor Issues Detected', `${failureRate}% of endpoints are experiencing issues.`);
      } else {
        Alert.alert('❌ Major Issues Detected', `${failureRate}% of endpoints are failing. Check recommendations.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to run health check: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await runHealthCheck();
    setRefreshing(false);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <Icon name="checkmark-circle" size={20} color="#10b981" />;
      case 'failed':
        return <Icon name="close-circle" size={20} color="#ef4444" />;
      default:
        return <Icon name="help-circle" size={20} color="#f59e0b" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'error':
        return '#f97316';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>API Diagnostics</Text>
        <TouchableOpacity onPress={runHealthCheck} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#14532d" />
          ) : (
            <Icon name="refresh" size={24} color="#14532d" />
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Status */}
      {healthData && (
        <View style={styles.quickStatus}>
          <View style={styles.statusCard}>
            <Icon 
              name={healthData.network?.isInternetReachable ? "wifi" : "wifi-outline"} 
              size={24} 
              color={healthData.network?.isInternetReachable ? "#10b981" : "#ef4444"} 
            />
            <Text style={styles.statusLabel}>Network</Text>
            <Text style={styles.statusValue}>
              {healthData.network?.isInternetReachable ? 'Connected' : 'Offline'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Icon 
              name={healthData.authentication?.isAuthenticated ? "lock-closed" : "lock-open"} 
              size={24} 
              color={healthData.authentication?.isAuthenticated ? "#10b981" : "#ef4444"} 
            />
            <Text style={styles.statusLabel}>Auth</Text>
            <Text style={styles.statusValue}>
              {healthData.authentication?.isAuthenticated ? 'Valid' : 'Invalid'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Icon name="speedometer-outline" size={24} color="#3b82f6" />
            <Text style={styles.statusLabel}>Avg Response</Text>
            <Text style={styles.statusValue}>
              {healthData.performance?.avgResponseTime || 0}ms
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Icon 
              name="warning-outline" 
              size={24} 
              color={healthData.performance?.failureRate > 0 ? "#f59e0b" : "#10b981"} 
            />
            <Text style={styles.statusLabel}>Failure Rate</Text>
            <Text style={styles.statusValue}>
              {healthData.performance?.failureRate || 0}%
            </Text>
          </View>
        </View>
      )}

      {/* Endpoint Results */}
      {healthData?.endpoints && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endpoint Status</Text>
          
          {Object.entries(healthData.endpoints).map(([category, endpoints]) => (
            <View key={category} style={styles.categoryContainer}>
              <TouchableOpacity 
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.categoryStats}>
                  {Array.isArray(endpoints) && (
                    <Text style={styles.categoryCount}>
                      {endpoints.filter(e => e.status === 'success').length}/{endpoints.length}
                    </Text>
                  )}
                  <Icon 
                    name={expandedCategories[category] ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </View>
              </TouchableOpacity>
              
              {expandedCategories[category] && Array.isArray(endpoints) && (
                <View style={styles.endpointList}>
                  {endpoints.map((endpoint, index) => (
                    <View key={index} style={styles.endpointItem}>
                      {getStatusIcon(endpoint.status)}
                      <View style={styles.endpointDetails}>
                        <Text style={styles.endpointName}>{endpoint.name}</Text>
                        <Text style={styles.endpointPath}>{endpoint.path}</Text>
                        {endpoint.error && (
                          <Text style={styles.endpointError}>{endpoint.errorDetail || endpoint.error}</Text>
                        )}
                      </View>
                      <View style={styles.endpointMeta}>
                        <Text style={styles.responseTime}>{endpoint.responseTime}ms</Text>
                        {endpoint.statusCode && (
                          <Text style={[
                            styles.statusCode,
                            endpoint.status === 'failed' && styles.statusCodeError
                          ]}>
                            {endpoint.statusCode}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {healthData?.recommendations && healthData.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {healthData.recommendations.map((rec, index) => (
            <View 
              key={index} 
              style={[
                styles.recommendation,
                { borderLeftColor: getSeverityColor(rec.severity) }
              ]}
            >
              <Icon 
                name={rec.severity === 'critical' ? 'alert-circle' : 'information-circle'} 
                size={20} 
                color={getSeverityColor(rec.severity)} 
              />
              <Text style={styles.recommendationText}>{rec.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Last Check Time */}
      {healthData?.timestamp && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last checked: {new Date(healthData.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Run Test Button */}
      {!healthData && (
        <View style={styles.emptyState}>
          <Icon name="pulse-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No health check data available</Text>
          <TouchableOpacity 
            style={styles.runButton}
            onPress={runHealthCheck}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.runButtonText}>Run Health Check</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  quickStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    backgroundColor: '#fff',
    marginTop: 1,
  },
  statusCard: {
    width: '50%',
    padding: 8,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  categoryContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  endpointList: {
    backgroundColor: '#fff',
  },
  endpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  endpointDetails: {
    flex: 1,
    marginLeft: 12,
  },
  endpointName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  endpointPath: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  endpointError: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 2,
  },
  endpointMeta: {
    alignItems: 'flex-end',
  },
  responseTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 2,
  },
  statusCodeError: {
    color: '#ef4444',
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 24,
  },
  runButton: {
    backgroundColor: '#14532d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  runButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});