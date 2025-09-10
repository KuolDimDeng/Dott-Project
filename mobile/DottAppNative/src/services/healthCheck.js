import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import ENV from '../config/environment';
import axios from 'axios';

const API_BASE_URL = ENV.apiUrl;

class HealthCheckService {
  constructor() {
    this.criticalEndpoints = [
      // Authentication
      { category: 'Auth', method: 'GET', path: '/users/me/', name: 'User Profile' },
      
      // Business Operations
      { category: 'Business', method: 'GET', path: '/business/details/', name: 'Business Details' },
      { category: 'Business', method: 'PATCH', path: '/business/update/', name: 'Business Update', testData: {} },
      { category: 'Business', method: 'GET', path: '/business/register/', name: 'Business Registration' },
      
      // Marketplace
      { category: 'Marketplace', method: 'GET', path: '/marketplace/business/listing/', name: 'Marketplace Listing' },
      { category: 'Marketplace', method: 'GET', path: '/marketplace/consumer/businesses/', name: 'Consumer Businesses' },
      { category: 'Marketplace', method: 'GET', path: '/marketplace/consumer/categories/', name: 'Categories' },
      
      // POS & Transactions
      { category: 'POS', method: 'GET', path: '/sales/pos/transactions/', name: 'POS Transactions' },
      { category: 'POS', method: 'GET', path: '/sales/pos/daily-summary/', name: 'Daily Summary' },
      { category: 'Transactions', method: 'GET', path: '/sales/invoices/', name: 'Invoices' },
      { category: 'Transactions', method: 'GET', path: '/payments/transactions/', name: 'Payment Transactions' },
      
      // Inventory & Menu
      { category: 'Inventory', method: 'GET', path: '/inventory/products/', name: 'Products' },
      { category: 'Menu', method: 'GET', path: '/menu/items/', name: 'Menu Items' },
      
      // Courier Services  
      { category: 'Courier', method: 'GET', path: '/couriers/profile/', name: 'Courier Profile' },
      { category: 'Courier', method: 'GET', path: '/couriers/deliveries/', name: 'Deliveries' },
      
      // Wallet
      { category: 'Wallet', method: 'GET', path: '/api/payments/wallet/balance/', name: 'Wallet Balance' },
      { category: 'Wallet', method: 'GET', path: '/api/payments/wallet/transactions/', name: 'Wallet Transactions' },
    ];
    
    this.healthStatus = {
      lastCheck: null,
      overallHealth: 'unknown',
      services: {},
      connectivity: {},
      performance: {},
    };
  }

  /**
   * Run comprehensive health check
   */
  async runFullHealthCheck() {
    console.log('🏥 Starting comprehensive health check...');
    
    const startTime = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      network: await this.checkNetworkStatus(),
      authentication: await this.checkAuthentication(),
      endpoints: await this.testAllEndpoints(),
      performance: {},
      recommendations: [],
    };
    
