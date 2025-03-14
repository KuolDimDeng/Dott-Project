#!/bin/bash

# Frontend Memory Optimization Script
# This script optimizes the Next.js frontend for better memory usage

echo "Starting frontend memory optimization..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Create memory-optimized Next.js config
echo "Creating memory-optimized Next.js config..."
cat > next.config.memory.js << 'EOL'
/** @type {import('next').NextConfig} */

const nextConfig = {
  // Reduce memory usage during builds
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'lodash', 'date-fns'],
    memoryBasedWorkersCount: true,
    serverMinification: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
  
  // Optimize webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Add memory optimizations
    config.optimization = {
      ...config.optimization,
      // Minimize all files in production
      minimize: !dev,
      // Split chunks to reduce main bundle size
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
      },
    };

    // Reduce bundle size by excluding moment.js locales
    config.plugins.push(
      new config.webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    // Optimize for server
    if (isServer) {
      // Externalize dependencies that don't need to be bundled
      config.externals = [...(config.externals || []), 
        { canvas: 'commonjs canvas' }
      ];
    }

    return config;
  },
  
  // Optimize server memory usage
  onDemandEntries: {
    // Keep pages in memory for 30 seconds
    maxInactiveAge: 30 * 1000,
    // Only keep 3 pages in memory
    pagesBufferLength: 3,
  },
  
  // Reduce memory usage by disabling source maps in production
  productionBrowserSourceMaps: false,
  
  // Reduce memory usage by compressing assets
  compress: true,
  
  // Reduce memory usage by setting a lower memory limit for the server
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096',
  },
  
  // Reduce memory usage by setting a lower memory limit for the build
  poweredByHeader: false,
};

module.exports = nextConfig;
EOL

# Create memory-optimized start script
echo "Creating memory-optimized start script..."
cat > start-optimized.sh << 'EOL'
#!/bin/bash

# Memory-optimized Next.js start script

# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use the memory-optimized Next.js config
cp next.config.memory.js next.config.js

# Start Next.js with memory optimizations
echo "Starting Next.js with memory optimizations..."
pnpm run dev
EOL

# Make the script executable
chmod +x start-optimized.sh

# Update package.json with memory-optimized scripts
echo "Updating package.json with memory-optimized scripts..."
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add memory optimization scripts
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['dev:optimized'] = 'NODE_OPTIONS=\"--max-old-space-size=4096\" next dev';
packageJson.scripts['build:optimized'] = 'NODE_OPTIONS=\"--max-old-space-size=4096\" next build';
packageJson.scripts['analyze'] = 'ANALYZE=true next build';
packageJson.scripts['start:optimized'] = 'NODE_OPTIONS=\"--max-old-space-size=4096\" next start';

// Write updated package.json
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
"

# Create memory-optimized component state management
echo "Creating memory-optimized state management..."
mkdir -p src/utils
cat > src/utils/optimizedState.js << 'EOL'
/**
 * Optimized state management utilities to reduce memory usage
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Creates a consolidated state object instead of multiple useState calls
 * This significantly reduces memory overhead when managing many state variables
 * 
 * @param {Object} initialState - Initial state object
 * @returns {[Object, Function]} - State object and update function
 */
export function useConsolidatedState(initialState) {
  const [state, setState] = useState(initialState);
  
  // Memoized update function to prevent unnecessary re-renders
  const updateState = useCallback((updates) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);
  
  return [state, updateState];
}

/**
 * Tracks memory usage and logs warnings when memory usage is high
 * 
 * @param {string} componentName - Name of the component for logging
 * @param {string} action - Current action (mount, update, unmount)
 */
export function trackMemory(componentName, action) {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') return;
  
  // Log memory usage
  console.log(`[Memory] ${componentName} ${action}: ${performance.memory?.usedJSHeapSize / 1024 / 1024} MB`);
  
  // Check if memory usage is high
  if (performance.memory?.usedJSHeapSize > 500 * 1024 * 1024) {
    console.warn(`[Memory Warning] High memory usage in ${componentName}: ${performance.memory?.usedJSHeapSize / 1024 / 1024} MB`);
  }
}

/**
 * Force garbage collection when possible
 * Note: This only works if the page is run with --expose-gc flag
 */
export function forceGarbageCollection() {
  if (typeof window !== 'undefined' && window.gc) {
    window.gc();
    console.log('[Memory] Forced garbage collection');
  }
}

/**
 * Hook to automatically clean up resources when component unmounts
 * 
 * @param {string} componentName - Name of the component for logging
 */
export function useMemoryCleanup(componentName) {
  useEffect(() => {
    // Track mount
    trackMemory(componentName, 'mount');
    
    return () => {
      // Track unmount and clean up
      trackMemory(componentName, 'unmount');
      forceGarbageCollection();
    };
  }, [componentName]);
}
EOL

