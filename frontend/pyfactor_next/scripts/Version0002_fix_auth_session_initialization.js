// Version0002_fix_auth_session_initialization.js
// v1.0
// Issue Reference: Authentication and Session Initialization Issues
//
// This script addresses multiple issues:
// 1. Fixes 401 Unauthorized errors in user profile fetching
// 2. Resolves NextAuth client fetch errors
// 3. Prevents multiple initialization attempts of tenant dashboard
//
// Author: AI Assistant
// Date: 2025-05-05

import fs from 'fs';
import path from 'path';

const TARGET_FILES = {
  authUtils: path.resolve('src/utils/authUtils.js'),
  tenantUtils: path.resolve('src/utils/tenantUtils.js'),
  userProfile: path.resolve('src/hooks/useProfile.js'),
  tenantDashboard: path.resolve('src/app/dashboard/components/TenantDashboardLayout.js')
};

const REGISTRY_FILE = path.resolve('scripts/script_registry.md');
const REGISTRY_JSON = path.resolve('scripts/script_registry.json');
const VERSION = 'v1.0';
const ISSUE_REF = 'Authentication and Session Initialization Issues';

function updateAuthUtils(content) {
  // Add token validation and refresh logic
  return content.replace(/export const validateSession = async \(\) => {[\s\S]*?}/,
`export const validateSession = async () => {
  try {
    // Check if we have a valid token
    const token = await getToken();
    if (!token) {
      console.warn('[AuthUtils] No token found, redirecting to login');
      return false;
    }

    // Verify token expiration
    const decodedToken = decodeToken(token);
    if (decodedToken.exp * 1000 < Date.now()) {
      console.warn('[AuthUtils] Token expired, attempting refresh');
      const newToken = await refreshToken();
      if (!newToken) {
        console.error('[AuthUtils] Token refresh failed');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[AuthUtils] Session validation error:', error);
    return false;
  }
}`);

  // Add token refresh logic
  return content.replace(/export const refreshToken = async \(\) => {[\s\S]*?}/,
`export const refreshToken = async () => {
  try {
    const currentToken = await getToken();
    if (!currentToken) return null;

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${currentToken}\`
      }
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { token } = await response.json();
    await setToken(token);
    return token;
  } catch (error) {
    console.error('[AuthUtils] Token refresh error:', error);
    return null;
  }
}`);
}

function updateTenantUtils(content) {
  // Add initialization guard
  return content.replace(/export const initializeTenant = async \(tenantId\) => {[\s\S]*?}/,
`export const initializeTenant = async (tenantId) => {
  if (!tenantId) {
    console.error('[TenantUtils] No tenant ID provided');
    return false;
  }

  // Check if already initialized
  if (window.__TENANT_INITIALIZED === tenantId) {
    console.debug('[TenantUtils] Tenant already initialized');
    return true;
  }

  try {
    // Validate session before proceeding
    const isValidSession = await validateSession();
    if (!isValidSession) {
      console.error('[TenantUtils] Invalid session');
      return false;
    }

    // Initialize tenant
    window.__TENANT_INITIALIZED = tenantId;
    return true;
  } catch (error) {
    console.error('[TenantUtils] Initialization error:', error);
    return false;
  }
}`);
}

function updateUserProfile(content) {
  // Add retry logic and error handling
  return content.replace(/export const useProfile = \(\) => {[\s\S]*?}/,
`export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchProfile = useCallback(async (tenantId) => {
    if (!tenantId) {
      setError('No tenant ID provided');
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(\`/api/user/profile?tenantId=\${tenantId}\`, {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });

      if (!response.ok) {
        if (response.status === 401 && retryCount.current < maxRetries) {
          retryCount.current++;
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount.current));
          return fetchProfile(tenantId);
        }
        throw new Error(\`Failed to fetch profile: \${response.statusText}\`);
      }

      const data = await response.json();
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('[useProfile] Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, fetchProfile };
}`);
}

function updateTenantDashboard(content) {
  // Add initialization guard and cleanup
  return content.replace(/export const TenantDashboardLayout = \(.*?\) => {[\s\S]*?}/,
`export const TenantDashboardLayout = ({ children, tenantId }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationAttempt = useRef(0);

  useEffect(() => {
    const initialize = async () => {
      if (initializationAttempt.current > 0) {
        console.debug('[TenantDashboard] Skipping duplicate initialization');
        return;
      }

      initializationAttempt.current++;
      console.debug('[TenantDashboard] Initializing dashboard for tenant:', tenantId);

      try {
        const success = await initializeTenant(tenantId);
        if (success) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[TenantDashboard] Initialization error:', error);
      }
    };

    initialize();

    return () => {
      // Cleanup
      initializationAttempt.current = 0;
      setIsInitialized(false);
    };
  }, [tenantId]);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <div className="tenant-dashboard-layout">
      {children}
    </div>
  );
}`);
}

function updateRegistry() {
  // Update script_registry.md
  const entry = `\n- Version0002_fix_auth_session_initialization.js (${VERSION}): Fixes authentication and session initialization issues, including 401 errors and multiple initialization attempts. [${new Date().toISOString()}] [${ISSUE_REF}]`;
  try {
    fs.appendFileSync(REGISTRY_FILE, entry);
  } catch (e) {
    console.error('Failed to update script_registry.md:', e);
  }

  // Update script_registry.json
  try {
    let json = [];
    if (fs.existsSync(REGISTRY_JSON)) {
      json = JSON.parse(fs.readFileSync(REGISTRY_JSON, 'utf-8'));
    }
    json.push({
      script: 'Version0002_fix_auth_session_initialization.js',
      version: VERSION,
      date: new Date().toISOString(),
      issue: ISSUE_REF,
      status: 'executed',
      description: 'Fixes authentication and session initialization issues, including 401 errors and multiple initialization attempts.'
    });
    fs.writeFileSync(REGISTRY_JSON, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Failed to update script_registry.json:', e);
  }
}

function main() {
  // Create backups
  Object.entries(TARGET_FILES).forEach(([name, path]) => {
    if (fs.existsSync(path)) {
      const backupPath = `scripts/backups/${name}.js.backup-${new Date().toISOString()}.js`;
      fs.copyFileSync(path, backupPath);
    }
  });

  // Update files
  Object.entries(TARGET_FILES).forEach(([name, path]) => {
    if (fs.existsSync(path)) {
      let content = fs.readFileSync(path, 'utf-8');
      let updated = content;

      switch (name) {
        case 'authUtils':
          updated = updateAuthUtils(content);
          break;
        case 'tenantUtils':
          updated = updateTenantUtils(content);
          break;
        case 'userProfile':
          updated = updateUserProfile(content);
          break;
        case 'tenantDashboard':
          updated = updateTenantDashboard(content);
          break;
      }

      if (content !== updated) {
        fs.writeFileSync(path, updated, 'utf-8');
        console.log(`Updated ${name}`);
      }
    }
  });

  updateRegistry();
  console.log('Script execution complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 