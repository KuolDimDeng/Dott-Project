/**
 * Version0005_update_ConnectBankManagement_props.js
 * 
 * This script updates the ConnectBankManagement component to properly handle
 * the initialCountry prop passed from the ConnectBankPage component.
 * 
 * Created: 2025-04-29
 * Author: System Admin
 * 
 * Purpose: Update ConnectBankManagement to ensure it can receive and use the business
 * country passed from the parent component to fix rendering issues.
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
const targetFilePath = path.resolve(
  process.cwd(), 
  'frontend/pyfactor_next/src/app/dashboard/components/forms/ConnectBankManagement.js'
);
const backupDir = path.resolve(process.cwd(), 'scripts/backups');
const backupFilePath = path.join(
  backupDir, 
  `ConnectBankManagement.js.backup-${new Date().toISOString().replace(/:/g, '-')}`
);

// Function to create backup
const createBackup = () => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup
    fs.copyFileSync(targetFilePath, backupFilePath);
    logger.info(`Created backup at ${backupFilePath}`);
    return true;
  } catch (error) {
    logger.error('Failed to create backup:', error);
    return false;
  }
};

// Function to modify the file
const modifyFile = () => {
  try {
    // Read the file
    let content = fs.readFileSync(targetFilePath, 'utf8');
    
    // Check if the component already accepts the initialCountry prop
    if (content.includes('initialCountry')) {
      logger.info('ConnectBankManagement already handles initialCountry prop');
      return true;
    }
    
    // Update the component function signature to include initialCountry prop
    const componentSignature = /const\s+ConnectBankManagement\s*=\s*\(\s*(\{\s*[^}]*\}\s*|\s*)\)\s*=>/;
    if (componentSignature.test(content)) {
      content = content.replace(
        componentSignature,
        'const ConnectBankManagement = ({ initialCountry = null }) =>'
      );
    } else {
      logger.warn('Could not find ConnectBankManagement component signature');
      return false;
    }
    
    // Find the useEffect that fetches business country
    const useEffectPattern = /useEffect\(\s*\(\)\s*=>\s*{[\s\S]*?fetchBusinessCountry[\s\S]*?}\s*,\s*\[\s*\]\s*\)/;
    
    if (useEffectPattern.test(content)) {
      // Update useEffect to use initialCountry if provided
      content = content.replace(
        useEffectPattern,
        `useEffect(() => {
    // Fetch the business country from Cognito attributes or use the initialCountry prop
    const fetchBusinessCountry = async () => {
      try {
        // If initialCountry is provided, use it directly
        if (initialCountry) {
          console.log(\`Using provided business country: \${initialCountry}\`);
          setBusinessCountry(initialCountry);
          return initialCountry;
        }
        
        // Otherwise fetch from Cognito
        const country = await getAttributeValue('custom:businesscountry');
        setBusinessCountry(country || 'US'); // Default to US if not set
        return country || 'US';
      } catch (err) {
        console.error('Error fetching business country:', err);
        setBusinessCountry('US'); // Default to US on error
        return 'US';
      }
    };

    // Fetch connected accounts
    const fetchConnectedAccounts = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/banking/connected-accounts/');
        if (response.data && Array.isArray(response.data.accounts)) {
          setConnectedAccounts(response.data.accounts);
        } else {
          setConnectedAccounts([]);
        }
      } catch (err) {
        console.error('Error fetching connected accounts:', err);
        setError('Failed to fetch connected accounts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Get the preferred payment gateway from backend
    const getPaymentGatewayFromBackend = async (countryCode) => {
      try {
        const response = await axiosInstance.get(\`/api/banking/payment-gateway/?country=\${countryCode}\`);
        if (response.data && response.data.primary) {
          const gateway = response.data.primary.toLowerCase();
          setPreferredProvider(gateway);
          console.log(\`Using payment gateway for \${countryCode}: \${gateway}\`);
          return gateway;
        } else {
          console.warn(\`No payment gateway found for country \${countryCode}, using default\`);
          setPreferredProvider('plaid');
          return 'plaid';
        }
      } catch (err) {
        console.error('Error fetching payment gateway:', err);
        setPreferredProvider('plaid');
        return 'plaid';
      }
    };

    // Initialize everything
    const init = async () => {
      const country = await fetchBusinessCountry();
      await getPaymentGatewayFromBackend(country);
      await fetchConnectedAccounts();
    };

    init();
  }, [initialCountry])`
      );
    } else {
      logger.warn('Could not find useEffect for fetching business country');
      return false;
    }
    
    // Write the modified content back to the file
    fs.writeFileSync(targetFilePath, content);
    logger.info('Successfully updated ConnectBankManagement.js to handle initialCountry prop');
    
    return true;
  } catch (error) {
    logger.error('Failed to modify file:', error);
    return false;
  }
};

// Main execution
const run = async () => {
  logger.info('Starting ConnectBankManagement.js update...');
  
  // Create backup first
  if (!createBackup()) {
    logger.error('Aborting due to backup failure');
    process.exit(1);
  }
  
  // Modify the file
  if (modifyFile()) {
    logger.info('ConnectBankManagement.js has been successfully updated to handle initialCountry prop');
    process.exit(0);
  } else {
    logger.error('Failed to update ConnectBankManagement.js');
    process.exit(1);
  }
};

// Run the script
run().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
}); 