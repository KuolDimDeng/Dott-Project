/**
 * Session Management Dashboard API
 * 
 * Provides administrative interface for monitoring session performance,
 * cache efficiency, and system health
 */

import { NextResponse } from 'next/server';

// Dashboard data aggregation
async function getSessionMetrics() {
  try {
    // Get metrics from the session metrics API
    const metricsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/metrics/session?detailed=true`, {
      cache: 'no-store'
    });
    
    const metrics = metricsResponse.ok ? await metricsResponse.json() : null;
    
    // Get cache status
    const cacheResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/cache/session`, {
      cache: 'no-store'
    });
    
    const cacheStatus = cacheResponse.ok ? await cacheResponse.json() : null;
    
    return {
      metrics,
      cacheStatus,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[SessionDashboard] Error fetching metrics:', error);
    return null;
  }
}

async function getSystemHealth() {
  const health = {
    timestamp: Date.now(),
    status: 'unknown',
    services: {
      frontend: { status: 'unknown', responseTime: 0 },
      backend: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
      database: { status: 'unknown', responseTime: 0 }
    },
    metrics: {
      memory: process.memoryUsage ? process.memoryUsage() : null,
      uptime: process.uptime ? process.uptime() : 0,
      cpu: null
    }
  };
  
  // Test frontend health
  try {
    const startTime = Date.now();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/health`, {
      timeout: 5000
    });
    health.services.frontend.responseTime = Date.now() - startTime;
    health.services.frontend.status = response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.services.frontend.status = 'down';
    health.services.frontend.error = error.message;
  }
  
  // Test backend health
  try {
    const startTime = Date.now();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/health/`, {
      timeout: 5000
    });
    health.services.backend.responseTime = Date.now() - startTime;
    health.services.backend.status = response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.services.backend.status = 'down';
    health.services.backend.error = error.message;
  }
  
  // Test Redis health via cache API
  try {
    const startTime = Date.now();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/cache/session`, {
      timeout: 5000
    });
    health.services.redis.responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const cacheData = await response.json();
      health.services.redis.status = cacheData.redisConnected ? 'healthy' : 'fallback';
    } else {
      health.services.redis.status = 'unhealthy';
    }
  } catch (error) {
    health.services.redis.status = 'down';
    health.services.redis.error = error.message;
  }
  
  // Overall health status
  const serviceStatuses = Object.values(health.services).map(s => s.status);
  if (serviceStatuses.every(s => s === 'healthy')) {
    health.status = 'healthy';
  } else if (serviceStatuses.some(s => s === 'healthy')) {
    health.status = 'degraded';
  } else {
    health.status = 'unhealthy';
  }
  
  return health;
}

function generateDashboardHTML(data) {
  const { metrics, cacheStatus, health } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Management Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 { margin-bottom: 0.5rem; }
        .header .subtitle { opacity: 0.9; font-size: 0.9rem; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .grid { display: grid; gap: 1.5rem; }
        .grid-3 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .grid-2 { grid-template-columns: 1fr 1fr; }
        .card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            border: 1px solid #e2e8f0;
        }
        .card h3 {
            margin-bottom: 1rem;
            color: #2d3748;
            font-size: 1.1rem;
            font-weight: 600;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f7fafc;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #4a5568; }
        .metric-value {
            font-weight: 600;
            color: #2d3748;
        }
        .status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        .status.healthy { background: #c6f6d5; color: #22543d; }
        .status.degraded { background: #fed7d7; color: #742a2a; }
        .status.unhealthy { background: #fed7d7; color: #742a2a; }
        .status.down { background: #e2e8f0; color: #4a5568; }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }
        .refresh-btn {
            background: #4299e1;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-left: 1rem;
        }
        .refresh-btn:hover { background: #3182ce; }
        .alert {
            background: #fed7d7;
            border: 1px solid #fc8181;
            color: #742a2a;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1rem;
        }
        .last-updated {
            font-size: 0.85rem;
            color: #718096;
            text-align: right;
            margin-top: 1rem;
        }
        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; }
            .container { padding: 1rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Session Management Dashboard</h1>
        <div class="subtitle">
            Real-time monitoring of session performance, cache efficiency, and system health
            <button class="refresh-btn" onclick="refreshData()">Refresh</button>
        </div>
    </div>
    
    <div class="container">
        ${health?.status === 'unhealthy' ? '<div class="alert">⚠️ System health issues detected. Some services may be experiencing problems.</div>' : ''}
        
        <!-- System Health Overview -->
        <div class="card">
            <h3>System Health</h3>
            <div class="grid grid-2">
                <div>
                    <div class="metric">
                        <span class="metric-label">Overall Status</span>
                        <span class="status ${health?.status || 'unknown'}">${health?.status || 'Unknown'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Frontend</span>
                        <span class="status ${health?.services.frontend.status}">${health?.services.frontend.status} (${health?.services.frontend.responseTime}ms)</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Backend</span>
                        <span class="status ${health?.services.backend.status}">${health?.services.backend.status} (${health?.services.backend.responseTime}ms)</span>
                    </div>
                </div>
                <div>
                    <div class="metric">
                        <span class="metric-label">Redis Cache</span>
                        <span class="status ${health?.services.redis.status}">${health?.services.redis.status} (${health?.services.redis.responseTime}ms)</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value">${Math.floor((health?.metrics.uptime || 0) / 3600)}h ${Math.floor(((health?.metrics.uptime || 0) % 3600) / 60)}m</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Memory Usage</span>
                        <span class="metric-value">${Math.round((health?.metrics.memory?.heapUsed || 0) / 1024 / 1024)}MB</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Session Metrics -->
        <div class="grid grid-3">
            <div class="card">
                <h3>Session Performance</h3>
                <div class="metric">
                    <span class="metric-label">Health Score</span>
                    <span class="metric-value">${metrics?.health?.score || 0}/100</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics?.health?.score || 0}%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Active Sessions</span>
                    <span class="metric-value">${metrics?.sessions?.active || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Created</span>
                    <span class="metric-value">${metrics?.sessions?.total || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Success Rate</span>
                    <span class="metric-value">${metrics?.performance ? ((metrics.performance.total_requests - metrics.errors.total) / metrics.performance.total_requests * 100).toFixed(1) : 0}%</span>
                </div>
            </div>
            
            <div class="card">
                <h3>Cache Performance</h3>
                <div class="metric">
                    <span class="metric-label">Hit Rate</span>
                    <span class="metric-value">${metrics?.cache ? (metrics.cache.hit_rate * 100).toFixed(1) : 0}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics?.cache ? metrics.cache.hit_rate * 100 : 0}%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Redis Hits</span>
                    <span class="metric-value">${metrics?.cache?.redis_hits || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Local Hits</span>
                    <span class="metric-value">${metrics?.cache?.local_hits || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Cache Misses</span>
                    <span class="metric-value">${metrics?.cache?.misses || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Redis Status</span>
                    <span class="status ${cacheStatus?.redisConnected ? 'healthy' : 'degraded'}">${cacheStatus?.redisConnected ? 'Connected' : 'Fallback'}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>Response Times</h3>
                <div class="metric">
                    <span class="metric-label">Average</span>
                    <span class="metric-value">${metrics?.performance ? Math.round(metrics.performance.avg_response_time) : 0}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">95th Percentile</span>
                    <span class="metric-value">${metrics?.performance ? Math.round(metrics.performance.p95 || 0) : 0}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">99th Percentile</span>
                    <span class="metric-value">${metrics?.performance ? Math.round(metrics.performance.p99 || 0) : 0}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Slow Requests</span>
                    <span class="metric-value">${metrics?.performance?.slow_requests || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Requests</span>
                    <span class="metric-value">${metrics?.performance?.total_requests || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Requests/Min</span>
                    <span class="metric-value">${metrics?.performance ? Math.round(metrics.performance.requests_per_minute || 0) : 0}</span>
                </div>
            </div>
        </div>
        
        <!-- Error Analysis -->
        ${metrics?.errors?.total > 0 ? `
        <div class="card">
            <h3>Error Analysis</h3>
            <div class="grid grid-2">
                <div>
                    <div class="metric">
                        <span class="metric-label">Total Errors</span>
                        <span class="metric-value">${metrics.errors.total}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Error Rate</span>
                        <span class="metric-value">${metrics.errors.error_rate.toFixed(2)}%</span>
                    </div>
                </div>
                <div>
                    <h4>Recent Errors:</h4>
                    ${metrics.errors.recent_errors.slice(0, 3).map(err => `
                        <div style="font-size: 0.85rem; margin: 0.25rem 0; color: #e53e3e;">
                            ${err.error} (${new Date(err.timestamp).toLocaleTimeString()})
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="last-updated">
            Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
    
    <script>
        function refreshData() {
            window.location.reload();
        }
        
        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
    </script>
</body>
</html>
  `;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'html';
    
    // Get all dashboard data
    const sessionData = await getSessionMetrics();
    const health = await getSystemHealth();
    
    const dashboardData = {
      ...sessionData,
      health,
      timestamp: Date.now()
    };
    
    if (format === 'json') {
      return NextResponse.json(dashboardData);
    }
    
    if (format === 'html') {
      const html = generateDashboardHTML(dashboardData);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('[SessionDashboard] Error generating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard', details: error.message },
      { status: 500 }
    );
  }
}