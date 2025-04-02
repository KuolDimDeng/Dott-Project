# Pyfactor Next.js Frontend

## Recent Fixes

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
