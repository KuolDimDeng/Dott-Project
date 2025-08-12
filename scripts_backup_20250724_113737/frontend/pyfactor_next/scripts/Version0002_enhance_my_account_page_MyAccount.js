/**
 * Script: Version0002_enhance_my_account_page_MyAccount.js
 * Purpose: Enhance the My Account page with improved UI, activity log tab, and better organization
 * Created: 2025-01-24
 * 
 * This script:
 * 1. Backs up the original MyAccount.js file
 * 2. Replaces it with the enhanced version
 * 3. Adds Activity Log tab, Security tab, and Billing tab
 * 4. Improves the overall UI design with modern styling
 */

const fs = require('fs');
const path = require('path');

// Define paths
const projectRoot = path.join(__dirname, '..');
const originalFile = path.join(projectRoot, 'src/app/Settings/components/MyAccount.js');
const enhancedFile = path.join(projectRoot, 'src/app/Settings/components/MyAccount.enhanced.js');
const backupFile = path.join(projectRoot, 'src/app/Settings/components/MyAccount.original.backup.js');

console.log('🚀 Starting My Account page enhancement...\n');

try {
  // Check if the enhanced file exists
  if (!fs.existsSync(enhancedFile)) {
    console.error('❌ Enhanced MyAccount.js file not found at:', enhancedFile);
    console.error('Please ensure MyAccount.enhanced.js exists before running this script.');
    process.exit(1);
  }

  // Create backup of original file
  if (fs.existsSync(originalFile)) {
    console.log('📁 Creating backup of original MyAccount.js...');
    fs.copyFileSync(originalFile, backupFile);
    console.log('✅ Backup created at:', backupFile);
  } else {
    console.log('⚠️  No original MyAccount.js found, proceeding with enhancement...');
  }

  // Copy enhanced version to replace original
  console.log('\n📝 Applying enhanced My Account page...');
  fs.copyFileSync(enhancedFile, originalFile);
  console.log('✅ Enhanced My Account page applied successfully!');

  // Log the improvements
  console.log('\n🎨 Enhancements applied:');
  console.log('   ✨ Modern UI with gradient profile header');
  console.log('   ✨ Added tabbed navigation (Account, Activity, Security, Billing)');
  console.log('   ✨ Integrated Activity Log tab with audit trail');
  console.log('   ✨ Added Security Settings tab');
  console.log('   ✨ Added Billing & Subscription tab');
  console.log('   ✨ Improved visual hierarchy and spacing');
  console.log('   ✨ Enhanced responsive design');
  console.log('   ✨ Better organized account information');

  console.log('\n📋 Next steps:');
  console.log('   1. Test the enhanced My Account page in your browser');
  console.log('   2. Navigate to My Account from the user menu');
  console.log('   3. Check all tabs are working correctly');
  console.log('   4. Verify the Activity Log shows audit trail data');

  console.log('\n💡 To revert to the original version:');
  console.log(`   cp ${backupFile} ${originalFile}`);

  console.log('\n✅ Enhancement complete!');

} catch (error) {
  console.error('❌ Error during enhancement:', error.message);
  process.exit(1);
}