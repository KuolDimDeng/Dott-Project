/**
 * Session Performance Metrics API
 * 
 * Collects and aggregates session performance data for monitoring
 * Provides insights into cache performance, response times, and errors
 */

import { NextResponse } from 'next/server';

// In-memory metrics store (in production, use Redis or database)
const metricsStore = {
  sessions: {
    total: 0,
    active: 0,
    created: 0,
    expired: 0,
    errors: 0
  },
  cache: {
    hits: 0,
    misses: 0,
    redis_hits: 0,
    local_hits: 0,
    db_hits: 0,
    hit_rate: 0
  },
  performance: {
    avg_response_time: 0,
    min_response_time: Infinity,
    max_response_time: 0,
    total_requests: 0,
    slow_requests: 0 // > 1000ms
  },
  errors: {
    total: 0,
    by_type: {},
    last_errors: []
  },
  timestamps: {
    started: Date.now(),
    last_reset: Date.now(),
    last_update: Date.now()
  }
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  slow_request: 1000, // ms
  max_error_history: 50,
  metrics_retention: 24 * 60 * 60 * 1000 // 24 hours
};

function updateMetrics(data) {
  const { type, duration, sessionMetrics, timestamp } = data;
  
  metricsStore.timestamps.last_update = timestamp || Date.now();
  
  // Update performance metrics
  if (duration !== undefined) {
    const totalRequests = metricsStore.performance.total_requests;
    metricsStore.performance.avg_response_time = 
      (metricsStore.performance.avg_response_time * totalRequests + duration) / (totalRequests + 1);
    
    metricsStore.performance.min_response_time = Math.min(
      metricsStore.performance.min_response_time, 
      duration
    );
    metricsStore.performance.max_response_time = Math.max(
      metricsStore.performance.max_response_time, 
      duration
    );
    
    metricsStore.performance.total_requests++;
    
    if (duration > PERFORMANCE_THRESHOLDS.slow_request) {
      metricsStore.performance.slow_requests++;
    }
  }
  
  // Update cache metrics
  if (sessionMetrics) {
    metricsStore.cache.hits = sessionMetrics.cacheHits || 0;
    metricsStore.cache.redis_hits = sessionMetrics.redisHits || 0;
    metricsStore.cache.local_hits = sessionMetrics.cacheHits - sessionMetrics.redisHits || 0;
    metricsStore.cache.db_hits = sessionMetrics.dbHits || 0;
    metricsStore.cache.misses = sessionMetrics.cacheMisses || 0;
    metricsStore.cache.hit_rate = sessionMetrics.cacheHitRate || 0;
  }
  
  // Update session counts based on event type
  switch (type) {
    case 'session_created':
      metricsStore.sessions.created++;
      metricsStore.sessions.active++;
      metricsStore.sessions.total++;
      break;
      
    case 'session_logout':
      metricsStore.sessions.active = Math.max(0, metricsStore.sessions.active - 1);
      break;
      
    case 'session_expired':
      metricsStore.sessions.expired++;
      metricsStore.sessions.active = Math.max(0, metricsStore.sessions.active - 1);
      break;
      
    case 'error':
      metricsStore.sessions.errors++;
      metricsStore.errors.total++;
      
      if (sessionMetrics?.lastError) {
        const errorType = sessionMetrics.lastError.split(':')[0] || 'unknown';
        metricsStore.errors.by_type[errorType] = 
          (metricsStore.errors.by_type[errorType] || 0) + 1;
        
        // Store recent errors
        metricsStore.errors.last_errors.unshift({
          error: sessionMetrics.lastError,
          timestamp: timestamp || Date.now(),
          type: errorType
        });
        
        // Limit error history
        if (metricsStore.errors.last_errors.length > PERFORMANCE_THRESHOLDS.max_error_history) {
          metricsStore.errors.last_errors.pop();
        }
      }
      break;
  }
}

function getHealthStatus() {
  const now = Date.now();
  const uptime = now - metricsStore.timestamps.started;
  const timeSinceLastUpdate = now - metricsStore.timestamps.last_update;
  
  // Calculate health score based on various factors
  let healthScore = 100;
  
  // Deduct points for high error rate
  if (metricsStore.performance.total_requests > 0) {
    const errorRate = metricsStore.errors.total / metricsStore.performance.total_requests;
    if (errorRate > 0.05) healthScore -= 30; // 5% error rate threshold
    else if (errorRate > 0.01) healthScore -= 10; // 1% error rate threshold
  }
  
  // Deduct points for slow responses
  if (metricsStore.performance.avg_response_time > 2000) healthScore -= 20;
  else if (metricsStore.performance.avg_response_time > 1000) healthScore -= 10;
  
  // Deduct points for low cache hit rate
  if (metricsStore.cache.hit_rate < 0.5) healthScore -= 20;
  else if (metricsStore.cache.hit_rate < 0.8) healthScore -= 10;
  
  // Deduct points if no recent activity (might indicate issues)
  if (timeSinceLastUpdate > 5 * 60 * 1000) healthScore -= 15; // 5 minutes
  
  return {
    score: Math.max(0, healthScore),
    status: healthScore >= 90 ? 'excellent' : 
            healthScore >= 70 ? 'good' : 
            healthScore >= 50 ? 'fair' : 'poor',
    uptime: uptime,
    lastActivity: timeSinceLastUpdate
  };
}

