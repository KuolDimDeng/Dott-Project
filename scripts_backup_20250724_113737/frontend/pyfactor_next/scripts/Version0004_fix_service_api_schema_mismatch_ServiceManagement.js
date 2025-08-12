#!/usr/bin/env node

/**
 * Script: Fix Service Management API schema mismatch
 * Version: 0004
 * Date: 2025-01-25
 * 
 * Issue: Service Management frontend uses fields that don't exist in the database
 * Solution: Update Service Management to use the correct database fields
 * Database fields: name, description, price, is_for_sale, is_recurring, salestax, duration, billing_cycle, unit
 * Frontend fields to map: sku->unit, cost->salestax, is_active->is_for_sale, duration_unit->billing_cycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../src/app/dashboard/components/forms/ServiceManagement.js');

function fixServiceSchemaMapping() {
  console.log('🔧 Fixing Service Management schema mapping...\n');

  try {
    // Read the file
    let content = fs.readFileSync(TARGET_FILE, 'utf8');
    const originalContent = content;

    // Fix 1: Update the form state to match database schema
    console.log('📝 Updating form state to match database schema...');
    content = content.replace(
      /const \[formData, setFormData\] = useState\({[\s\S]*?\}\);/,
      `const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '', // was sku
    price: '',
    salestax: '', // was cost
    duration: '',
    billing_cycle: 'monthly', // was duration_unit
    is_for_sale: true, // was is_active
    is_recurring: false,
    notes: '' // keep for frontend display
  });`
    );

    // Fix 2: Update handleEditService to map fields correctly
    console.log('📝 Updating handleEditService field mapping...');
    content = content.replace(
      /setFormData\({[\s\S]*?name: service\.name \|\| '',[\s\S]*?\}\);/,
      `setFormData({
      name: service.name || '',
      description: service.description || '',
      unit: service.unit || service.sku || '', // backward compatibility
      price: service.price || '',
      salestax: service.salestax || service.cost || '', // backward compatibility
      duration: service.duration || '',
      billing_cycle: service.billing_cycle || service.duration_unit || 'monthly',
      is_for_sale: service.is_for_sale !== undefined ? service.is_for_sale : (service.is_active !== false),
      is_recurring: service.is_recurring || false,
      notes: service.notes || ''
    });`
    );

    // Fix 3: Update create service API call to use correct fields
    console.log('📝 Updating create service API payload...');
    content = content.replace(
      /body: JSON\.stringify\({[\s\S]*?\.\.\.formData,[\s\S]*?price: parseFloat\(formData\.price\) \|\| 0,[\s\S]*?cost: parseFloat\(formData\.cost\) \|\| 0,[\s\S]*?duration: parseInt\(formData\.duration\) \|\| 0[\s\S]*?\}\)/,
      `body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          unit: formData.unit,
          price: parseFloat(formData.price) || 0,
          salestax: parseFloat(formData.salestax) || 0,
          duration: formData.duration,
          billing_cycle: formData.billing_cycle,
          is_for_sale: formData.is_for_sale,
          is_recurring: formData.is_recurring
        })`
    );

    // Fix 4: Update update service API call to use correct fields
    console.log('📝 Updating update service API payload...');
    content = content.replace(
      /const response = await fetch\(`\/api\/inventory\/services\/\$\{selectedService\.id\}`, \{[\s\S]*?body: JSON\.stringify\({[\s\S]*?\}\)[\s\S]*?\}\);/,
      `const response = await fetch(\`/api/inventory/services/\${selectedService.id}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          unit: formData.unit,
          price: parseFloat(formData.price) || 0,
          salestax: parseFloat(formData.salestax) || 0,
          duration: formData.duration,
          billing_cycle: formData.billing_cycle,
          is_for_sale: formData.is_for_sale,
          is_recurring: formData.is_recurring
        })
      });`
    );

    // Fix 5: Update form labels to reflect correct field names
    console.log('📝 Updating form labels...');
    
    // Update SKU to Unit
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?SKU[\s\S]*?<\/label>[\s\S]*?name="sku"/g,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              name="unit"`
    );

    // Update Cost to Sales Tax
    content = content.replace(
      /<label className="block text-sm font-medium text-gray-700 mb-1">[\s\S]*?Cost[\s\S]*?<\/label>[\s\S]*?name="cost"/g,
      `<label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Tax
            </label>
            <input
              type="number"
              name="salestax"`
    );

    // Update Duration Unit to Billing Cycle
    content = content.replace(
      /name="duration_unit"[\s\S]*?value=\{formData\.duration_unit\}/g,
      'name="billing_cycle"\n              value={formData.billing_cycle}'
    );

    // Update duration unit options to billing cycle options
    content = content.replace(
      /<option value="minutes">Minutes<\/option>[\s\S]*?<option value="hours">Hours<\/option>[\s\S]*?<option value="days">Days<\/option>/g,
      `<option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One Time</option>`
    );

    // Update Active Service to For Sale
    content = content.replace(
      /name="is_active"[\s\S]*?id="is_active"[\s\S]*?checked=\{formData\.is_active\}/g,
      'name="is_for_sale"\n            id="is_for_sale"\n            checked={formData.is_for_sale}'
    );

    content = content.replace(
      /<label htmlFor="is_active"[\s\S]*?>[\s\S]*?Active Service[\s\S]*?<\/label>/g,
      '<label htmlFor="is_for_sale" className="ml-2 block text-sm text-gray-900">\n            Available for Sale\n          </label>'
    );

    // Fix 6: Add is_recurring checkbox
    console.log('📝 Adding recurring service checkbox...');
    content = content.replace(
      /(<div className="flex items-center">[\s\S]*?Available for Sale[\s\S]*?<\/div>)/,
      `$1
        
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            name="is_recurring"
            id="is_recurring"
            checked={formData.is_recurring}
            onChange={handleFormChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">
            Recurring Service
          </label>
        </div>`
    );

    // Fix 7: Update table display to show correct fields
    console.log('📝 Updating table display fields...');
    
    // Update SKU column to Unit
    content = content.replace(
      /<th[\s\S]*?>SKU<\/th>/g,
      '<th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Unit</th>'
    );

    // Update table data to show unit instead of sku
    content = content.replace(
      /\{service\.sku \|\| 'N\/A'\}/g,
      '{service.unit || service.sku || \'N/A\'}'
    );

    // Update status display to show For Sale status
    content = content.replace(
      /service\.is_active !== false/g,
      'service.is_for_sale !== false'
    );

    content = content.replace(
      /\{service\.is_active !== false \? 'Active' : 'Inactive'\}/g,
      '{service.is_for_sale !== false ? \'For Sale\' : \'Not for Sale\'}'
    );

    // Fix 8: Update search filter to use correct fields
    console.log('📝 Updating search filter...');
    content = content.replace(
      /service\.sku\?\.toLowerCase\(\)/g,
      'service.unit?.toLowerCase()'
    );

    // Fix 9: Update service details display
    console.log('📝 Updating service details display...');
    content = content.replace(
      /<h3 className="text-sm font-medium text-gray-500">SKU<\/h3>[\s\S]*?\{selectedService\.sku \|\| 'Not specified'\}/g,
      '<h3 className="text-sm font-medium text-gray-500">Unit</h3>\n            <p className="mt-1 text-sm text-gray-900">{selectedService.unit || selectedService.sku || \'Not specified\'}'
    );

    content = content.replace(
      /<h3 className="text-sm font-medium text-gray-500">Cost<\/h3>[\s\S]*?\$\{parseFloat\(selectedService\.cost \|\| 0\)\.toFixed\(2\)\}/g,
      '<h3 className="text-sm font-medium text-gray-500">Sales Tax</h3>\n            <p className="mt-1 text-sm text-gray-900">${parseFloat(selectedService.salestax || selectedService.cost || 0).toFixed(2)}'
    );

    // Check if changes were made
    if (content !== originalContent) {
      // Write the updated content
      fs.writeFileSync(TARGET_FILE, content, 'utf8');
      console.log('✅ Successfully updated ServiceManagement.js');
      
      // Show the changes
      console.log('\n📋 Summary of changes:');
      console.log('- Updated form fields to match database schema');
      console.log('- Mapped frontend fields to database fields:');
      console.log('  - sku → unit');
      console.log('  - cost → salestax');
      console.log('  - is_active → is_for_sale');
      console.log('  - duration_unit → billing_cycle');
      console.log('- Added is_recurring checkbox');
      console.log('- Updated all labels and display text');
      console.log('- Maintained backward compatibility for data display');
    } else {
      console.log('⚠️  No changes needed - file may have already been updated');
    }

  } catch (error) {
    console.error('❌ Error fixing Service Management schema:', error);
    process.exit(1);
  }
}

// Run the fix
console.log('🚀 Starting Service Management schema fix...\n');
fixServiceSchemaMapping();

console.log('\n✨ Schema fix completed successfully!');
console.log('\n📌 Next steps:');
console.log('1. Test the Service Management page to verify fields display correctly');
console.log('2. Create a new service to test the form submission');
console.log('3. Edit an existing service to test the update functionality');
console.log('4. Verify that data is saved correctly to the database');