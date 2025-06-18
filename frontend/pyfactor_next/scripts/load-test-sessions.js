#!/usr/bin/env node

/**
 * Session Load Testing Script
 * 
 * Tests the new session management system under load to ensure it can handle
 * increased traffic with Redis caching and performance monitoring.
 * 
 * Usage:
 * node scripts/load-test-sessions.js [options]
 * 
 * Options:
 * --users=100        Number of concurrent users (default: 50)
 * --duration=300     Test duration in seconds (default: 60)
 * --rampup=30        Ramp-up time in seconds (default: 10)
 * --target=prod      Target environment: local, staging, prod (default: local)
 * --scenarios=all    Test scenarios: auth, session, mixed, all (default: mixed)
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Configuration
const CONFIG = {
  users: parseInt(process.argv.find(arg => arg.startsWith('--users='))?.split('=')[1]) || 50,
  duration: parseInt(process.argv.find(arg => arg.startsWith('--duration='))?.split('=')[1]) || 60,
  rampup: parseInt(process.argv.find(arg => arg.startsWith('--rampup='))?.split('=')[1]) || 10,
  target: process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'local',
  scenarios: process.argv.find(arg => arg.startsWith('--scenarios='))?.split('=')[1] || 'mixed'
};

// Environment URLs
const ENVIRONMENTS = {
  local: 'http://localhost:3000',
  staging: 'https://staging.dottapps.com',
  prod: 'https://dottapps.com'
};

const BASE_URL = ENVIRONMENTS[CONFIG.target];

// Test data
const TEST_USERS = Array.from({ length: CONFIG.users }, (_, i) => ({
  email: `loadtest${i}@example.com`,
  password: 'LoadTest123!',
  sessionId: null,
  cookies: null
}));

// Metrics collection
const metrics = {
  requests: {
    total: 0,
    success: 0,
    failed: 0,
    by_endpoint: {}
  },
  response_times: {
    min: Infinity,
    max: 0,
    avg: 0,
    p95: 0,
    p99: 0,
    samples: []
  },
  errors: {
    by_status: {},
    by_type: {},
    details: []
  },
  sessions: {
    created: 0,
    validated: 0,
    expired: 0,
    cache_hits: 0,
    cache_misses: 0
  },
  timestamps: {
    start: Date.now(),
    end: null
  }
};

// Test scenarios
const SCENARIOS = {
  auth: {
    name: 'Authentication Load Test',
    weight: 1.0,
    actions: ['login', 'session_check', 'logout']
  },
  session: {
    name: 'Session Management Load Test',
    weight: 1.0,
    actions: ['session_check', 'session_refresh', 'cache_test']
  },
  mixed: {
    name: 'Mixed Workload Test',
    weight: 1.0,
    actions: ['login', 'session_check', 'api_call', 'session_refresh', 'logout']
  }
};

// Utility functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function recordMetric(endpoint, duration, success, statusCode, error = null) {
  metrics.requests.total++;
  
  if (!metrics.requests.by_endpoint[endpoint]) {
    metrics.requests.by_endpoint[endpoint] = { total: 0, success: 0, failed: 0, avg_time: 0 };
  }
  
  const endpointMetrics = metrics.requests.by_endpoint[endpoint];
  endpointMetrics.total++;
  endpointMetrics.avg_time = (endpointMetrics.avg_time * (endpointMetrics.total - 1) + duration) / endpointMetrics.total;
  
  if (success) {
    metrics.requests.success++;
    endpointMetrics.success++;
  } else {
    metrics.requests.failed++;
    endpointMetrics.failed++;
    
    if (!metrics.errors.by_status[statusCode]) {
      metrics.errors.by_status[statusCode] = 0;
    }
    metrics.errors.by_status[statusCode]++;
    
    if (error) {
      const errorType = error.code || error.type || 'unknown';
      if (!metrics.errors.by_type[errorType]) {
        metrics.errors.by_type[errorType] = 0;
      }
      metrics.errors.by_type[errorType]++;
      
      metrics.errors.details.push({
        endpoint,
        error: error.message,
        statusCode,
        timestamp: Date.now()
      });
      
      // Limit error details
      if (metrics.errors.details.length > 100) {
        metrics.errors.details.shift();
      }
    }
  }
  
  // Update response time metrics
  metrics.response_times.samples.push(duration);
  metrics.response_times.min = Math.min(metrics.response_times.min, duration);
  metrics.response_times.max = Math.max(metrics.response_times.max, duration);
  
  const total = metrics.requests.total;
  metrics.response_times.avg = (metrics.response_times.avg * (total - 1) + duration) / total;
  
  // Calculate percentiles every 100 samples
  if (metrics.response_times.samples.length % 100 === 0) {
    const sorted = [...metrics.response_times.samples].sort((a, b) => a - b);
    const len = sorted.length;
    metrics.response_times.p95 = sorted[Math.floor(len * 0.95)];
    metrics.response_times.p99 = sorted[Math.floor(len * 0.99)];
  }
}

// HTTP client with metrics
async function makeRequest(url, options = {}, endpoint = 'unknown') {
  const startTime = performance.now();
  let response = null;
  let error = null;
  
  try {
    response = await fetch(url, {
      timeout: 30000,
      ...options
    });
    
    const duration = performance.now() - startTime;
    const success = response.ok;
    
    recordMetric(endpoint, duration, success, response.status);
    
    if (!success) {
      const errorText = await response.text().catch(() => 'Unknown error');
      error = new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return { response, error, duration };
  } catch (err) {
    const duration = performance.now() - startTime;
    recordMetric(endpoint, duration, false, 0, err);
    return { response: null, error: err, duration };
  }
}

// Test actions
const ACTIONS = {
  async login(user) {
    const { response, error } = await makeRequest(`${BASE_URL}/api/auth/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    }, 'auth/login');
    
    if (response && response.ok) {
      const authData = await response.json();
      
      // Create session
      const sessionResult = await makeRequest(`${BASE_URL}/api/auth/session-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      }, 'session/create');
      
      if (sessionResult.response && sessionResult.response.ok) {
        user.cookies = sessionResult.response.headers.get('set-cookie');
        metrics.sessions.created++;
        return true;
      }
    }
    
    return false;
  },
  
  async session_check(user) {
    if (!user.cookies) return false;
    
    const { response, error } = await makeRequest(`${BASE_URL}/api/auth/session-v2`, {
      method: 'GET',
      headers: { 'Cookie': user.cookies }
    }, 'session/check');
    
    if (response && response.ok) {
      const sessionData = await response.json();
      metrics.sessions.validated++;
      
      // Check if response came from cache
      const cacheHeader = response.headers.get('x-cache-status');
      if (cacheHeader === 'hit') {
        metrics.sessions.cache_hits++;
      } else {
        metrics.sessions.cache_misses++;
      }
      
      return true;
    }
    
    return false;
  },
  
  async session_refresh(user) {
    if (!user.cookies) return false;
    
    const { response } = await makeRequest(`${BASE_URL}/api/auth/session-v2`, {
      method: 'PATCH',
      headers: { 
        'Cookie': user.cookies,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'refresh' })
    }, 'session/refresh');
    
    return response && response.ok;
  },
  
  async api_call(user) {
    if (!user.cookies) return false;
    
    const { response } = await makeRequest(`${BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: { 'Cookie': user.cookies }
    }, 'api/profile');
    
    return response && response.ok;
  },
  
  async cache_test(user) {
    // Test cache performance by making rapid successive calls
    const promises = Array.from({ length: 5 }, () => 
      makeRequest(`${BASE_URL}/api/auth/session-v2`, {
        method: 'GET',
        headers: { 'Cookie': user.cookies }
      }, 'session/cache_test')
    );
    
    const results = await Promise.all(promises);
    return results.every(r => r.response && r.response.ok);
  },
  
  async logout(user) {
    if (!user.cookies) return false;
    
    const { response } = await makeRequest(`${BASE_URL}/api/auth/session-v2`, {
      method: 'DELETE',
      headers: { 'Cookie': user.cookies }
    }, 'session/logout');
    
    if (response && response.ok) {
      user.cookies = null;
      user.sessionId = null;
      return true;
    }
    
    return false;
  }
};

// Test runner
class LoadTestRunner {
  constructor() {
    this.activeUsers = new Set();
    this.isRunning = false;
    this.startTime = null;
  }
  
  async runScenario(user, scenario) {
    const actions = SCENARIOS[scenario].actions;
    
    for (const actionName of actions) {
      if (!this.isRunning) break;
      
      const action = ACTIONS[actionName];
      if (action) {
        try {
          await action(user);
          // Random delay between actions (100-500ms)
          await this.sleep(100 + Math.random() * 400);
        } catch (error) {
          log(`Action ${actionName} failed for user ${user.email}: ${error.message}`, 'ERROR');
        }
      }
    }
  }
  
  async runUser(user, scenario) {
    this.activeUsers.add(user.email);
    
    try {
      while (this.isRunning) {
        await this.runScenario(user, scenario);
        
        // Wait before next scenario iteration
        await this.sleep(1000 + Math.random() * 2000);
      }
    } catch (error) {
      log(`User ${user.email} encountered error: ${error.message}`, 'ERROR');
    } finally {
      this.activeUsers.delete(user.email);
    }
  }
  
  async start() {
    log(`Starting load test with ${CONFIG.users} users for ${CONFIG.duration}s`);
    log(`Target: ${BASE_URL}`);
    log(`Scenario: ${CONFIG.scenarios}`);
    log(`Ramp-up: ${CONFIG.rampup}s`);
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Start users with ramp-up
    const rampupDelay = (CONFIG.rampup * 1000) / CONFIG.users;
    const scenario = CONFIG.scenarios === 'all' ? 'mixed' : CONFIG.scenarios;
    
    for (let i = 0; i < CONFIG.users; i++) {
      if (!this.isRunning) break;
      
      const user = TEST_USERS[i];
      this.runUser(user, scenario);
      
      if (i < CONFIG.users - 1) {
        await this.sleep(rampupDelay);
      }
    }
    
    log(`All ${CONFIG.users} users started, running for ${CONFIG.duration}s`);
    
    // Run for specified duration
    await this.sleep(CONFIG.duration * 1000);
    
    // Stop test
    await this.stop();
  }
  
  async stop() {
    log('Stopping load test...');
    this.isRunning = false;
    
    // Wait for users to finish
    let waitCount = 0;
    while (this.activeUsers.size > 0 && waitCount < 30) {
      await this.sleep(1000);
      waitCount++;
      log(`Waiting for ${this.activeUsers.size} users to finish...`);
    }
    
    metrics.timestamps.end = Date.now();
    
    // Generate report
    this.generateReport();
  }
  
  generateReport() {
    const duration = (metrics.timestamps.end - metrics.timestamps.start) / 1000;
    const totalRequests = metrics.requests.total;
    const successRate = totalRequests > 0 ? (metrics.requests.success / totalRequests) * 100 : 0;
    const cacheHitRate = (metrics.sessions.cache_hits + metrics.sessions.cache_misses) > 0 ?
      (metrics.sessions.cache_hits / (metrics.sessions.cache_hits + metrics.sessions.cache_misses)) * 100 : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Test Duration: ${duration.toFixed(1)}s`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Users: ${CONFIG.users}`);
    console.log(`Scenario: ${CONFIG.scenarios}`);
    console.log();
    
    console.log('REQUESTS:');
    console.log(`  Total: ${totalRequests}`);
    console.log(`  Successful: ${metrics.requests.success} (${successRate.toFixed(1)}%)`);
    console.log(`  Failed: ${metrics.requests.failed} (${(100 - successRate).toFixed(1)}%)`);
    console.log(`  Rate: ${(totalRequests / duration).toFixed(1)} req/s`);
    console.log();
    
    console.log('RESPONSE TIMES:');
    console.log(`  Average: ${metrics.response_times.avg.toFixed(1)}ms`);
    console.log(`  Min: ${metrics.response_times.min.toFixed(1)}ms`);
    console.log(`  Max: ${metrics.response_times.max.toFixed(1)}ms`);
    console.log(`  95th percentile: ${metrics.response_times.p95.toFixed(1)}ms`);
    console.log(`  99th percentile: ${metrics.response_times.p99.toFixed(1)}ms`);
    console.log();
    
    console.log('SESSIONS:');
    console.log(`  Created: ${metrics.sessions.created}`);
    console.log(`  Validated: ${metrics.sessions.validated}`);
    console.log(`  Cache Hits: ${metrics.sessions.cache_hits}`);
    console.log(`  Cache Misses: ${metrics.sessions.cache_misses}`);
    console.log(`  Cache Hit Rate: ${cacheHitRate.toFixed(1)}%`);
    console.log();
    
    if (Object.keys(metrics.requests.by_endpoint).length > 0) {
      console.log('BY ENDPOINT:');
      Object.entries(metrics.requests.by_endpoint).forEach(([endpoint, stats]) => {
        const rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
        console.log(`  ${endpoint}:`);
        console.log(`    Requests: ${stats.total}`);
        console.log(`    Success Rate: ${rate.toFixed(1)}%`);
        console.log(`    Avg Response: ${stats.avg_time.toFixed(1)}ms`);
      });
      console.log();
    }
    
    if (Object.keys(metrics.errors.by_status).length > 0) {
      console.log('ERRORS BY STATUS:');
      Object.entries(metrics.errors.by_status).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      console.log();
    }
    
    // Performance assessment
    console.log('PERFORMANCE ASSESSMENT:');
    const assessment = this.assessPerformance(successRate, metrics.response_times.avg, cacheHitRate);
    console.log(`  Overall Score: ${assessment.score}/100`);
    console.log(`  Grade: ${assessment.grade}`);
    console.log(`  Recommendations:`);
    assessment.recommendations.forEach(rec => {
      console.log(`    - ${rec}`);
    });
    
    console.log('='.repeat(80));
  }
  
  assessPerformance(successRate, avgResponseTime, cacheHitRate) {
    let score = 100;
    const recommendations = [];
    
    // Success rate assessment
    if (successRate < 99) {
      score -= 20;
      recommendations.push('Improve error handling and reliability');
    } else if (successRate < 99.5) {
      score -= 10;
      recommendations.push('Minor reliability improvements needed');
    }
    
    // Response time assessment
    if (avgResponseTime > 1000) {
      score -= 25;
      recommendations.push('Optimize response times - target < 500ms');
    } else if (avgResponseTime > 500) {
      score -= 15;
      recommendations.push('Response times could be improved');
    }
    
    // Cache hit rate assessment
    if (cacheHitRate < 70) {
      score -= 20;
      recommendations.push('Improve cache strategy - target > 80% hit rate');
    } else if (cacheHitRate < 80) {
      score -= 10;
      recommendations.push('Cache performance could be optimized');
    }
    
    // Session performance
    const sessionCreateRate = metrics.sessions.created / (metrics.timestamps.end - metrics.timestamps.start) * 1000;
    if (sessionCreateRate < 10) {
      score -= 15;
      recommendations.push('Session creation rate is low');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent!');
    }
    
    const grade = score >= 90 ? 'A' : 
                  score >= 80 ? 'B' : 
                  score >= 70 ? 'C' : 
                  score >= 60 ? 'D' : 'F';
    
    return { score: Math.max(0, score), grade, recommendations };
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Signal handling
process.on('SIGINT', () => {
  log('Received SIGINT, stopping test...', 'WARN');
  if (global.testRunner) {
    global.testRunner.stop();
  }
  process.exit(0);
});

// Main execution
async function main() {
  try {
    log('Session Load Testing Tool v1.0');
    log('====================================');
    
    // Validate environment
    try {
      const { response } = await makeRequest(`${BASE_URL}/api/health`, {}, 'health');
      if (!response || !response.ok) {
        throw new Error(`Target environment ${BASE_URL} is not accessible`);
      }
      log(`✓ Target environment ${BASE_URL} is accessible`);
    } catch (error) {
      log(`✗ Cannot connect to ${BASE_URL}: ${error.message}`, 'ERROR');
      process.exit(1);
    }
    
    // Start load test
    const runner = new LoadTestRunner();
    global.testRunner = runner;
    
    await runner.start();
    
  } catch (error) {
    log(`Load test failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { LoadTestRunner, ACTIONS, metrics };