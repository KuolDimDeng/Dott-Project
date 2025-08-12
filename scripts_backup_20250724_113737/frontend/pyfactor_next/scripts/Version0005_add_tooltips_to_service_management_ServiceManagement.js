#!/usr/bin/env node

/**
 * Script: Add tooltips to Service Management fields
 * Version: 0005
 * Date: 2025-01-25
 * 
 * Issue: Service Management doesn't have helpful tooltips like Product Management
 * Solution: Add FieldTooltip component and tooltips to form fields
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../src/app/dashboard/components/forms/ServiceManagement.js');

function addTooltipsToServiceManagement() {
  console.log('🔧 Adding tooltips to Service Management...\n');

  try {
    // Read the file
    let content = fs.readFileSync(TARGET_FILE, 'utf8');
    const originalContent = content;

    // Step 1: Add FieldTooltip component after imports
    console.log('📝 Adding FieldTooltip component...');
    const importsEndPattern = /import { logger } from '@\/utils\/logger';[\s\S]*?\n\n/;
    content = content.replace(importsEndPattern, (match) => {
      return match + `// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)} // For mobile
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={\`absolute z-50 \${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72\`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={\`absolute \${position === 'top' ? 'top-full' : 'bottom-full'} left-4\`}>
                <div className={\`\${position === 'top' ? '' : 'rotate-180'}\`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

`;
    });

    // Step 2: Add tooltips to form fields
    console.log('📝 Adding tooltips to form fields...');

    // Add tooltip to Unit field
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?Unit[\s\S]*?<\/label>/,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
              <FieldTooltip text="The unit of measurement for this service (e.g., 'hour' for hourly services, 'session' for fixed sessions, 'project' for project-based work)" />
            </label>`
    );

    // Add tooltip to Price field
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?Price <span className="text-red-500">\*<\/span>[\s\S]*?<\/label>/,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
              <FieldTooltip text="The price charged to customers for this service. This is the amount before any taxes or discounts." />
            </label>`
    );

    // Add tooltip to Sales Tax field
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?Sales Tax[\s\S]*?<\/label>/,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Tax
              <FieldTooltip text="The sales tax rate or amount to be applied to this service. Enter as a percentage (e.g., 10 for 10%) or fixed amount." />
            </label>`
    );

    // Add tooltip to Duration field
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?Duration[\s\S]*?<\/label>/,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
              <FieldTooltip text="How long this service takes to complete. Used for scheduling and billing purposes." />
            </label>`
    );

    // Add tooltip to Category field
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?Category[\s\S]*?<\/label>[\s\S]*?<input[\s\S]*?name="category"/,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Category
              <FieldTooltip text="Group similar services together for better organization and reporting (e.g., 'Consulting', 'Training', 'Support')" />
            </label>
            <input
              type="text"
              name="category"`
    );

    // Add tooltip to Available for Sale checkbox
    content = content.replace(
      /<label htmlFor="is_for_sale" className="ml-2 block text-sm text-gray-900">[\s\S]*?Available for Sale[\s\S]*?<\/label>/,
      `<label htmlFor="is_for_sale" className="ml-2 block text-sm text-gray-900">
            Available for Sale
            <FieldTooltip text="Enable this to make the service available for customers to purchase. Disable to temporarily hide the service." position="bottom" />
          </label>`
    );

    // Add tooltip to Recurring Service checkbox
    content = content.replace(
      /<label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">[\s\S]*?Recurring Service[\s\S]*?<\/label>/,
      `<label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">
            Recurring Service
            <FieldTooltip text="Enable this if the service is billed on a recurring basis (monthly, quarterly, yearly). The billing cycle determines the frequency." position="bottom" />
          </label>`
    );

    // Check if changes were made
    if (content !== originalContent) {
      // Write the updated content
      fs.writeFileSync(TARGET_FILE, content, 'utf8');
      console.log('✅ Successfully added tooltips to ServiceManagement.js');
      
      // Show the changes
      console.log('\n📋 Summary of changes:');
      console.log('- Added FieldTooltip component');
      console.log('- Added tooltips to the following fields:');
      console.log('  - Unit: Explains unit of measurement');
      console.log('  - Price: Clarifies pre-tax amount');
      console.log('  - Sales Tax: Explains tax entry format');
      console.log('  - Duration: Describes scheduling/billing purpose');
      console.log('  - Category: Suggests organization approach');
      console.log('  - Available for Sale: Explains visibility control');
      console.log('  - Recurring Service: Explains billing cycle relationship');
    } else {
      console.log('⚠️  No changes needed - tooltips may have already been added');
    }

  } catch (error) {
    console.error('❌ Error adding tooltips:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Starting Service Management tooltip addition...\n');
addTooltipsToServiceManagement();

console.log('\n✨ Tooltip addition completed successfully!');
console.log('\n📌 Next steps:');
console.log('1. Test the Service Management page to see the tooltips');
console.log('2. Hover over the question mark icons to see helpful information');
console.log('3. Click the icons on mobile to show tooltips');
console.log('4. Verify tooltips display correctly and are helpful');