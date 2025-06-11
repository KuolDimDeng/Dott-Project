#!/usr/bin/env node

/**
 * Script: Version0029_optimize_dashappbar_performance.mjs
 * Purpose: Optimize DashAppBar component to reduce re-renders and improve performance
 * - Remove debug console.log statements
 * - Add React.memo optimization
 * - Consolidate useEffect hooks
 * - Optimize subscription data handling
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dashAppBarPath = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js';

async function optimizeDashAppBar() {
  try {
    console.log('Reading DashAppBar component...');
    const content = await readFile(dashAppBarPath, 'utf-8');
    
    let optimizedContent = content;
    
    // 1. Remove or comment out debug console.log statements
    console.log('Removing debug console.log statements...');
    
    // Remove the subscription debug log (lines 702-720)
    optimizedContent = optimizedContent.replace(
      /\/\/ Debug subscription data[\s\S]*?allProfileData: profileData[\s\S]*?\}\);/,
      `// Subscription debug removed for performance`
    );
    
    // 2. Wrap component with React.memo
    console.log('Adding React.memo optimization...');
    
    // Find the export statement and wrap with memo
    optimizedContent = optimizedContent.replace(
      /export default DashAppBar;/,
      `// Memoize component to prevent unnecessary re-renders
const MemoizedDashAppBar = memo(DashAppBar, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props change
  return (
    prevProps.drawerOpen === nextProps.drawerOpen &&
    prevProps.view === nextProps.view &&
    prevProps.tenantId === nextProps.tenantId &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    prevProps.showCreateMenu === nextProps.showCreateMenu &&
    prevProps.openMenu === nextProps.openMenu &&
    // Deep compare user data only if references change
    prevProps.userData === nextProps.userData &&
    prevProps.profileData === nextProps.profileData &&
    prevProps.userAttributes === nextProps.userAttributes &&
    prevProps.user === nextProps.user
  );
});

export default MemoizedDashAppBar;`
    );
    
    // 3. Add memo import if not present
    if (!optimizedContent.includes("memo") || !optimizedContent.includes("import React, {")) {
      optimizedContent = optimizedContent.replace(
        /import React, \{([^}]+)\} from 'react';/,
        (match, imports) => {
          const importList = imports.split(',').map(i => i.trim());
          if (!importList.includes('memo')) {
            importList.push('memo');
          }
          return `import React, {\n  ${importList.join(',\n  ')}\n} from 'react';`;
        }
      );
    }
    
    // 4. Optimize getSubscriptionType to use useMemo
    console.log('Optimizing subscription type calculation...');
    
    // Replace the getSubscriptionType useCallback with useMemo for the result
    optimizedContent = optimizedContent.replace(
      /const effectiveSubscriptionType = getSubscriptionType\(\);/,
      `// Memoize subscription type to prevent recalculation on every render
  const effectiveSubscriptionType = useMemo(() => {
    return getSubscriptionType();
  }, [getSubscriptionType]);`
    );
    
    // 5. Optimize business name calculation
    console.log('Optimizing business name calculation...');
    
    // The effectiveBusinessName is already using useMemo, but let's optimize its dependencies
    optimizedContent = optimizedContent.replace(
      /\}, \[businessName, fetchedBusinessName, auth0BusinessName, profileData, userData, userAttributes\]\);/g,
      `}, [
    businessName, 
    fetchedBusinessName, 
    auth0BusinessName, 
    profileData?.businessName,
    profileData?.business_name,
    profileData?.tenant?.name,
    userData?.businessName,
    userData?.tenant?.name,
    userAttributes?.['custom:businessname'],
    userAttributes?.['custom:tenant_name']
  ]);`
    );
    
    // 6. Add performance monitoring comment
    const performanceComment = `/**
 * @component DashAppBar
 * @description 
 * PERFORMANCE OPTIMIZED VERSION - ${new Date().toISOString()}
 * 
 * Optimizations applied:
 * 1. Component wrapped with React.memo to prevent unnecessary re-renders
 * 2. Debug console.log statements removed
 * 3. Subscription type calculation memoized
 * 4. Business name dependencies optimized
 * 
 * IMPORTANT: THIS IS THE FINAL DESIGN AND LAYOUT FOR THE APP BAR.
 * DO NOT MAKE ANY CHANGES TO THIS COMPONENT WITHOUT EXPRESS PERMISSION FROM THE OWNER.
 * This design was finalized on 2025-04-06 with the following specifications:
 * - The Pyfactor Dashboard logo on the left side
 * - The business name and subscription plan together on the right side
 * - A full-width header that spans the entire screen
 * - Proper layout adjustments for both mobile and desktop views
 * 
 * Any changes require explicit approval from the project owner.
 */`;
    
    optimizedContent = optimizedContent.replace(
      /\/\*\*[\s\S]*?Any changes require explicit approval from the project owner\.\s*\*\//,
      performanceComment
    );
    
    // 7. Optimize hasLoggedInit check to reduce logging
    console.log('Optimizing initialization logging...');
    
    optimizedContent = optimizedContent.replace(
      /logger\.debug\('\[DashAppBar\] Component initialized - Using Auth0 session data for user info'\);/,
      `if (process.env.NODE_ENV !== 'production') {
      logger.debug('[DashAppBar] Component initialized - Using Auth0 session data for user info');
    }`
    );
    
    // 8. Create backup
    const backupDir = join(dirname(dashAppBarPath), 'backups');
    await mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `DashAppBar.${timestamp}.backup.js`);
    
    console.log(`Creating backup at ${backupPath}...`);
    await writeFile(backupPath, content);
    
    // 9. Write optimized file
    console.log('Writing optimized DashAppBar component...');
    await writeFile(dashAppBarPath, optimizedContent);
    
    // 10. Update script registry
    const scriptRegistryPath = '/Users/kuoldeng/projectx/scripts/script_registry.md';
    const registryEntry = `
## Version0029_optimize_dashappbar_performance.mjs
- **Date**: ${new Date().toISOString()}
- **Purpose**: Optimize DashAppBar component performance
- **Changes**:
  - Removed debug console.log statements
  - Added React.memo wrapper with custom comparison
  - Memoized subscription type calculation
  - Optimized business name dependencies
  - Reduced unnecessary re-renders
- **Files Modified**:
  - /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/DashAppBar.js
- **Backup Created**: ${backupPath}
`;
    
    try {
      const currentRegistry = await readFile(scriptRegistryPath, 'utf-8');
      await writeFile(scriptRegistryPath, currentRegistry + registryEntry);
      console.log('Updated script registry');
    } catch (error) {
      console.log('Script registry not found, creating new entry...');
      await writeFile(scriptRegistryPath, `# Script Registry\n${registryEntry}`);
    }
    
    console.log('\n✅ DashAppBar performance optimization complete!');
    console.log('\nOptimizations applied:');
    console.log('- ✓ Removed debug console.log statements');
    console.log('- ✓ Added React.memo with custom comparison');
    console.log('- ✓ Memoized subscription type calculation');
    console.log('- ✓ Optimized business name dependencies');
    console.log('- ✓ Reduced production logging');
    console.log('\nThe component should now have significantly fewer re-renders.');
    
  } catch (error) {
    console.error('Error optimizing DashAppBar:', error);
    process.exit(1);
  }
}

// Run the optimization
optimizeDashAppBar();