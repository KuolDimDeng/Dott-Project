// import { getDevTenantId } from '@/context/DevTenantContext';
import { logger } from '@/utils/serverLogger';

/**
 * Get database configuration based on the current environment
 * This function always returns AWS RDS configuration as specified by user preference
 * @returns {Object} Database configuration object
 */
export const getDbConfig = () => {
  logger.info('Always using AWS RDS as specified by user preference');
  
  // Always use AWS RDS credentials with correct property names for pg module
  return {
    host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    port: process.env.RDS_PORT || 5432,
    database: process.env.RDS_DB_NAME || 'dott_main',
    user: process.env.RDS_USERNAME || 'dott_admin', // 'user' is the correct property for pg
    username: process.env.RDS_USERNAME || 'dott_admin', // Keep for backward compatibility
    password: process.env.RDS_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
    ssl: { rejectUnauthorized: false }
  };
};

/**
 * Create a database connector with the current tenant context
 * @param {Object} options - Additional options for the connection
 * @returns {Object} Database connector with tenant context
 */
export const createDbConnector = (options = {}) => {
  const config = getDbConfig();
  
  // In development mode, simulate database connection
  if (process.env.NODE_ENV !== 'production') {
    return createDevModeConnector(options);
  }
  
  // In production, create an actual database connection
  // This would use a real database library like pg or mysql
  // ...
};

/**
 * Create a development mode database connector that simulates tenant isolation
 * @param {Object} options - Additional options for the connection
 * @returns {Object} Mock database connector with tenant isolation
 */
const createDevModeConnector = (options = {}) => {
  // Handle direct access for Kuol Deng
  const directAccessTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
  
  // Get tenant ID for row-level security (RLS)
  const tenantId = options.tenantId || 
                   (typeof localStorage !== 'undefined' && localStorage.getItem('dev-tenant-id')) || 
                   (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tenant_id')) ||
                   directAccessTenantId; // Fall back to Kuol Deng's tenant ID
  
  logger.debug(`[DB] Creating dev mode connector for tenant: ${tenantId}`);
  
  // Create in-memory tables for development
  const tables = {
    products: [],
    services: [],
    estimates: [],
    customers: [],
    orders: [],
    invoices: [],
    // Add more tables as needed
  };
  
  // Load data from localStorage if available
  if (typeof window !== 'undefined') {
    Object.keys(tables).forEach(tableName => {
      try {
        const key = `dev_db_${tenantId}_${tableName}`;
        const data = localStorage.getItem(key);
        if (data) {
          tables[tableName] = JSON.parse(data);
          logger.debug(`[DB] Loaded ${tables[tableName].length} records for ${tableName}`);
        }
      } catch (error) {
        logger.error(`[DB] Error loading table ${tableName} from localStorage:`, error);
      }
    });
  }
  
  // Helper to save table to localStorage
  const saveTable = (tableName, data) => {
    if (typeof window !== 'undefined') {
      try {
        const key = `dev_db_${tenantId}_${tableName}`;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        logger.error(`[DB] Error saving table ${tableName} to localStorage:`, error);
      }
    }
  };
  
  // Create a mock connector with basic CRUD operations
  // Each operation applies tenant filtering for security
  return {
    query: async (sql, params = []) => {
      logger.debug(`[DB] Query: ${sql}`, params);
      
      // Mock implementation - in real code, this would execute SQL
      // For now, just simulate tenant-aware queries
      
      // Example query parser to demonstrate RLS
      if (sql.includes('SELECT') && sql.includes('FROM products')) {
        // Apply RLS filtering
        const filtered = tables.products.filter(p => p.tenant_id === tenantId);
        return { rows: filtered };
      }
      
      return { rows: [] };
    },
    
    // Create a record with tenant ID
    insert: async (tableName, data) => {
      if (!tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }
      
      // Add tenant ID for RLS security
      const record = {
        ...data,
        tenant_id: tenantId,
        id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: data.created_at || new Date().toISOString()
      };
      
      tables[tableName].push(record);
      saveTable(tableName, tables[tableName]);
      
      logger.debug(`[DB] Inserted record into ${tableName} with ID ${record.id}`);
      return record;
    },
    
    // Find records with tenant filtering
    find: async (tableName, condition = {}) => {
      if (!tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }
      
      // Filter by tenant ID for security
      const filtered = tables[tableName].filter(record => {
        // Always apply tenant filter
        if (record.tenant_id !== tenantId) return false;
        
        // Apply additional condition filters
        for (const key in condition) {
          if (record[key] !== condition[key]) return false;
        }
        
        return true;
      });
      
      return filtered;
    },
    
    // Update with tenant verification
    update: async (tableName, id, data) => {
      if (!tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }
      
      // Find record index with tenant verification
      const index = tables[tableName].findIndex(
        record => record.id === id && record.tenant_id === tenantId
      );
      
      if (index === -1) {
        throw new Error(`Record not found or not owned by tenant`);
      }
      
      // Update record, preserving tenant ID
      const updated = {
        ...tables[tableName][index],
        ...data,
        tenant_id: tenantId, // Prevent tenant ID change
        updated_at: new Date().toISOString()
      };
      
      tables[tableName][index] = updated;
      saveTable(tableName, tables[tableName]);
      
      logger.debug(`[DB] Updated record in ${tableName} with ID ${id}`);
      return updated;
    },
    
    // Delete with tenant verification
    delete: async (tableName, id) => {
      if (!tables[tableName]) {
        throw new Error(`Table ${tableName} does not exist`);
      }
      
      // Find record index with tenant verification
      const index = tables[tableName].findIndex(
        record => record.id === id && record.tenant_id === tenantId
      );
      
      if (index === -1) {
        throw new Error(`Record not found or not owned by tenant`);
      }
      
      // Remove record
      const deleted = tables[tableName].splice(index, 1)[0];
      saveTable(tableName, tables[tableName]);
      
      logger.debug(`[DB] Deleted record from ${tableName} with ID ${id}`);
      return deleted;
    },
    
    // Get current tenant context
    getTenantContext: () => {
      return {
        tenantId,
        schemaName: `tenant_${tenantId.replace(/-/g, '_')}`
      };
    }
  };
}; 