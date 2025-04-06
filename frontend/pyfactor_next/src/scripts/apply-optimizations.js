/**
 * Apply Optimizations Script
 * 
 * This script applies all optimized component versions to their original files.
 * It also runs the memory analysis on all components.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const COMPONENTS_TO_OPTIMIZE = [
  'src/app/dashboard/components/AppBar.js',
  'src/app/dashboard/components/forms/ProductManagement.js',
  'src/app/dashboard/components/forms/EstimateManagement.js',
  'src/app/dashboard/components/forms/InvoiceManagement.js',
  'src/components/ui/TailwindComponents.js',
  'src/components/auth/SignInForm.js',
  // Add more components here as needed
];

// Check if the script is running in the correct directory
if (!fs.existsSync('src') || !fs.existsSync('package.json')) {
  console.error('❌ This script must be run from the frontend/pyfactor_next directory');
  process.exit(1);
}

// Create backup directory if it doesn't exist
const BACKUP_DIR = path.join(process.cwd(), 'component-backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
}

/**
 * Optimize a single component
 * @param {string} componentPath - Path to the component
 * @returns {Promise<boolean>} - Success status
 */
async function optimizeComponent(componentPath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(componentPath)) {
      console.error(`❌ Component not found: ${componentPath}`);
      resolve(false);
      return;
    }

    console.log(`🔄 Optimizing ${componentPath}...`);
    
    // Run the optimize-component.js script
    exec(`node src/scripts/optimize-component.js ${componentPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error optimizing ${componentPath}:`, error.message);
        resolve(false);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️ Warning while optimizing ${componentPath}:`, stderr);
      }
      
      console.log(stdout);
      
      // Check if optimized file was created
      const optimizedPath = componentPath.replace(/\.js$/, '.optimized.js');
      if (!fs.existsSync(optimizedPath)) {
        console.error(`❌ Optimized file not created: ${optimizedPath}`);
        resolve(false);
        return;
      }
      
      // Create a timestamped backup in the backup directory
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupFilename = path.basename(componentPath).replace('.js', `-${timestamp}.backup.js`);
      const backupPath = path.join(BACKUP_DIR, backupFilename);
      
      try {
        // Copy original to backup directory
        fs.copyFileSync(componentPath, backupPath);
        console.log(`📦 Backed up original to: ${backupPath}`);
        
        // Copy optimized to original
        fs.copyFileSync(optimizedPath, componentPath);
        console.log(`✅ Applied optimized version to: ${componentPath}`);
        
        resolve(true);
      } catch (err) {
        console.error(`❌ Error applying optimizations to ${componentPath}:`, err.message);
        resolve(false);
      }
    });
  });
}

/**
 * Run memory check on all components
 */
async function runMemoryCheck() {
  return new Promise((resolve) => {
    console.log('🔍 Running memory check on all components...');
    
    exec('node src/scripts/quick-memory-check.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error running memory check:', error.message);
        resolve(false);
        return;
      }
      
      console.log(stdout);
      resolve(true);
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting optimization process...');
  
  // First run memory check to see initial state
  await runMemoryCheck();
  
  // Track successfully optimized components
  const results = [];
  
  // Optimize each component
  for (const component of COMPONENTS_TO_OPTIMIZE) {
    const success = await optimizeComponent(component);
    results.push({ component, success });
  }
  
  // Print summary
  console.log('\n📊 Optimization Summary:');
  results.forEach(({ component, success }) => {
    if (success) {
      console.log(`✅ ${component} - Successfully optimized`);
    } else {
      console.log(`❌ ${component} - Failed to optimize`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎉 Successfully optimized ${successCount} out of ${COMPONENTS_TO_OPTIMIZE.length} components`);
  
  // Run memory check again to see improvement
  console.log('\n🔍 Running memory check after optimizations...');
  await runMemoryCheck();
  
  console.log('\n💡 Next steps:');
  console.log('1. Restart the server to apply changes');
  console.log('2. Monitor memory usage with: node scripts/monitor-memory.js');
  console.log('3. If you encounter any issues, restore from backups in:', BACKUP_DIR);
}

// Run the main function
main().catch(console.error); 