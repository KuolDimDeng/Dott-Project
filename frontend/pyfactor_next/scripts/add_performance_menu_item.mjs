/**
 * Script to add the Performance menu item to listItems.js
 * 
 * Author: System
 * Date: 2025-04-28
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const LIST_ITEMS_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js');

// Create a backup of the file
function createBackup(filePath) {
  const backupDir = path.join(process.cwd(), 'scripts/backups');
  // Ensure the backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.backup-${timestamp}`);
  
  // Copy the original file to the backup location
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  return backupPath;
}

// Main function
async function main() {
  try {
    console.log('Starting to add Performance menu item to listItems.js...');
    
    // Create a backup before making changes
    createBackup(LIST_ITEMS_PATH);
    
    // Read the file content
    let content = fs.readFileSync(LIST_ITEMS_PATH, 'utf8');
    
    // Check if Performance menu item already exists
    if (content.includes("'Performance'") && content.includes("onClick: () => handleHRClick('performance')")) {
      console.log('✅ Performance menu item already exists in listItems.js');
      return;
    }
    
    console.log('❌ Performance menu item is missing, adding it now...');
    
    // Find the HR menu section
    const hrMenuRegex = /(\s*?)(\{[\s\S]*?text: 'HR'[\s\S]*?subItems: \[[\s\S]*?\][\s\S]*?\})/;
    const hrMenuMatch = content.match(hrMenuRegex);
    
    if (!hrMenuMatch) {
      console.log('❌ Could not find HR menu section in listItems.js');
      return;
    }
    
    // Get the HR menu section
    let hrMenuSection = hrMenuMatch[2];
    
    // Find the subItems array in the HR menu section
    const subItemsRegex = /(subItems: \[)([\s\S]*?)(\])/;
    const subItemsMatch = hrMenuSection.match(subItemsRegex);
    
    if (!subItemsMatch) {
      console.log('❌ Could not find subItems array in HR menu section');
      return;
    }
    
    // Prepare the Performance menu item
    const performanceMenuItem = `
        {
          text: 'Performance',
          icon: <AssessmentIcon />,
          onClick: () => handleHRClick('performance')
        },`;
    
    // Find a good position to insert the Performance menu item
    // Look for the Reports menu item
    const reportsMenuItem = hrMenuSection.indexOf("text: 'Reports'");
    if (reportsMenuItem !== -1) {
      // Insert Performance menu item after Reports
      const beforeReports = hrMenuSection.substring(0, reportsMenuItem);
      const reportItemEndRegex = /\{[\s\S]*?text: 'Reports'[\s\S]*?\},/;
      const reportItemMatch = hrMenuSection.match(reportItemEndRegex);
      
      if (reportItemMatch) {
        const afterReports = hrMenuSection.substring(reportsMenuItem + reportItemMatch[0].length);
        
        // Create the updated HR menu section
        const updatedHrMenuSection = beforeReports + reportItemMatch[0] + performanceMenuItem + afterReports;
        
        // Replace the HR menu section in the content
        const updatedContent = content.replace(hrMenuSection, updatedHrMenuSection);
        
        // Write the updated content back to the file
        fs.writeFileSync(LIST_ITEMS_PATH, updatedContent);
        console.log('✅ Added Performance menu item to listItems.js');
      } else {
        console.log('❌ Could not find the end of Reports menu item');
      }
    } else {
      // If Reports menu item is not found, try to add at the end of the subItems array
      const updatedSubItems = subItemsMatch[1] + subItemsMatch[2] + performanceMenuItem + subItemsMatch[3];
      const updatedHrMenuSection = hrMenuSection.replace(subItemsMatch[0], updatedSubItems);
      const updatedContent = content.replace(hrMenuSection, updatedHrMenuSection);
      
      // Write the updated content back to the file
      fs.writeFileSync(LIST_ITEMS_PATH, updatedContent);
      console.log('✅ Added Performance menu item at the end of HR subItems array');
    }
    
  } catch (error) {
    console.error('Error while adding Performance menu item:', error);
  }
}

// Run the main function
main(); 