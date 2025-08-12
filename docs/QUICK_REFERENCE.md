# 🚀 Quick Reference Guide

## Architecture Cheat Sheet

### File Locations

```bash
# Domain Components
src/domains/{domain}/components/     # UI components
src/domains/{domain}/hooks/          # Business logic
src/domains/{domain}/services/       # API calls

# Shared Resources
src/shared/components/               # Reusable UI
src/shared/services/                 # API services
src/shared/icons/                    # Icon library

# Router System
src/app/dashboard/router/            # Dashboard routing
```

### Common Imports

```javascript
// Icons
import { Dashboard, Analytics } from '@/shared/icons';
import { NavIcons } from '@/shared/icons/nav';

// Services
import { productService } from '@/domains/products/services/productService';
import { apiService } from '@/shared/services/apiService';

// Components
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { StandardSpinner } from '@/components/ui/StandardSpinner';

// Monitoring
import { performanceMonitor, errorTracker } from '@/utils/monitoring';
```

### Component Template

```javascript
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { performanceMonitor } from '@/utils/monitoring';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);
  
  // Memoized calculations
  const computedValue = useMemo(() => {
    return performanceMonitor.measureComponent('MyComponent.compute', () => {
      // Expensive calculation
    });
  }, [dependency]);
  
  return (
    <ErrorBoundary name="MyComponent">
      {/* Component JSX */}
    </ErrorBoundary>
  );
};

export default MyComponent;
```

### Service Template

```javascript
import { apiService } from '@/shared/services/apiService';

export const myService = {
  async getAll(params = {}) {
    return apiService.get('/endpoint', params);
  },
  
  async getById(id) {
    return apiService.get(`/endpoint/${id}`);
  },
  
  async create(data) {
    return apiService.post('/endpoint', data);
  },
  
  async update(id, data) {
    return apiService.put(`/endpoint/${id}`, data);
  },
  
  async delete(id) {
    return apiService.delete(`/endpoint/${id}`);
  }
};
```

### Hook Template

```javascript
import { useState, useEffect, useCallback } from 'react';
import { myService } from '../services/myService';
import { errorTracker } from '@/utils/monitoring';

export const useMyData = (id) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await myService.getById(id);
      setData(result);
    } catch (err) {
      setError(err);
      errorTracker.trackError(err, { context: 'useMyData' });
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
};
```

### Adding a New Route

```javascript
// 1. Add to routeRegistry.js
export const routeRegistry = {
  // ... existing routes
  'my-feature': {
    component: lazy(() => import('@/domains/myfeature/components/MyFeature')),
    title: 'My Feature',
    description: 'Description of my feature'
  }
};

// 2. Component will auto-load when view='my-feature'
```

### Error Handling Pattern

```javascript
try {
  // Operation
  const result = await someAsyncOperation();
  notifySuccess('Operation successful');
  return result;
} catch (error) {
  // User notification
  notifyError('Operation failed');
  
  // Error tracking
  errorTracker.trackError(error, {
    context: 'operation_name',
    userId: user?.id,
    metadata: { /* additional data */ }
  });
  
  // Re-throw if needed
  throw error;
}
```

### Performance Optimization

```javascript
// 1. Memoize expensive renders
const ExpensiveComponent = memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return prevProps.data.id === nextProps.data.id;
});

// 2. Memoize calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// 3. Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 4. Track performance
performanceMonitor.measureComponent('ComponentName', () => {
  // Render logic
});
```

### Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm test                   # Run tests

# Architecture
pnpm run analyze            # Analyze bundle size
pnpm run check:large-files  # Find large files

# Deployment
git add .
git commit -m "feat: description"
git push origin main
```

### Debugging

```javascript
// Enable performance monitor
localStorage.setItem('isAdmin', 'true');
// Press Ctrl+Shift+P to toggle dashboard

// Check architecture health
console.log(buildHealthMonitor.checkArchitecture());

// Memory usage
console.log(performanceMonitor.trackMemoryUsage());

// Bundle size
console.log(buildHealthMonitor.trackBundleSize());
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Build out of memory | Ensure modular architecture is active |
| Slow component | Add memoization and check renders |
| API errors | Check error boundaries and service layer |
| Large bundle | Check for unused imports, enable tree-shaking |
| Missing route | Add to routeRegistry.js |

---

**Remember**: Keep components small, use the service layer, and always handle errors!