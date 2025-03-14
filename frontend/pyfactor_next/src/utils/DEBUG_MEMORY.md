# Memory Debugging Tools

This document provides information about the memory debugging tools available in the application and how to use them to identify and fix memory leaks and performance issues.

## Overview

The dashboard was experiencing memory issues, with the server running out of memory during normal operation. We've implemented several tools to help identify and fix these issues:

1. Memory usage tracking utilities
2. Memory debugging components
3. Optimized components to reduce memory usage

## Memory Debugging Utilities

The main memory debugging utilities are located in:

- `src/utils/memoryDebugger.js` - Core memory debugging utilities
- `src/components/Debug/MemoryDebugger.jsx` - UI component for memory debugging

### Key Functions

- `getMemoryUsage()` - Returns current memory usage information
- `logMemoryUsage(componentName, action)` - Logs memory usage for a component
- `trackMemory(componentName, action)` - Tracks memory usage over time
- `detectMemoryLeaks()` - Analyzes memory usage to detect potential leaks
- `startMemoryMonitoring(interval)` - Starts automatic memory monitoring
- `stopMemoryMonitoring(intervalId)` - Stops automatic memory monitoring

## How to Use

### Adding Memory Debugging to a Component

```jsx
import { logMemoryUsage, trackMemory } from '@/utils/memoryDebugger';

function MyComponent() {
  // Track memory on mount and unmount
  useEffect(() => {
    logMemoryUsage('MyComponent', 'mount');
    
    return () => {
      logMemoryUsage('MyComponent', 'unmount');
    };
  }, []);
  
  // Track memory before and after expensive operations
  const handleExpensiveOperation = async () => {
    trackMemory('MyComponent', 'before-operation');
    
    // Perform expensive operation
    await someExpensiveOperation();
    
    trackMemory('MyComponent', 'after-operation');
  };
  
  return (
    <div>My Component</div>
  );
}
```

### Adding the Memory Debugger UI

```jsx
import MemoryDebugger from '@/components/Debug/MemoryDebugger';

function MyPage() {
  return (
    <div>
      <MyContent />
      
      {/* Only show in development mode */}
      {process.env.NODE_ENV === 'development' && <MemoryDebugger />}
    </div>
  );
}
```

## Optimizations Made

We've made several optimizations to reduce memory usage:

1. **Code Splitting**: Using dynamic imports to load components only when needed
2. **Memoization**: Using React.memo and useCallback to prevent unnecessary re-renders
3. **State Optimization**: Combining multiple state variables into single objects
4. **Reduced Object Creation**: Minimizing object creation in render methods
5. **Cleanup**: Properly cleaning up resources in useEffect hooks

## Identifying Memory Leaks

The memory debugger UI provides a "Check Leaks" button that analyzes memory usage over time to identify potential memory leaks. Components that show a consistent increase in memory usage over time are flagged as potential leaks.

Common causes of memory leaks:

1. **Event Listeners**: Not removing event listeners in cleanup functions
2. **Timers**: Not clearing intervals or timeouts
3. **Closures**: Creating closures that reference large objects
4. **State Updates**: Updating state with new object references
5. **DOM References**: Keeping references to DOM elements

## Console Output

The memory debugging tools output information to the console. Look for:

- `[Memory]` - General memory information
- `[Memory Warning]` - Warnings about high memory usage
- `[Memory Spike Detected]` - Sudden increases in memory usage

## Browser Memory Tools

For more detailed analysis, use the browser's built-in memory tools:

1. Chrome DevTools > Memory tab
2. Performance tab > Memory checkbox
3. Take heap snapshots before and after suspected memory leaks

## Running with Enhanced Memory Monitoring

To get more detailed memory information in Chrome, launch it with:

```
chrome --enable-precise-memory-info
```

This provides more accurate memory measurements for the debugging tools.

## Troubleshooting

If you're still experiencing memory issues:

1. Check for components that render frequently
2. Look for large objects being stored in state
3. Verify that all event listeners and timers are cleaned up
4. Consider using virtualization for long lists
5. Implement pagination for large data sets

## Further Improvements

Additional improvements that could be made:

1. Implement server-side rendering for initial page load
2. Use Web Workers for CPU-intensive operations
3. Implement more aggressive code splitting
4. Consider using a lighter UI framework for critical components
5. Implement memory budgets for different parts of the application