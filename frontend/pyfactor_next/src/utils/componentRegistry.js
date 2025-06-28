/**
 * Component Registry
 * Tracks lightweight and performance-optimized components
 */

export const lightweightComponents = {
  // UI Components
  'StandardSpinner': {
    path: '@/components/ui/StandardSpinner',
    memoryFootprint: 'minimal',
    features: [
      'CSS-only animation',
      'No state management',
      'SVG-based rendering',
      'Zero dependencies'
    ],
    performanceScore: 10
  },
  'CenteredSpinner': {
    path: '@/components/ui/StandardSpinner',
    export: 'CenteredSpinner',
    memoryFootprint: 'minimal',
    features: [
      'Wrapper component',
      'Flexbox centering',
      'Configurable container'
    ],
    performanceScore: 10
  },
  'ButtonSpinner': {
    path: '@/components/ui/StandardSpinner',
    export: 'ButtonSpinner',
    memoryFootprint: 'minimal',
    features: [
      'Inline spinner',
      'Text integration',
      'Button-optimized'
    ],
    performanceScore: 10
  },
  'LoadingScreen': {
    path: '@/components/LoadingScreen',
    memoryFootprint: 'minimal',
    features: [
      'Full-screen loading',
      'Uses StandardSpinner',
      'Minimal DOM nodes'
    ],
    performanceScore: 9
  },
  'FieldTooltip': {
    path: 'Various components',
    memoryFootprint: 'minimal',
    features: [
      'Hover-based rendering',
      'Conditional DOM insertion',
      'Event-driven state'
    ],
    performanceScore: 9
  }
};

export const heavyComponents = {
  'ProductManagement': {
    path: '@/app/dashboard/components/forms/ProductManagement',
    memoryFootprint: 'high',
    optimizations: [
      'Lazy loading',
      'Virtualized tables',
      'Memoized calculations',
      'Debounced search'
    ]
  },
  'AnalyticsDashboard': {
    path: '@/app/dashboard/components/forms/AnalyticsDashboard',
    memoryFootprint: 'medium',
    optimizations: [
      'Lazy chart rendering',
      'Data aggregation caching',
      'Conditional data fetching'
    ]
  },
  'SmartBusiness': {
    path: '@/app/dashboard/components/forms/SmartBusiness',
    memoryFootprint: 'medium',
    optimizations: [
      'Streaming responses',
      'Message history limits',
      'Lazy modal rendering'
    ]
  }
};

/**
 * Get component memory profile
 * @param {string} componentName - Name of the component
 * @returns {Object} Component memory profile
 */
export const getComponentProfile = (componentName) => {
  return lightweightComponents[componentName] || 
         heavyComponents[componentName] || 
         { memoryFootprint: 'unknown' };
};

/**
 * Check if component is lightweight
 * @param {string} componentName - Name of the component
 * @returns {boolean} True if component is lightweight
 */
export const isLightweight = (componentName) => {
  return componentName in lightweightComponents;
};

/**
 * Get optimization recommendations
 * @param {string} componentName - Name of the component
 * @returns {Array} List of optimization recommendations
 */
export const getOptimizationTips = (componentName) => {
  const profile = getComponentProfile(componentName);
  
  if (profile.memoryFootprint === 'minimal') {
    return ['Component is already optimized'];
  }
  
  const tips = [];
  
  if (profile.memoryFootprint === 'high') {
    tips.push(
      'Consider implementing virtualization for large lists',
      'Use React.memo() for expensive renders',
      'Implement pagination for data sets',
      'Lazy load non-critical features'
    );
  }
  
  if (profile.memoryFootprint === 'medium') {
    tips.push(
      'Cache computed values with useMemo',
      'Debounce user inputs',
      'Lazy load heavy dependencies'
    );
  }
  
  return tips;
};

/**
 * Component usage tracker
 */
export const componentUsageTracker = {
  track: (componentName) => {
    if (typeof window === 'undefined') return;
    
    const usage = JSON.parse(
      localStorage.getItem('componentUsage') || '{}'
    );
    
    usage[componentName] = {
      count: (usage[componentName]?.count || 0) + 1,
      lastUsed: new Date().toISOString(),
      profile: getComponentProfile(componentName)
    };
    
    localStorage.setItem('componentUsage', JSON.stringify(usage));
  },
  
  getUsageStats: () => {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('componentUsage') || '{}');
  },
  
  getMostUsed: (limit = 10) => {
    const usage = componentUsageTracker.getUsageStats();
    return Object.entries(usage)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)
      .map(([name, data]) => ({ name, ...data }));
  }
};