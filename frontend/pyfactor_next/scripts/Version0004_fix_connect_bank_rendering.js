/**
 * Version0004_fix_connect_bank_rendering.js
 * 
 * This script fixes the rendering issue with the Connect Bank page in the dashboard.
 * The page was failing to load properly after our modifications to remove region selection.
 * 
 * Created: 2025-04-29
 * Author: System Admin
 * 
 * Purpose: Fix the Connect Bank page rendering in the Banking menu to ensure it properly
 * loads and initializes with the auto-detection of business country.
 */

import fs from 'fs';
import path from 'path';

// Create a simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error || '')
};

// File paths - Updated with correct paths
const dashboardContentPath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/DashboardContent.js'
);

const renderMainContentPath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js'
);

const connectBankPagePath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/banking/connect/page.js'
);

const backupDir = path.resolve(process.cwd(), 'scripts/backups');

// Function to create backup
const createBackup = (filePath, fileName) => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFilePath = path.join(
      backupDir, 
      `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`
    );
    
    // Create backup
    fs.copyFileSync(filePath, backupFilePath);
    logger.info(`Created backup at ${backupFilePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to create backup for ${fileName}:`, error);
    return false;
  }
};

// Function to fix Dashboard content routing
const fixDashboardContent = () => {
  try {
    // Check if file exists
    if (!fs.existsSync(dashboardContentPath)) {
      logger.warn(`DashboardContent.js not found at ${dashboardContentPath}`);
      
      // Try alternative path
      const altPath = path.resolve(
        process.cwd(), 
        'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js'
      );
      
      if (fs.existsSync(altPath)) {
        logger.info(`Found DashboardContent.js at alternative path: ${altPath}`);
        // Update the path
        dashboardContentPath = altPath;
      } else {
        logger.error('DashboardContent.js not found in any expected location');
        return false;
      }
    }
    
    // Read the file
    let content = fs.readFileSync(dashboardContentPath, 'utf8');
    
    // Check if there's a banking connect case in handleBankingClick
    if (content.includes('case "connect":')) {
      logger.info('Banking connect route already exists in DashboardContent.js');
    } else {
      // Find the handleBankingClick function
      const handleBankingPattern = /const\s+handleBankingClick\s*=\s*(?:useCallback\s*)?\(\s*(?:option|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)\s*=>\s*{/;
      
      if (!handleBankingPattern.test(content)) {
        logger.warn('Could not find handleBankingClick function in DashboardContent.js');
        return false;
      }
      
      // Find the switch statement in handleBankingClick
      const switchPattern = /switch\s*\(\s*(?:option|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)\s*{/;
      
      if (!switchPattern.test(content)) {
        logger.warn('Could not find switch statement in handleBankingClick function');
        return false;
      }
      
      // Add connect case to switch statement
      content = content.replace(
        switchPattern,
        (match) => {
          return match + `
      case "connect":
        console.log('[DashboardContent] Banking connect option selected');
        setCurrentView('connect-bank');
        break;`;
        }
      );
      
      // Write the modified content back to the file
      fs.writeFileSync(dashboardContentPath, content);
      logger.info('Successfully added connect bank route to DashboardContent.js');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to fix DashboardContent.js:', error);
    return false;
  }
};

// Function to fix RenderMainContent component
const fixRenderMainContent = () => {
  try {
    // Check if file exists
    if (!fs.existsSync(renderMainContentPath)) {
      logger.warn(`RenderMainContent.js not found at ${renderMainContentPath}`);
      return false;
    }
    
    // Read the file
    let content = fs.readFileSync(renderMainContentPath, 'utf8');
    
    // Check if there's a case for connect-bank view
    if (content.includes('case "connect-bank":')) {
      logger.info('Connect bank rendering already exists in RenderMainContent.js');
    } else {
      // Find the renderActiveComponent function or switch statement
      const renderComponentPattern = /(?:const\s+renderActiveComponent|switch\s*\(\s*(?:view|componentToRender|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\))\s*(?:=\s*\(\)\s*=>\s*)?{/;
      
      if (!renderComponentPattern.test(content)) {
        logger.warn('Could not find component rendering logic in RenderMainContent.js');
        return false;
      }
      
      // Find where the banking views are handled
      const bankingPattern = /case\s*["']banking-dashboard["']:|case\s*["']bank-dashboard["']:|case\s*["']banking["']:/;
      
      if (!bankingPattern.test(content)) {
        logger.warn('Could not find banking cases in RenderMainContent.js');
        
        // Try to find another suitable location to add our case
        const defaultPattern = /default\s*:/;
        
        if (!defaultPattern.test(content)) {
          logger.warn('Could not find default case in RenderMainContent.js');
          return false;
        }
        
        // Add connect-bank case before default
        content = content.replace(
          defaultPattern,
          `case "connect-bank":
           return <ConnectBankPage key={navigationKey} {...props} />;
           
         default:`
        );
        
        // Add import for ConnectBankPage
        const importPattern = /import\s+{[^}]*}\s+from\s+["'][^"']*components["']/;
        if (importPattern.test(content)) {
          content = content.replace(
            importPattern,
            (match) => {
              return match + `\nimport ConnectBankPage from '../banking/connect/page';`;
            }
          );
        } else {
          // Add import at the top of the file
          content = `import ConnectBankPage from '../banking/connect/page';\n${content}`;
        }
      } else {
        // Add connect-bank case after banking case
        content = content.replace(
          bankingPattern,
          (match) => {
            return match + `
            
        case "connect-bank":
          return <ConnectBankPage key={navigationKey} {...props} />;`;
          }
        );
        
        // Add import for ConnectBankPage if needed
        if (!content.includes("import ConnectBankPage")) {
          const importPattern = /import\s+{[^}]*}\s+from\s+["'][^"']*components["']/;
          if (importPattern.test(content)) {
            content = content.replace(
              importPattern,
              (match) => {
                return match + `\nimport ConnectBankPage from '../banking/connect/page';`;
              }
            );
          } else {
            // Add import at the top of the file
            content = `import ConnectBankPage from '../banking/connect/page';\n${content}`;
          }
        }
      }
      
      // Write the modified content back to the file
      fs.writeFileSync(renderMainContentPath, content);
      logger.info('Successfully added connect bank rendering to RenderMainContent.js');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to fix RenderMainContent.js:', error);
    return false;
  }
};

// Function to fix the ConnectBank page
const fixConnectBankPage = () => {
  try {
    // Create directory if it doesn't exist
    const connectBankDir = path.dirname(connectBankPagePath);
    if (!fs.existsSync(connectBankDir)) {
      fs.mkdirSync(connectBankDir, { recursive: true });
      logger.info(`Created directory: ${connectBankDir}`);
    }
    
    // Simplify the ConnectBankPage component and ensure it handles errors properly
    const newContent = `'use client';
import React, { useEffect, useState } from 'react';
import ConnectBankManagement from '../../components/forms/ConnectBankManagement';
import { getAttributeValue } from '@/utils/cognitoUtils';
import { logger } from '@/utils/logger';

export default function ConnectBankPage() {
  const [loading, setLoading] = useState(true);
  const [businessCountry, setBusinessCountry] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusinessCountry = async () => {
      try {
        setLoading(true);
        const country = await getAttributeValue('custom:businesscountry');
        logger.info(\`[ConnectBankPage] Got business country: \${country || 'not set'}\`);
        setBusinessCountry(country || 'US');
      } catch (err) {
        logger.error('[ConnectBankPage] Error fetching business country:', err);
        setError('Failed to retrieve your business country information. Using default settings.');
        setBusinessCountry('US');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessCountry();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading banking connection...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch w-full h-full p-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 mb-4 rounded-md">
          {error}
        </div>
      )}
      <ConnectBankManagement initialCountry={businessCountry} />
    </div>
  );
}`;

    // Write the modified content to the file
    fs.writeFileSync(connectBankPagePath, newContent);
    logger.info('Successfully updated ConnectBankPage component');
    
    return true;
  } catch (error) {
    logger.error('Failed to fix ConnectBankPage:', error);
    return false;
  }
};

// Main execution
const run = async () => {
  logger.info('Starting fix for Connect Bank page rendering...');
  
  // Create backups for existing files before modification
  let dashboardContentBackup = true;
  if (fs.existsSync(dashboardContentPath)) {
    dashboardContentBackup = createBackup(dashboardContentPath, 'DashboardContent.js');
  }
  
  let renderMainContentBackup = true;
  if (fs.existsSync(renderMainContentPath)) {
    renderMainContentBackup = createBackup(renderMainContentPath, 'RenderMainContent.js');
  }
  
  let connectBankPageBackup = true;
  if (fs.existsSync(connectBankPagePath)) {
    connectBankPageBackup = createBackup(connectBankPagePath, 'page.js');
  }
  
  if (!dashboardContentBackup || !renderMainContentBackup || !connectBankPageBackup) {
    logger.warn('Some backups could not be created, but continuing with modifications');
  }
  
  // Fix the files
  const dashboardFixed = fixDashboardContent();
  const renderMainContentFixed = fixRenderMainContent();
  const connectBankPageFixed = fixConnectBankPage();
  
  if (dashboardFixed && renderMainContentFixed && connectBankPageFixed) {
    logger.info('Successfully fixed Connect Bank page rendering');
    process.exit(0);
  } else {
    logger.error('Failed to fix Connect Bank page rendering');
    process.exit(1);
  }
};

// Run the script
run().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
}); 