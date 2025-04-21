# Pyfactor Next.js Frontend

## Recent Fixes

### April 2, 2025

- Added comprehensive memory management utilities to prevent server crashes
- Implemented memory monitoring tools and garbage collection scheduling
- Fixed "JavaScript heap out of memory" errors by increasing memory limits
- Added memory debugging UI component for development environment

### April 1, 2025

- Fixed issue with dynamic imports in token utilities that caused "SyntaxError: import declarations may only appear at top level of a module"
- Removed deprecated `swcMinify` option from next.config.js
- Added importDebugger.js utility for safer dynamic imports in the future
- Avoid dynamic imports of server-only components in client context

## Getting Started

For local development, use the optimized startup script:

```bash
pnpm run dev:pnpm
```

This script uses a simplified Next.js configuration that avoids common issues with browser target compatibility, particularly with `opera_mobile` in Babel configurations.

Alternatively, you can use the standard development server:

```bash
pnpm run dev
```

For development with high memory needs (recommended):

```bash
pnpm run dev-high-memory
```

For development with memory debugging and heap inspection:

```bash
pnpm run dev-debug
```

Open [https://localhost:3000](https://localhost:3000) with your browser to see the result.

## Memory Management

### Memory Monitoring

The application includes memory monitoring tools that help diagnose and fix memory-related issues:

1. **Memory Monitor UI**: Available in development mode, shows heap usage statistics
2. **Server-side monitoring**: Run `pnpm run monitor` in a separate terminal to track server memory usage

### Memory Optimization Tools

Memory optimization utilities are available at:
- `src/utils/memoryManager.js` - Core memory management functionality
- `src/components/Debug/MemoryDebug.js` - UI component for memory debugging
- `server/memory-fix.js` - Server-side memory optimizations
- `scripts/monitor-memory.js` - External memory monitoring script

### Common Memory Issues and Solutions

If your server keeps shutting down due to memory issues:

1. **Increase memory allocation**:
   ```bash
   # For development
   pnpm run dev-high-memory
   
   # For production builds
   NODE_OPTIONS="--max-old-space-size=8192" pnpm run build
   ```

2. **Monitor memory usage**:
   ```bash
   # In a separate terminal while the server is running
   pnpm run monitor
   ```

3. **Enable heap snapshots** (for detailed debugging):
   ```bash
   # Start server with inspector
   NODE_OPTIONS="--inspect --max-old-space-size=8192" pnpm run dev
   ```

4. **Clean up resources**:
   ```bash
   # Clear cache and temporary files
   pnpm run clear
   ```

## Troubleshooting

### Import Errors

If you encounter errors about dynamic imports like "SyntaxError: import declarations may only appear at top level of a module", check:

1. Make sure all dynamic imports are only on the client-side (wrap with `if (typeof window !== 'undefined')`)
2. Use the `safeImport` function from `src/utils/importDebugger.js` for safer dynamic imports
3. Consider using static imports instead of dynamic imports where possible

For example:
```javascript
// Instead of this:
const { module } = await import('next/headers');

// Use this:
import { safeImport } from '@/utils/importDebugger';
const module = await safeImport(() => import('some-module'), 'some-module', fallbackValue);

// Or completely avoid dynamic imports where possible
```

### Browser Target Errors

If you encounter errors related to babel configuration or browser targets such as:

```
Error: [BABEL] @babel/helper-compilation-targets: 'opera_mobile' is not a valid target
```

Use one of these solutions:

1. Run the development server with the optimized configuration:
   ```bash
   pnpm run dev:pnpm
   ```

2. Or use the browserslist fix script and then start the server:
   ```bash
   ./fix-browserslist.sh
   pnpm run dev
   ```

The error is resolved by removing the inline browser targets from babel.config.js and relying on the browserslist configuration in package.json.

### Memory Issues

If you encounter memory issues during build:

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

### Clearing Cache

If you encounter strange caching issues:

```bash
rm -rf .next && pnpm run dev
```

## Build and Production

```bash
# Build for production
pnpm run build

# Run production build locally
pnpm run start

# Run tests
pnpm run test
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

# Customer Management with In-Memory Caching

This project implements customer management features with in-memory caching for improved performance. The implementation uses AWS AppSync-inspired caching with Tailwind CSS for modern UI components.

## Features

- **In-memory caching** for customer data to reduce API calls
- **Automatic cache invalidation** when creating/updating/deleting customers
- **Row-Level Security (RLS)** integration for secure data access
- **Responsive UI** built with Tailwind CSS
- **Optimistic UI updates** for a smooth user experience
- **Refresh button** for manual cache invalidation

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```
   # AWS Region for AppSync (if needed)
   NEXT_PUBLIC_AWS_REGION=us-east-1
   
   # Database connection (for server-side)
   RDS_HOSTNAME=your-db-hostname
   RDS_PORT=5432
   RDS_DB_NAME=your-db-name
   RDS_USERNAME=your-db-username
   RDS_PASSWORD=your-db-password
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Architecture

### In-Memory Cache

The application implements a lightweight in-memory caching system:

- `appCache.js`: Simple key-value store with time-based expiration
- `customerService.js`: Service layer that handles API calls with cache integration

### API Integration

- RESTful endpoints for CRUD operations
- RLS-compatible APIs that respect tenant isolation

### Components

- `CustomerList`: Main component for displaying customers with search functionality
- `CustomerForm`: Form for creating/editing customers
- `CustomerDetails`: Detailed view of a single customer

## Usage

### Fetching Customers with Cache

```javascript
import CustomerService from '@/services/customerService';

// Get from cache if available, otherwise fetch from API
const customers = await CustomerService.getCustomers();

// Force refresh from API
const freshCustomers = await CustomerService.getCustomers({ forceRefresh: true });
```

### Cache Invalidation

The cache is automatically invalidated in the following scenarios:

1. When creating a new customer
2. When updating an existing customer
3. When deleting a customer
4. After a time-based expiration (default: 5 minutes)

You can also manually clear the cache:

```javascript
CustomerService.clearCache();
```

## Styling with Tailwind CSS

The application uses Tailwind CSS for styling, providing:

- Responsive design for all screen sizes
- Modern UI components
- Consistent styling across the application
- Easy customization through configuration

## Performance Considerations

- Cache invalidation is handled automatically
- TTL (Time-To-Live) prevents stale data
- Refresh button for manual cache invalidation
- Spinner indicators for loading states
