# Image Loading Fix Guide

This guide explains how to fix image loading issues in the Next.js application.

## The Problem

When running the Next.js application with HTTPS, you may encounter errors like:

```
upstream image response failed for /static/images/Work-Life-Balance-1--Streamline-Brooklyn.png
```

```
ImageError: "url" parameter is valid but upstream response is invalid
```

These errors occur because Next.js tries to optimize images during rendering, but there's an issue with the internal fetch mechanism when using HTTPS in development mode.

## Solution 1: Use UnoptimizedImage Component

We've created an `UnoptimizedImage` component that serves as a drop-in replacement for Next.js's `Image` component with optimization disabled.

### Step 1: Import UnoptimizedImage instead of Image

```javascript
// Before
import Image from 'next/image';

// After
import UnoptimizedImage from '@/components/UnoptimizedImage';
```

### Step 2: Replace Image tags with UnoptimizedImage

```jsx
// Before
<Image src="/logo.png" alt="Logo" width={200} height={100} />

// After
<UnoptimizedImage src="/logo.png" alt="Logo" width={200} height={100} />
```

## Solution 2: Add unoptimized property to existing Image components

If you prefer to keep using the original Image component, you can add the `unoptimized` property:

```jsx
<Image 
  src="/logo.png" 
  alt="Logo" 
  width={200} 
  height={100}
  unoptimized={true} // Add this line
/>
```

## Solution 3: Use the Image Fix Tool

We've created a script to help you identify which files need to be fixed:

```bash
cd frontend/pyfactor_next
node scripts/fix-images.js
```

This script will:
1. Find all files that import Image from next/image
2. List the files that need to be fixed
3. Provide instructions for fixing them

## For Production

In production, image optimization should work correctly with proper SSL certificates. The `unoptimized` setting in our config is only applied in development mode:

```javascript
// in next.config.js
images: {
  unoptimized: process.env.NODE_ENV !== 'production',
  // other settings...
}
```

## Troubleshooting

If you're still experiencing image loading issues:

1. Make sure the image files actually exist in the specified paths
2. Try using absolute URLs instead of relative paths
3. For local development, you might need to add the image domains to the Next.js config:

```javascript
// in next.config.js
images: {
  domains: ['localhost', '127.0.0.1'],
  // other settings...
}
```

4. Clear the Next.js cache by running:

```bash
rm -rf .next/cache
```

5. Restart the server after making changes. 