function generateReport() {
  const health = getHealthStatus();
  const now = Date.now();
  
  return {
    timestamp: now,
    health: health,
    sessions: {
      ...metricsStore.sessions,
      active_percentage: metricsStore.sessions.total > 0 ? 
        (metricsStore.sessions.active / metricsStore.sessions.total) * 100 : 0
    },
    cache: {
      ...metricsStore.cache,
      efficiency: metricsStore.cache.hit_rate * 100,
      redis_percentage: metricsStore.cache.hits > 0 ? 
        (metricsStore.cache.redis_hits / metricsStore.cache.hits) * 100 : 0
    },
    performance: {
      ...metricsStore.performance,
      slow_request_percentage: metricsStore.performance.total_requests > 0 ?
        (metricsStore.performance.slow_requests / metricsStore.performance.total_requests) * 100 : 0,
      requests_per_minute: metricsStore.performance.total_requests / (health.uptime / 60000)
    },
    errors: {
      ...metricsStore.errors,
      error_rate: metricsStore.performance.total_requests > 0 ?
        (metricsStore.errors.total / metricsStore.performance.total_requests) * 100 : 0,
      recent_errors: metricsStore.errors.last_errors.slice(0, 10) // Last 10 errors
    },
    system: {
      uptime: health.uptime,
      memory_usage: process.memoryUsage ? process.memoryUsage() : null,
      node_version: process.version,
      platform: process.platform
    }
  };
}

export async function POST(request) {
  try {
    const data = await request.json();
    updateMetrics(data);
    
    return NextResponse.json({
      success: true,
      received: data.type,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[SessionMetrics] Error recording metrics:', error);
    return NextResponse.json(
      { error: 'Failed to record metrics', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const detailed = url.searchParams.get('detailed') === 'true';
    
    const report = generateReport();
    
    if (!detailed) {
      // Return simplified metrics for dashboards
      const simple = {
        status: report.health.status,
        score: report.health.score,
        active_sessions: report.sessions.active,
        cache_hit_rate: Math.round(report.cache.hit_rate * 100),
        avg_response_time: Math.round(report.performance.avg_response_time),
        error_rate: Math.round(report.errors.error_rate * 100) / 100,
        uptime: report.health.uptime
      };
      
      return NextResponse.json(simple);
    }
    
    if (format === 'prometheus') {
      // Return Prometheus-compatible metrics
      const prometheus = generatePrometheusMetrics(report);
      return new Response(prometheus, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('[SessionMetrics] Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics report', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Reset all metrics
    Object.assign(metricsStore, {
      sessions: { total: 0, active: 0, created: 0, expired: 0, errors: 0 },
      cache: { hits: 0, misses: 0, redis_hits: 0, local_hits: 0, db_hits: 0, hit_rate: 0 },
      performance: { avg_response_time: 0, min_response_time: Infinity, max_response_time: 0, total_requests: 0, slow_requests: 0 },
      errors: { total: 0, by_type: {}, last_errors: [] },
      timestamps: { ...metricsStore.timestamps, last_reset: Date.now() }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[SessionMetrics] Error resetting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to reset metrics', details: error.message },
      { status: 500 }
    );
  }
}

function generatePrometheusMetrics(report) {
  return `
# HELP session_active_count Number of active sessions
# TYPE session_active_count gauge
session_active_count ${report.sessions.active}

# HELP session_total_count Total number of sessions created
# TYPE session_total_count counter
session_total_count ${report.sessions.total}

# HELP session_cache_hit_rate Cache hit rate percentage
# TYPE session_cache_hit_rate gauge
session_cache_hit_rate ${report.cache.hit_rate}

# HELP session_response_time_avg Average response time in milliseconds
# TYPE session_response_time_avg gauge
session_response_time_avg ${report.performance.avg_response_time}

# HELP session_error_rate Error rate percentage
# TYPE session_error_rate gauge
session_error_rate ${report.errors.error_rate}

# HELP session_health_score Overall health score (0-100)
# TYPE session_health_score gauge
session_health_score ${report.health.score}
`.trim();
}