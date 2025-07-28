# PyFactor Next.js Frontend

This is the Next.js frontend for the PyFactor application.

## Recent Updates

### January 05, 2025

- **Integrated Sentry for Error Tracking and Performance Monitoring**
  - Added comprehensive error tracking with `@sentry/nextjs`
  - Implemented performance monitoring for API calls and user interactions
  - Added structured logging with `logger.fmt` template literals
  - Enabled session replay for visual debugging
  - Created test page at `/dashboard/test-sentry` for verification
  - See [Sentry Setup Documentation](./SENTRY_SETUP_SUMMARY.md)

### January 17, 2025

- **Implemented Redis-based Session Management**
  - Added bridge token system to handle cookie propagation delays
  - Integrated Redis for distributed session storage
  - Automatic fallback to in-memory storage when Redis unavailable
  - Fixes authentication issues after browser cache clear
  - See [Session Management Documentation](./docs/SESSION_MANAGEMENT_WITH_REDIS.md)

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

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

<!-- Force redeploy trigger: 2025-06-04 - JWT token fix deployment -->

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

## Error Tracking and Monitoring

### Sentry Integration

The application uses Sentry for comprehensive error tracking and performance monitoring:

- **Error Tracking**: Automatic capture of JavaScript errors with full stack traces
- **Performance Monitoring**: Tracks API calls, page loads, and user interactions
- **Session Replay**: Visual reproduction of user sessions for debugging
- **Structured Logging**: Uses `logger.fmt` for consistent log formatting
- **User Context**: Associates errors with user information and subscription data

#### Configuration Files:
- `sentry.client.config.js`: Client-side error tracking
- `sentry.server.config.js`: Server-side monitoring
- `sentry.edge.config.js`: Edge runtime configuration

#### Testing Sentry:
Visit `/dashboard/test-sentry` to test the integration and verify events are being sent.

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
# Environment update: Wed Jun  4 18:51:47 MDT 2025
# Force deployment: Wed Jun  4 19:13:13 MDT 2025
# Rebuild trigger: Mon Jul 28 00:55:41 MDT 2025
# Rebuild trigger: Mon Jul 28 09:12:32 MDT 2025
