'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import * as db from '@/utils/db/database';

export async function GET(request) {
  // Generate a request ID for tracking
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  
  try {
    // System info
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        percentFree: (os.freemem() / os.totalmem() * 100).toFixed(2) + '%'
      },
      uptime: os.uptime(),
      env: process.env.NODE_ENV || 'development'
    };
    
    // Environment variables (filtered for security)
    const envVars = {};
    const allowedPrefixes = ['NEXT_', 'DATABASE_', 'API_', 'DEBUG_'];
    
    Object.keys(process.env).forEach(key => {
      if (allowedPrefixes.some(prefix => key.startsWith(prefix)) || 
          key === 'NODE_ENV' || 
          key === 'PORT') {
        
        // Mask sensitive values
        if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY')) {
          envVars[key] = '[REDACTED]';
        } else {
          envVars[key] = process.env[key];
        }
      }
    });
    
    // Check for config files
    const configFiles = {};
    try {
      const appDir = path.resolve(process.cwd());
      
      // Check for package.json
      try {
        const packageJson = await fs.readFile(path.join(appDir, 'package.json'), 'utf8');
        const packageData = JSON.parse(packageJson);
        configFiles.package = {
          name: packageData.name,
          version: packageData.version,
          dependencies: Object.keys(packageData.dependencies || {}).length,
          devDependencies: Object.keys(packageData.devDependencies || {}).length
        };
      } catch (err) {
        configFiles.package = { error: err.message };
      }
      
      // Check for db.config.json
      try {
        const dbConfigPath = path.join(appDir, 'db.config.json');
        const exists = await fs.access(dbConfigPath).then(() => true).catch(() => false);
        
        if (exists) {
          const dbConfigContent = await fs.readFile(dbConfigPath, 'utf8');
          const dbConfig = JSON.parse(dbConfigContent);
          configFiles.dbConfig = { 
            exists,
            connectionString: dbConfig.connectionString ? 
              dbConfig.connectionString.split('@')[0].replace(/:.+@/, ':***@') + '@' + dbConfig.connectionString.split('@')[1] 
              : undefined,
            ssl: dbConfig.ssl,
            max: dbConfig.max
          };
        } else {
          configFiles.dbConfig = { exists };
        }
      } catch (err) {
        configFiles.dbConfig = { error: err.message };
      }
      
      // Check for next.config.js
      try {
        const nextConfigPath = path.join(appDir, 'next.config.js');
        const exists = await fs.access(nextConfigPath).then(() => true).catch(() => false);
        configFiles.nextConfig = { exists };
      } catch (err) {
        configFiles.nextConfig = { error: err.message };
      }
      
      // Check for .env files
      const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
      for (const file of envFiles) {
        try {
          const envPath = path.join(appDir, file);
          const exists = await fs.access(envPath).then(() => true).catch(() => false);
          configFiles[file] = { exists };
        } catch (err) {
          configFiles[file] = { error: err.message };
        }
      }
    } catch (configError) {
      configFiles.error = configError.message;
    }
    
    // Run database check
    let databaseStatus = { status: 'unknown' };
    try {
      // Use our database utility to test the connection
      console.log(`[${requestId}] Testing database connection...`);
      
      // Test basic query
      const result = await db.query('SELECT NOW() as current_time', [], {
        debug: true,
        requestId
      });
      
      databaseStatus = {
        status: 'connected',
        timestamp: result.rows[0]?.current_time,
        message: 'Database connection successful'
      };
      
      // Check tenant schemas
      const schemaQuery = `
        SELECT 
          schema_name,
          COUNT(*) as table_count
        FROM 
          information_schema.schemata s
        LEFT JOIN 
          information_schema.tables t ON s.schema_name = t.table_schema
        WHERE 
          schema_name LIKE 'tenant_%' OR schema_name IN ('public')
        GROUP BY 
          schema_name
        ORDER BY 
          schema_name
      `;
      
      const schemaResult = await db.query(schemaQuery, [], { requestId });
      databaseStatus.schemas = schemaResult.rows;
      
      // Get product table info
      const productTablesQuery = `
        SELECT 
          table_schema,
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE 
             table_schema = t.table_schema AND table_name = t.table_name
          ) as column_count
        FROM 
          information_schema.tables t
        WHERE 
          table_name LIKE '%product%'
        ORDER BY 
          table_schema, table_name
      `;
      
      const productTablesResult = await db.query(productTablesQuery, [], { requestId });
      databaseStatus.productTables = productTablesResult.rows;
      
      // Get recent products
      const recentProductsQuery = `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name = 'products'
        ORDER BY table_schema
      `;
      
      const recentProductsResult = await db.query(recentProductsQuery, [], { requestId });
      databaseStatus.productSchemas = recentProductsResult.rows;
      
      // For each schema.products table, get sample data
      databaseStatus.sampleProducts = {};
      
      for (const row of recentProductsResult.rows) {
        const schema = row.table_schema;
        try {
          const sampleQuery = `
            SELECT * FROM "${schema}"."products" 
            ORDER BY created_at DESC 
            LIMIT 5
          `;
          const sampleResult = await db.query(sampleQuery, [], { requestId });
          databaseStatus.sampleProducts[schema] = sampleResult.rows;
        } catch (sampleError) {
          databaseStatus.sampleProducts[schema] = { error: sampleError.message };
        }
      }
    } catch (dbError) {
      console.error(`[${requestId}] Database status check error:`, dbError);
      databaseStatus = {
        status: 'error',
        message: dbError.message,
        code: dbError.code,
        stack: process.env.NODE_ENV !== 'production' ? dbError.stack : undefined
      };
    }
    
    // Return the combined status
    return NextResponse.json({
      requestId,
      timestamp: new Date().toISOString(),
      system: systemInfo,
      environment: envVars,
      config: configFiles,
      database: databaseStatus
    });
  } catch (error) {
    console.error(`[${requestId}] System status error:`, error);
    return NextResponse.json({ 
      requestId,
      error: 'Failed to get system status',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
} 