/**
 * Version0007_simple_connect_bank_fix.js
 * 
 * This script adds the connect-bank case in a simpler way by looking for common
 * case patterns in the RenderMainContent.js file and inserting our case there.
 * 
 * Created: 2025-04-29
 * Author: System Admin
 */

import fs from 'fs';
import path from 'path';

// Create a simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error || '')
};

// File path
const renderMainContentPath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js'
);

// Create a new ConnectBankPage component
const connectBankPagePath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/banking/connect/page.js'
);

// Create backup
const backupDir = path.resolve(process.cwd(), 'scripts/backups');
const backupFilePath = path.join(
  backupDir, 
  `RenderMainContent.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
);

try {
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create backup
  fs.copyFileSync(renderMainContentPath, backupFilePath);
  logger.info(`Created backup at ${backupFilePath}`);
  
  // Read the file content
  let content = fs.readFileSync(renderMainContentPath, 'utf8');
  
  // Check if connect-bank case already exists
  if (content.includes('case "connect-bank":')) {
    logger.info('connect-bank case already exists in the file');
  } else {
    // Find a good spot to add our case - find an existing case to use as reference
    const pattern = /case\s*["']([\w-]+)["']:\s*\n\s*return\s*[^;]*;/g;
    const matches = [...content.matchAll(pattern)];
    
    if (matches.length === 0) {
      logger.error('Could not find suitable case pattern in the file');
      process.exit(1);
    }
    
    // Get the first match
    const match = matches[0];
    const matchPosition = match.index;
    
    // Check if import for ConnectBankPage exists, if not add it
    if (!content.includes("import ConnectBankPage from")) {
      content = "import ConnectBankPage from '../banking/connect/page';\n" + content;
      logger.info('Added import for ConnectBankPage');
    }
    
    // Create our case statement based on the found pattern
    const caseStatement = `case "connect-bank":
      return <ConnectBankPage key={navigationKey} />;

      `;
    
    // Insert our case before the found case
    content = content.slice(0, matchPosition) + caseStatement + content.slice(matchPosition);
    logger.info('Added connect-bank case to RenderMainContent.js');
    
    // Write the updated content
    fs.writeFileSync(renderMainContentPath, content);
  }
  
  // Make sure the ConnectBankPage component exists
  const connectBankPageDir = path.dirname(connectBankPagePath);
  if (!fs.existsSync(connectBankPageDir)) {
    fs.mkdirSync(connectBankPageDir, { recursive: true });
    logger.info(`Created directory: ${connectBankPageDir}`);
  }
  
  // Create or update the ConnectBankPage component
  const connectBankPageContent = `'use client';
import React, { useEffect, useState } from 'react';
import ConnectBankManagement from '../../components/forms/ConnectBankManagement';
import { getAttributeValue } from '@/utils/cognitoUtils';
import { logger } from '@/utils/logger';

export default function ConnectBankPage({ key }) {
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
  
  // Write or update the ConnectBankPage component
  fs.writeFileSync(connectBankPagePath, connectBankPageContent);
  logger.info('Successfully created/updated ConnectBankPage component');
  
  process.exit(0);
  
} catch (error) {
  logger.error('Error updating files:', error);
  process.exit(1);
} 