    // Calculate performance metrics
    results.performance = {
      totalTime: Date.now() - startTime,
      avgResponseTime: this.calculateAvgResponseTime(results.endpoints),
      failureRate: this.calculateFailureRate(results.endpoints),
    };
    
    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);
    
    // Store results for offline access
    await this.storeHealthCheckResults(results);
    
    console.log('🏥 Health check complete:', results);
    return results;
  }

  /**
   * Check network connectivity
   */
  async checkNetworkStatus() {
    const netInfo = await NetInfo.fetch();
    return {
      isConnected: netInfo.isConnected,
      isInternetReachable: netInfo.isInternetReachable,
      type: netInfo.type,
      details: netInfo.details,
    };
  }

  /**
   * Check authentication status
   */
  async checkAuthentication() {
    try {
      const sessionId = await AsyncStorage.getItem('sessionId');
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const authToken = await AsyncStorage.getItem('authToken');
      
      return {
        hasSession: !!sessionId || !!sessionToken,
        hasAuth: !!authToken,
        isAuthenticated: !!(sessionId || sessionToken || authToken),
      };
    } catch (error) {
      return {
        hasSession: false,
        hasAuth: false,
        isAuthenticated: false,
        error: error.message,
      };
    }
  }

  /**
   * Test all critical endpoints
   */
  async testAllEndpoints() {
    const sessionId = await AsyncStorage.getItem('sessionId');
    
    if (!sessionId) {
      return { error: 'No authentication session found' };
    }
    
    const api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId}`,
      },
    });
    
    // Test endpoints in parallel batches by category
    const categories = [...new Set(this.criticalEndpoints.map(e => e.category))];
    const results = {};
    
    for (const category of categories) {
      const categoryEndpoints = this.criticalEndpoints.filter(e => e.category === category);
      
      results[category] = await Promise.all(
        categoryEndpoints.map(async (endpoint) => {
          const startTime = Date.now();
          
          try {
            let response;
            
            if (endpoint.method === 'GET') {
              response = await api.get(endpoint.path);
            } else if (endpoint.method === 'PATCH' && endpoint.testData) {
              // For PATCH requests, use dry-run or test mode if available
              response = await api.patch(endpoint.path, { ...endpoint.testData, dryRun: true });
            } else if (endpoint.method === 'POST' && endpoint.testData) {
              response = await api.post(endpoint.path, { ...endpoint.testData, dryRun: true });
            }
            
            return {
              name: endpoint.name,
              path: endpoint.path,
              status: 'success',
              statusCode: response?.status,
              responseTime: Date.now() - startTime,
              hasData: !!response?.data,
            };
          } catch (error) {
            return {
              name: endpoint.name,
              path: endpoint.path,
              status: 'failed',
              statusCode: error.response?.status,
              responseTime: Date.now() - startTime,
              error: error.message,
              errorDetail: error.response?.data?.error || error.response?.data?.message,
            };
          }
        })
      );
    }
    
    return results;
  }

  /**
   * Calculate average response time
   */
  calculateAvgResponseTime(endpoints) {
    const times = [];
    
    Object.values(endpoints).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(endpoint => {
          if (endpoint.responseTime) {
            times.push(endpoint.responseTime);
          }
        });
      }
    });
    
    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  /**
   * Calculate failure rate
   */
  calculateFailureRate(endpoints) {
    let total = 0;
    let failed = 0;
    
    Object.values(endpoints).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(endpoint => {
          total++;
          if (endpoint.status === 'failed') {
            failed++;
          }
        });
      }
    });
    
    if (total === 0) return 0;
    return Math.round((failed / total) * 100);
  }

  /**
   * Generate recommendations based on health check results
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    // Network recommendations
    if (!results.network.isInternetReachable) {
      recommendations.push({
        severity: 'critical',
        message: 'No internet connection detected. Check your network settings.',
      });
    }
    
    // Authentication recommendations
    if (!results.authentication.isAuthenticated) {
      recommendations.push({
        severity: 'critical',
        message: 'Not authenticated. Please sign in again.',
      });
    }
    
    // Performance recommendations
    if (results.performance.avgResponseTime > 3000) {
      recommendations.push({
        severity: 'warning',
        message: 'API responses are slow. Consider checking your network connection.',
      });
    }
    
    if (results.performance.failureRate > 20) {
      recommendations.push({
        severity: 'critical',
        message: `High failure rate (${results.performance.failureRate}%). Backend services may be experiencing issues.`,
      });
    }
    
    // Endpoint-specific recommendations
    Object.entries(results.endpoints).forEach(([category, endpoints]) => {
      if (Array.isArray(endpoints)) {
        const failed = endpoints.filter(e => e.status === 'failed');
        
        if (failed.length > 0) {
          failed.forEach(endpoint => {
            if (endpoint.statusCode === 404) {
              recommendations.push({
                severity: 'error',
                category,
                message: `Endpoint not found: ${endpoint.path}. App may need update.`,
              });
            } else if (endpoint.statusCode === 401) {
              recommendations.push({
                severity: 'error',
                category,
                message: `Authentication failed for ${endpoint.name}. Please sign in again.`,
              });
            } else if (endpoint.statusCode === 500) {
              recommendations.push({
                severity: 'error',
                category,
                message: `Server error for ${endpoint.name}. Contact support if persists.`,
              });
            }
          });
        }
      }
    });
    
    return recommendations;
  }

  /**
   * Store health check results for offline access
   */
  async storeHealthCheckResults(results) {
    try {
      const history = await this.getHealthCheckHistory();
      history.unshift(results);
      
      // Keep only last 10 health checks
      if (history.length > 10) {
        history.pop();
      }
      
      await AsyncStorage.setItem('@health_check_history', JSON.stringify(history));
      await AsyncStorage.setItem('@last_health_check', JSON.stringify(results));
    } catch (error) {
      console.error('Error storing health check results:', error);
    }
  }

  /**
   * Get health check history
   */
  async getHealthCheckHistory() {
    try {
      const history = await AsyncStorage.getItem('@health_check_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting health check history:', error);
      return [];
    }
  }

  /**
   * Get last health check results
   */
  async getLastHealthCheck() {
    try {
      const lastCheck = await AsyncStorage.getItem('@last_health_check');
      return lastCheck ? JSON.parse(lastCheck) : null;
    } catch (error) {
      console.error('Error getting last health check:', error);
      return null;
    }
  }

  /**
   * Quick connectivity test (lightweight)
   */
  async quickConnectivityTest() {
    try {
      const sessionId = await AsyncStorage.getItem('sessionId');
      if (!sessionId) return { connected: false, reason: 'No session' };
      
      const response = await axios.get(`${API_BASE_URL}/users/me/`, {
        timeout: 5000,
        headers: {
          'Authorization': `Session ${sessionId}`,
        },
      });
      
      return { 
        connected: response.status === 200, 
        latency: response.headers['x-response-time'] || 'unknown',
      };
    } catch (error) {
      return { 
        connected: false, 
        reason: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Monitor endpoint health in background
   */
  startBackgroundMonitoring(intervalMinutes = 15) {
    // Clear any existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Run initial check
    this.runFullHealthCheck();
    
    // Set up recurring checks
    this.monitoringInterval = setInterval(() => {
      this.runFullHealthCheck();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`🏥 Background health monitoring started (every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop background monitoring
   */
  stopBackgroundMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🏥 Background health monitoring stopped');
    }
  }
}

// Create singleton instance
const healthCheckService = new HealthCheckService();

export default healthCheckService;