/**
 * Employee Management Session Handling Fix Script
 * Issue ID: EMP-FIX-2025-06-01
 * Version: v1.0
 * 
 * This script fixes session handling issues in the Employee Management component
 * to ensure proper authentication and error recovery.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Root directory paths
const rootDir = path.resolve(__dirname, '..');
const componentsDir = path.join(rootDir, 'src', 'app', 'dashboard', 'components');
const formsDir = path.join(componentsDir, 'forms');
const utilsDir = path.join(rootDir, 'src', 'utils');

// Backup function
function backupFile(filePath) {
  const backupPath = `${filePath}.backup-${new Date().toISOString()}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

// Log function
function log(message) {
  console.log(`[EMP-FIX] ${message}`);
}

// Main function to apply all fixes
async function applyFixes() {
  log('Starting Employee Management session handling fixes...');
  
  try {
    // 1. Update the Employee Management component
    const employeeManagementPath = path.join(formsDir, 'EmployeeManagement.js');
    if (fs.existsSync(employeeManagementPath)) {
      log('Fixing Employee Management component...');
      backupFile(employeeManagementPath);
      
      let empContent = fs.readFileSync(employeeManagementPath, 'utf8');
      
      // Check if the component already has the necessary functions
      const hasRefreshDefined = empContent.includes('const refreshSession = async');
      const hasRedirectDefined = empContent.includes('const redirectToLogin = ');
      const hasRefreshUsage = empContent.includes('onClick={refreshSession}');
      const hasRedirectUsage = empContent.includes('onClick={redirectToLogin}');
      
      let needsUpdate = false;
      
      // Find the beginning of the component to insert functions
      const componentStartRegex = /const EmployeeManagement = \(\) => \{/;
      const componentStart = empContent.match(componentStartRegex);
      
      if (!componentStart) {
        log('Could not find EmployeeManagement component in the file');
        return {
          success: false,
          message: 'Could not find EmployeeManagement component in the file'
        };
      }
      
      // Add refreshSession function if it's used but not defined
      if (hasRefreshUsage && !hasRefreshDefined) {
        log('Adding missing refreshSession function...');
        
        const insertPosition = componentStart.index + componentStart[0].length;
          
        const refreshSessionFunc = `

  // Function to manually refresh the user session
  const refreshSession = async () => {
    try {
      setLoading(true);
      const refreshed = await refreshUserSession();
      if (refreshed) {
        setError(null);
        toast.success('Session refreshed successfully');
        fetchEmployees(); // Retry fetching data
      } else {
        setError('Failed to refresh session. Please log in again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Failed to refresh session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };`;
          
        empContent = empContent.slice(0, insertPosition) + refreshSessionFunc + empContent.slice(insertPosition);
        needsUpdate = true;
      } else if (hasRefreshDefined) {
        log('refreshSession function already exists, checking for improvements...');
        
        // Update the existing refreshSession function with better error handling
        const refreshFunctionRegex = /const refreshSession = async \(\) => \{[\s\S]*?}\s*}\s*finally\s*\{[\s\S]*?}\s*\};/;
        const refreshFunctionMatch = empContent.match(refreshFunctionRegex);
        
        if (refreshFunctionMatch) {
          const improvedRefreshFunc = `const refreshSession = async () => {
    try {
      setLoading(true);
      
      // Clear any existing errors first
      setError(null);
      setFetchError(null);
      setSubmitError(null);
      
      // Show a loading toast that can be dismissed
      const toastId = toast.loading('Refreshing session...', { duration: 10000 });
      
      // Try to refresh session with improved retry and timeout
      const refreshed = await refreshUserSession();
      
      // Clear the loading toast
      toast.dismiss(toastId);
      
      if (refreshed) {
        toast.success('Session refreshed successfully');
        
        // Reset connection checker if it was showing
        setShowConnectionChecker(false);
        
        // Refetch employees after session refresh
        fetchEmployees();
        return true;
      } else {
        setError('Session refresh failed. You may need to log in again.');
        return false;
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Error refreshing session: ' + (error.message || 'Unknown error'));
      return false;
    } finally {
      setLoading(false);
    }
  };`;
          
          empContent = empContent.replace(refreshFunctionMatch[0], improvedRefreshFunc);
          needsUpdate = true;
        }
      }
      
      // Add redirectToLogin function if it's used but not defined
      if (hasRedirectUsage && !hasRedirectDefined) {
        log('Adding missing redirectToLogin function...');
        
        // Find the right place to insert the function
        const insertPosition = hasRefreshDefined ? 
          empContent.indexOf('};', empContent.indexOf('const refreshSession = async')) + 2 :
          componentStart.index + componentStart[0].length;
        
        const redirectLoginFunc = `

  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = \`/login?expired=true&redirect=\${encodeURIComponent(currentPath)}\`;
  };`;
        
        empContent = empContent.slice(0, insertPosition) + redirectLoginFunc + empContent.slice(insertPosition);
        needsUpdate = true;
      } else if (hasRedirectDefined) {
        log('redirectToLogin function already exists, checking for improvements...');
        
        // Update the existing redirectToLogin function
        const redirectFunctionRegex = /const redirectToLogin = \(\) => \{[\s\S]*?}\;/;
        const redirectFunctionMatch = empContent.match(redirectFunctionRegex);
        
        if (redirectFunctionMatch) {
          const improvedRedirectFunc = `const redirectToLogin = () => {
    // Store the current path for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    
    // Clear any cached authentication state before redirecting
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      try {
        // Clear cached tokens
        if (window.__APP_CACHE.auth) {
          window.__APP_CACHE.auth = {
            provider: window.__APP_CACHE.auth.provider // Keep only the provider info
          };
        }
      } catch (e) {
        logger.error('[EmployeeManagement] Error clearing cache before redirect:', e);
      }
    }
    
    // Show info toast before redirecting
    toast.success('Redirecting to login page...', { duration: 3000 });
    
    // Small delay to allow toast to show before redirect
    setTimeout(() => {
      window.location.href = \`/login?expired=true&redirect=\${encodeURIComponent(currentPath)}\`;
    }, 1000);
  };`;
          
          empContent = empContent.replace(redirectFunctionMatch[0], improvedRedirectFunc);
          needsUpdate = true;
        }
      }
      
      // Improve session error handling in fetchEmployees function
      const fetchEmployeesRegex = /const fetchEmployees = async \(\) => \{[\s\S]*?}\;/;
      const fetchEmployeesMatch = empContent.match(fetchEmployeesRegex);
      
      if (fetchEmployeesMatch) {
        log('Improving session error handling in fetchEmployees function...');
        
        // Extract the current function content to preserve most of it
        const currentFetchEmployees = fetchEmployeesMatch[0];
        
        // Check if it already has session handling
        if (!currentFetchEmployees.includes('Authentication error') && 
            !currentFetchEmployees.includes('session expired')) {
          
          // Find the catch block to enhance it
          const catchBlockRegex = /catch \(error\) \{([\s\S]*?)}/;
          const catchBlockMatch = currentFetchEmployees.match(catchBlockRegex);
          
          if (catchBlockMatch) {
            const improvedCatchBlock = `catch (error) {
      setLoading(false);
      
      // Check for authentication/session errors specifically
      if (error.response && error.response.status === 401) {
        logger.error('[EmployeeManagement] Authentication error in fetchEmployees:', error);
        setError('Authentication error: Your session has expired. Please refresh your session or log in again.');
        setShowConnectionChecker(false); // Hide connection checker for auth errors
        return;
      }
      
      // Check for network errors
      if (error.message && (
        error.message.includes('Network Error') || 
        error.message.includes('network') ||
        !error.response
      )) {
        logger.error('[EmployeeManagement] Network error in fetchEmployees:', error);
        setError('Network error: Unable to connect to the server. Please check your connection.');
        setShowConnectionChecker(true); // Show connection checker for network errors
        return;
      }
      
      // General error handling${catchBlockMatch[1]}`;
            
            const updatedFetchEmployees = currentFetchEmployees.replace(catchBlockMatch[0], improvedCatchBlock);
            empContent = empContent.replace(currentFetchEmployees, updatedFetchEmployees);
            needsUpdate = true;
          }
        }
      }
      
      // Add session status check on component mount
      const useEffectInitRegex = /useEffect\(\(\) => \{(?:[\s\S]*?)fetchEmployees\(\);(?:[\s\S]*?)}\s*,\s*\[\s*\]\s*\);/;
      const useEffectInitMatch = empContent.match(useEffectInitRegex);
      
      if (useEffectInitMatch) {
        log('Adding session status check on component mount...');
        
        const currentInitEffect = useEffectInitMatch[0];
        
        if (!currentInitEffect.includes('checkSessionStatus')) {
          const improvedInitEffect = currentInitEffect.replace(
            'fetchEmployees();',
            `// Check session status before fetching data
    const checkSessionStatus = async () => {
      try {
        // Import and use getCurrentUser to verify session
        const { getCurrentUser } = await import('aws-amplify/auth');
        await getCurrentUser();
        setIsAuthenticated(true);
        fetchEmployees();
      } catch (error) {
        logger.error('[EmployeeManagement] Session check failed:', error);
        setIsAuthenticated(false);
        setError('Your session appears to be invalid. Please refresh your session or log in again.');
      }
    };
    
    checkSessionStatus();`
          );
          
          empContent = empContent.replace(currentInitEffect, improvedInitEffect);
          needsUpdate = true;
        }
      }
      
      // Add a session recovery button in the main UI if there isn't one
      const errorAlertRegex = /{error && !fetchError && \([\s\S]*?<Alert[\s\S]*?<\/Alert>[\s\S]*?\)}/;
      const errorAlertMatch = empContent.match(errorAlertRegex);
      
      if (errorAlertMatch) {
        log('Improving session recovery UI...');
        
        const currentErrorAlert = errorAlertMatch[0];
        
        if (!currentErrorAlert.includes('session has expired') && 
            !currentErrorAlert.includes('Authentication error')) {
          
          const improvedErrorAlert = `{error && !fetchError && (
        <Alert severity="error" className="mb-4">
          {error}
          {error.includes('session') || error.includes('Authentication') ? (
            <div className="mt-2 flex gap-2">
              <Button
                variant="text" 
                color="primary"
                size="small"
                onClick={refreshSession}
                className="mr-2"
              >
                Refresh Session
              </Button>
              <Button
                variant="text" 
                color="error" 
                size="small"
                onClick={redirectToLogin}
              >
                Log In Again
              </Button>
            </div>
          ) : null}
        </Alert>
      )}`;
          
          empContent = empContent.replace(currentErrorAlert, improvedErrorAlert);
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        fs.writeFileSync(employeeManagementPath, empContent);
        log('✓ Updated Employee Management component with improved session handling');
      } else {
        log('No updates needed for Employee Management component');
      }
    } else {
      log('⚠ Employee Management component file not found');
    }

    // 2. Improve refreshUserSession utility to better handle Employee Management
    const refreshUserSessionPath = path.join(utilsDir, 'refreshUserSession.js');
    if (fs.existsSync(refreshUserSessionPath)) {
      log('Updating refreshUserSession utility...');
      backupFile(refreshUserSessionPath);
      
      let refreshContent = fs.readFileSync(refreshUserSessionPath, 'utf8');
      
      // Check if we need to update the MIN_REFRESH_INTERVAL for better UX in component context
      if (refreshContent.includes('const MIN_REFRESH_INTERVAL = 60000;')) {
        refreshContent = refreshContent.replace(
          'const MIN_REFRESH_INTERVAL = 60000; // 1 minute minimum between refreshes',
          'const MIN_REFRESH_INTERVAL = 20000; // 20 seconds minimum between refreshes (reduced from 60s)'
        );
        
        fs.writeFileSync(refreshUserSessionPath, refreshContent);
        log('✓ Updated refreshUserSession utility with reduced refresh interval');
      } else {
        log('No updates needed for refreshUserSession utility');
      }
    } else {
      log('⚠ refreshUserSession.js file not found');
    }

    // 3. Update script registry
    const scriptRegistryPath = path.join(rootDir, 'scripts', 'script_registry.json');
    let registry = {};
    
    if (fs.existsSync(scriptRegistryPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(scriptRegistryPath, 'utf8'));
      } catch (e) {
        log('Could not parse existing script registry, creating new one');
        registry = { scripts: [] };
      }
    } else {
      registry = { scripts: [] };
    }
    
    // Add our script to the registry
    registry.scripts.push({
      id: 'EMP-FIX-2025-06-01',
      name: 'Employee Management Session Fix',
      path: 'employee_session_fix.js',
      version: 'v1.0',
      execution_date: new Date().toISOString(),
      status: 'completed',
      description: 'Fixes session handling in the Employee Management component'
    });
    
    fs.writeFileSync(scriptRegistryPath, JSON.stringify(registry, null, 2));
    log('✓ Updated script registry');

    // Success message
    log('All fixes applied successfully!');
    
    return {
      success: true,
      message: 'Employee Management session handling fixes applied successfully'
    };
  } catch (error) {
    log(`ERROR: ${error.message}`);
    console.error(error);
    
    return {
      success: false,
      message: `Failed to apply fixes: ${error.message}`,
      error
    };
  }
}

// Run the fixes if script is executed directly
if (require.main === module) {
  applyFixes()
    .then(result => {
      if (result.success) {
        console.log('\n✅ SUCCESS:', result.message);
        process.exit(0);
      } else {
        console.error('\n❌ ERROR:', result.message);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('\n❌ FATAL ERROR:', err);
      process.exit(1);
    });
} else {
  // Export for use as a module
  module.exports = { applyFixes };
} 