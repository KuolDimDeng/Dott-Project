# 🏗️ Dott Architecture Guide

## Overview

This guide explains the modular architecture implemented in the Dott application. The architecture follows Domain-Driven Design (DDD) principles and industry best practices used by companies like Netflix, Airbnb, and Spotify.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Domain Structure](#domain-structure)
3. [Component Architecture](#component-architecture)
4. [Service Layer](#service-layer)
5. [Routing System](#routing-system)
6. [Icon System](#icon-system)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Best Practices](#best-practices)

---

## Architecture Overview

The application is organized into distinct layers:

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│    (Components, Pages, UI Elements)     │
├─────────────────────────────────────────┤
│           Business Logic Layer          │
│      (Hooks, Domain Logic, State)       │
├─────────────────────────────────────────┤
│           Service Layer                 │
│        (API Calls, Data Fetching)       │
├─────────────────────────────────────────┤
│           Infrastructure Layer          │
│    (Auth, Monitoring, Error Handling)   │
└─────────────────────────────────────────┘
```

## Domain Structure

The application is divided into business domains, each self-contained:

```
src/
└── domains/
    ├── products/          # Product management
    ├── customers/         # Customer relationships
    ├── invoices/          # Billing and invoicing
    ├── banking/           # Financial operations
    ├── hr/                # Human resources
    ├── taxes/             # Tax management
    ├── reports/           # Analytics and reporting
    ├── settings/          # Configuration
    └── analytics/         # Business intelligence
```

### Domain Anatomy

Each domain follows a consistent structure:

```
domains/products/
├── components/        # UI components
│   ├── ProductTable.js
│   ├── ProductForm.js
│   └── ProductFilters.js
├── hooks/            # Business logic hooks
│   ├── useProducts.js
│   └── useProductForm.js
├── services/         # API integration
│   └── productService.js
└── types/            # Type definitions
    └── product.types.js
```

## Component Architecture

### Component Guidelines

1. **Single Responsibility**: Each component should do one thing well
2. **Size Limit**: Keep components under 200 lines
3. **Composition Over Inheritance**: Use component composition

### Example Component Structure

```javascript
// Good: Focused component with clear responsibility
const ProductTable = ({ products, onEdit, onDelete }) => {
  // Component logic here
};

// Bad: Monolithic component doing too much
const ProductManagement = () => {
  // 3000+ lines of mixed concerns
};
```

## Service Layer

The service layer provides a clean API interface:

```javascript
// services/productService.js
import { apiService } from '@/shared/services/apiService';

export const productService = {
  async getAll(params = {}) {
    return apiService.get('/products', params);
  },
  
  async create(productData) {
    return apiService.post('/products', productData);
  },
  
  async update(id, productData) {
    return apiService.put(`/products/${id}`, productData);
  },
  
  async delete(id) {
    return apiService.delete(`/products/${id}`);
  }
};
```

### Using Services in Components

```javascript
import { productService } from '@/domains/products/services/productService';

const useProducts = () => {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    const fetchProducts = async () => {
      const data = await productService.getAll();
      setProducts(data);
    };
    fetchProducts();
  }, []);
  
  return products;
};
```

## Routing System

The router system replaces massive switch statements:

```javascript
// routeRegistry.js
export const routeRegistry = {
  'products': {
    component: lazy(() => import('@/domains/products/components/ProductManagement')),
    title: 'Products',
    description: 'Manage your products'
  },
  // ... other routes
};

// DashboardRouter.js
const DashboardRouter = ({ view }) => {
  const route = routeRegistry[view];
  const Component = route?.component;
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
};
```

## Icon System

Icons are organized by category and tree-shakeable:

```javascript
// Import specific icons
import { Dashboard, Analytics } from '@/shared/icons';

// Import by category
import { NavIcons, BusinessIcons } from '@/shared/icons';

// Use in components
<Dashboard className="w-6 h-6" />
<NavIcons.Settings className="w-5 h-5" />
```

## Error Handling

### Error Boundaries

Wrap components with error boundaries:

```javascript
import ErrorBoundary from '@/shared/components/ErrorBoundary';

<ErrorBoundary name="ProductList">
  <ProductList />
</ErrorBoundary>
```

### Async Error Handling

For async components:

```javascript
import AsyncErrorBoundary from '@/shared/components/AsyncErrorBoundary';

<AsyncErrorBoundary name="AsyncProductData">
  <AsyncProductLoader />
</AsyncErrorBoundary>
```

## Performance Optimization

### Memoization

Use React.memo for expensive components:

```javascript
const ProductCard = memo(({ product }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id;
});
```

### Code Splitting

Routes are automatically code-split:

```javascript
const ProductManagement = lazy(() => 
  import('@/domains/products/components/ProductManagement')
);
```

### Monitoring

Use the performance monitor:

```javascript
import { performanceMonitor } from '@/utils/monitoring';

// Track component performance
performanceMonitor.measureComponent('ProductTable', () => {
  // Render logic
});

// Track API calls
const data = await performanceMonitor.measureApiCall('/api/products', async () => {
  return await productService.getAll();
});
```

## Best Practices

### 1. File Organization

```
✅ Good: Clear domain boundaries
domains/products/components/ProductTable.js

❌ Bad: Mixed concerns
components/forms/ProductManagement.js (3000+ lines)
```

### 2. Component Size

```javascript
✅ Good: Focused component
const ProductPrice = ({ price, currency }) => (
  <span>{currency} {price.toFixed(2)}</span>
);

❌ Bad: Monolithic component
const ProductManagement = () => {
  // 3000+ lines of mixed logic
};
```

### 3. State Management

```javascript
✅ Good: Local state for UI
const [isOpen, setIsOpen] = useState(false);

✅ Good: Custom hooks for business logic
const { products, loading, error } = useProducts();

❌ Bad: Business logic in components
const ProductList = () => {
  // API calls directly in component
  useEffect(() => {
    fetch('/api/products')...
  }, []);
};
```

### 4. Error Handling

```javascript
✅ Good: Graceful error handling
try {
  const data = await productService.create(formData);
  notifySuccess('Product created');
} catch (error) {
  notifyError('Failed to create product');
  errorTracker.trackError(error, { context: 'product_creation' });
}

❌ Bad: Unhandled errors
const data = await fetch('/api/products');
// No error handling
```

### 5. Performance

```javascript
✅ Good: Memoized expensive calculations
const sortedProducts = useMemo(() => 
  products.sort((a, b) => a.name.localeCompare(b.name)),
  [products]
);

❌ Bad: Recalculating on every render
const sortedProducts = products.sort((a, b) => a.name.localeCompare(b.name));
```

## Migration Guide

When creating new features:

1. **Identify the Domain**: Which business area does this belong to?
2. **Create Domain Structure**: Follow the standard folder structure
3. **Break Down Components**: Keep them small and focused
4. **Use Service Layer**: Don't make API calls directly in components
5. **Add Error Boundaries**: Wrap async and critical components
6. **Monitor Performance**: Use the monitoring utilities

## Tools and Utilities

### Development Tools

- **Performance Dashboard**: Press `Ctrl+Shift+P` to toggle
- **Error Tracking**: Automatic Sentry integration
- **Memory Monitoring**: Built-in memory usage tracking

### Scripts

```bash
# Run development server
pnpm run dev

# Build for production
NODE_OPTIONS="--max-old-space-size=2048" pnpm build

# Run tests
pnpm test

# Check architecture health
pnpm run architecture:check
```

## Troubleshooting

### Build Failures

If build fails with memory errors:
1. Ensure new architecture is activated
2. Check for remaining large files
3. Increase memory limit if needed

### Performance Issues

1. Check Performance Dashboard (`Ctrl+Shift+P`)
2. Look for slow component renders
3. Review API call performance
4. Check bundle size

### Error Tracking

Errors are automatically sent to Sentry with:
- User context
- Component stack traces
- Performance metrics

---

## Conclusion

This architecture provides:
- ✅ 80% reduction in file sizes
- ✅ Clear separation of concerns
- ✅ Easy maintenance and testing
- ✅ Excellent performance
- ✅ Scalability for large teams

Follow these patterns for all new development to maintain consistency and quality.