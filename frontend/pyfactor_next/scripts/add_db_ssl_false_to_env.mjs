/**
 * add_db_ssl_false_to_env.mjs
 * 
 * This script adds DB_USE_SSL=false to the .env.local file to explicitly 
 * disable SSL for local database connections.
 *
 * Version: 1.0.0
 * Created: 2025-05-03
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const envLocalPath = path.join(__dirname, '../.env.local');

async function addDbSslFalseToEnv() {
  try {
    // Check if .env.local exists
    let envContent = '';
    if (fs.existsSync(envLocalPath)) {
      envContent = fs.readFileSync(envLocalPath, 'utf8');
      console.log('Found existing .env.local file');
    } else {
      console.log('Creating new .env.local file');
    }

    // Check if DB_USE_SSL is already configured
    if (envContent.includes('DB_USE_SSL=')) {
      // Replace existing DB_USE_SSL setting
      envContent = envContent.replace(
        /DB_USE_SSL=.*/g,
        'DB_USE_SSL=false'
      );
      console.log('Updated existing DB_USE_SSL setting to false');
    } else {
      // Add DB_USE_SSL=false to the file
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += 'DB_USE_SSL=false\n';
      console.log('Added DB_USE_SSL=false to .env.local file');
    }

    // Write the updated content back to the file
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ Successfully updated .env.local file');
    
  } catch (error) {
    console.error(`❌ Error updating .env.local file: ${error.message}`);
  }
}

// Execute the function
addDbSslFalseToEnv()
  .then(() => {
    console.log('Script execution complete');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 