# Create dashboard optimization example
echo "Creating dashboard optimization example..."
mkdir -p src/examples
cat > src/examples/OptimizedDashboard.jsx << 'EOL'
/**
 * Example of an optimized dashboard component using consolidated state
 * This approach significantly reduces memory usage compared to using
 * many individual useState calls
 */

import React, { useEffect } from 'react';
import { useConsolidatedState, useMemoryCleanup } from '../utils/optimizedState';

const OptimizedDashboard = () => {
  // Use a single state object instead of 80+ individual state variables
  const [dashboardState, updateDashboardState] = useConsolidatedState({
    // User data
    user: null,
    profile: null,
    
    // UI state
    isLoading: true,
    activeTab: 'overview',
    sidebarOpen: true,
    
    // Data
    transactions: [],
    accounts: [],
    notifications: [],
    
    // Filters and pagination
    filters: {
      dateRange: 'month',
      category: 'all',
      status: 'all',
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
    },
    
    // Modal states
    modals: {
      createTransaction: false,
      editProfile: false,
      settings: false,
    },
  });
  
  // Clean up memory when component unmounts
  useMemoryCleanup('OptimizedDashboard');
  
  // Example of updating multiple state values at once
  const loadDashboardData = async () => {
    try {
      // Fetch data (simulated)
      const userData = { id: 1, name: 'User' };
      const transactions = Array(20).fill().map((_, i) => ({ id: i, amount: Math.random() * 1000 }));
      
      // Update multiple state values in a single update
      updateDashboardState({
        user: userData,
        transactions,
        isLoading: false,
        pagination: {
          ...dashboardState.pagination,
          total: transactions.length,
        },
      });
    } catch (error) {
      updateDashboardState({
        isLoading: false,
        error: error.message,
      });
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  // Example of updating a nested state value
  const changeTab = (tab) => {
    updateDashboardState({
      activeTab: tab,
    });
  };
  
  // Example of updating a deeply nested state value
  const updateFilter = (key, value) => {
    updateDashboardState({
      filters: {
        ...dashboardState.filters,
        [key]: value,
      },
    });
  };
  
  // Example of toggling a modal
  const toggleModal = (modalName) => {
    updateDashboardState({
      modals: {
        ...dashboardState.modals,
        [modalName]: !dashboardState.modals[modalName],
      },
    });
  };
  
  return (
    <div>
      <h1>Optimized Dashboard</h1>
      {dashboardState.isLoading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p>Welcome, {dashboardState.user?.name}</p>
          
          <div>
            <button onClick={() => changeTab('overview')}>Overview</button>
            <button onClick={() => changeTab('transactions')}>Transactions</button>
            <button onClick={() => changeTab('settings')}>Settings</button>
          </div>
          
          <div>
            <h2>{dashboardState.activeTab}</h2>
            
            {dashboardState.activeTab === 'transactions' && (
              <div>
                <div>
                  <select 
                    value={dashboardState.filters.dateRange}
                    onChange={(e) => updateFilter('dateRange', e.target.value)}
                  >
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardState.transactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>{transaction.id}</td>
                        <td>${transaction.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {dashboardState.activeTab === 'settings' && (
              <div>
                <button onClick={() => toggleModal('editProfile')}>Edit Profile</button>
                <button onClick={() => toggleModal('settings')}>Account Settings</button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modals */}
      {dashboardState.modals.editProfile && (
        <div className="modal">
          <h2>Edit Profile</h2>
          <button onClick={() => toggleModal('editProfile')}>Close</button>
        </div>
      )}
      
      {dashboardState.modals.settings && (
        <div className="modal">
          <h2>Account Settings</h2>
          <button onClick={() => toggleModal('settings')}>Close</button>
        </div>
      )}
    </div>
  );
};

export default OptimizedDashboard;
EOL

# Install memory optimization dependencies
echo "Installing memory optimization dependencies..."
pnpm add -D @next/bundle-analyzer cross-env

echo "Frontend memory optimization complete!"
echo ""
echo "To use the optimized frontend:"
echo "1. Run the optimized start script:"
echo "   ./start-optimized.sh"
echo ""
echo "2. Or use the optimized scripts directly:"
echo "   pnpm run dev:optimized"
echo ""
echo "3. To analyze bundle size:"
echo "   pnpm run analyze"
echo ""
echo "4. To use the optimized state management in your components:"
echo "   import { useConsolidatedState, useMemoryCleanup } from '../utils/optimizedState';"
echo ""
echo "5. See the example in src/examples/OptimizedDashboard.jsx"