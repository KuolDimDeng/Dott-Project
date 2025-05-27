#!/usr/bin/env node

/**
 * Version0036_fix_pricing_display_final.mjs
 * 
 * Purpose: Final fix for pricing display issue
 * 1. Ensure pricing component uses correct base prices for USA
 * 2. Add fallback pricing when dynamic pricing fails
 * 3. Force correct pricing display regardless of cache issues
 * 
 * Version: 0036 v1.0
 * Created: 2025-01-27
 * Author: AI Assistant
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/**
 * Utility functions
 */
async function createBackup(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const backupPath = `${filePath}.backup_${BACKUP_TIMESTAMP}`;
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`✅ Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${filePath}:`, error.message);
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fix Pricing component with hardcoded fallback for USA
 */
async function fixPricingComponent() {
  const filePath = path.join(PROJECT_ROOT, 'src/app/components/Pricing.js');
  
  if (!(await fileExists(filePath))) {
    throw new Error(`Pricing component not found at ${filePath}`);
  }

  await createBackup(filePath);
  
  const content = await fs.readFile(filePath, 'utf8');
  
  // Replace the plans array with hardcoded correct pricing for USA
  const updatedContent = content.replace(
    /const plans = \[[\s\S]*?\];/,
    `const plans = [
    {
      name: 'Basic',
      description: 'Perfect for small businesses just getting started',
      price: { 
        monthly: 'FREE', 
        annual: 'FREE' 
      },
      savings: '',
      features: [
        { category: 'Core Business Tools', items: [
          { name: 'Income and expense tracking', included: true },
          { name: 'Invoice creation', included: true },
          { name: 'Automated invoice reminders', included: true },
          { name: 'Multiple users', included: false },
          { name: 'Bank account integration', value: 'Limited (2 accounts)' },
          { name: 'Financial reporting', value: 'Basic' },
          { name: 'Expense categorization', included: true },
        ]},
        { category: 'Global Payment Solutions', items: [
          { name: 'Accept Stripe & PayPal payments', included: true },
          { name: 'Mobile money payments (M-Pesa, etc.)', value: 'Limited' },
          { name: 'Reduced transaction fees', included: false },
          { name: 'Multi-currency support', value: 'Limited' },
          { name: 'Currency exchange services', value: '2% fee' },
          { name: 'Invoice factoring (US & Canada)', included: false },
          { name: 'White-label payment solutions', included: false },
        ]},
        { category: 'Inventory Management', items: [
          { name: 'Basic inventory tracking', included: true },
          { name: 'Low stock alerts', included: false },
          { name: 'Barcode scanning', included: false },
          { name: 'Inventory forecasting', included: false },
          { name: 'Multi-location inventory', included: false },
          { name: 'Custom inventory categories', included: false },
        ]},
        { category: 'Mobile Features', items: [
          { name: 'Mobile app access', included: true },
          { name: 'Mobile Point of Sale (mPOS)', included: false },
          { name: 'Offline mode', value: 'Limited' },
        ]},
        { category: 'Tax & Compliance', items: [
          { name: 'Tax calculation', included: true },
          { name: 'Self-service payroll (0.4% fee)', value: 'Available as add-on' },
          { name: 'Regional compliance updates', included: false },
        ]},
        { category: 'Integrations', items: [
          { name: 'Accounting software integration', value: 'Limited' },
          { name: 'E-commerce platform integration', included: false },
          { name: 'Custom integrations', included: false },
        ]},
        { category: 'Additional Features', items: [
          { name: 'Storage space', value: '2 GB' },
          { name: 'AI-powered business insights', included: false },
          { name: 'Advanced forecasting', included: false },
          { name: 'Custom API access', included: false },
          { name: 'Priority support', included: false },
          { name: 'Dedicated account manager', included: false },
          { name: 'HR & CRM modules', value: 'Add-on' },
        ]},
      ],
      cta: 'Start for Free',
      highlight: false,
      badge: '',
      color: 'bg-gray-50 border-gray-200',
    },
    {
      name: 'Professional',
      description: 'Everything growing businesses need to thrive',
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.monthly?.formatted ? 
            \`\${dynamicPricing.professional.monthly.formatted}/mo\` : '$7.50/mo') :
          '$15/mo',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.professional?.annual?.formatted ? 
            \`\${dynamicPricing.professional.annual.formatted}/mo\` : '$7.50/mo') :
          '$15/mo'
      },
      savings: 'Save 14%',
      features: [
        { category: 'Core Business Tools', items: [
          { name: 'Income and expense tracking', included: true },
          { name: 'Invoice creation', included: true },
          { name: 'Automated invoice reminders', included: true },
          { name: 'Multiple users', included: true },
          { name: 'Bank account integration', value: 'Up to 10 accounts' },
          { name: 'Financial reporting', value: 'Advanced' },
          { name: 'Expense categorization', included: true },
        ]},
        { category: 'Global Payment Solutions', items: [
          { name: 'Accept Stripe & PayPal payments', included: true },
          { name: 'Mobile money payments (M-Pesa, etc.)', included: true },
          { name: 'Reduced transaction fees', included: true },
          { name: 'Multi-currency support', included: true },
          { name: 'Currency exchange services', value: '1.5% fee' },
          { name: 'Invoice factoring (US & Canada)', value: 'Limited' },
          { name: 'White-label payment solutions', value: 'Limited' },
        ]},
        { category: 'Inventory Management', items: [
          { name: 'Basic inventory tracking', included: true },
          { name: 'Low stock alerts', included: true },
          { name: 'Barcode scanning', included: true },
          { name: 'Inventory forecasting', value: 'Limited' },
          { name: 'Multi-location inventory', value: 'Limited' },
          { name: 'Custom inventory categories', value: 'Limited' },
        ]},
        { category: 'Mobile Features', items: [
          { name: 'Mobile app access', included: true },
          { name: 'Mobile Point of Sale (mPOS)', included: true },
          { name: 'Offline mode', included: true },
        ]},
        { category: 'Tax & Compliance', items: [
          { name: 'Tax calculation', included: true },
          { name: 'Self-service payroll (0.4% fee)', value: 'Discounted' },
          { name: 'Regional compliance updates', included: true },
        ]},
        { category: 'Integrations', items: [
          { name: 'Accounting software integration', included: true },
          { name: 'E-commerce platform integration', included: true },
          { name: 'Custom integrations', value: 'Limited' },
        ]},
        { category: 'Additional Features', items: [
          { name: 'Storage space', value: '30 GB' },
          { name: 'AI-powered business insights', included: true },
          { name: 'Advanced forecasting', value: 'Limited' },
          { name: 'Custom API access', included: false },
          { name: 'Priority support', included: true },
          { name: 'Dedicated account manager', included: false },
          { name: 'HR & CRM modules', value: 'Discounted' },
        ]},
      ],
      cta: 'Choose Professional',
      highlight: true,
      badge: 'Most popular',
      color: 'bg-gradient-to-b from-blue-50 to-white border-primary-light',
    },
    {
      name: 'Enterprise',
      description: 'Customized solutions for large organizations',
      price: { 
        monthly: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.monthly?.formatted ? 
            \`\${dynamicPricing.enterprise.monthly.formatted}/mo\` : '$17.50/mo') :
          '$35/mo',
        annual: hasDiscount && userCountry !== 'US' ? 
          (dynamicPricing?.enterprise?.annual?.formatted ? 
            \`\${dynamicPricing.enterprise.annual.formatted}/mo\` : '$17.50/mo') :
          '$35/mo'
      },
      savings: 'Save 14%',
      features: [
        { category: 'Core Business Tools', items: [
          { name: 'Income and expense tracking', included: true },
          { name: 'Invoice creation', included: true },
          { name: 'Automated invoice reminders', included: true },
          { name: 'Multiple users', included: true },
          { name: 'Bank account integration', value: 'Unlimited' },
          { name: 'Financial reporting', value: 'Custom' },
          { name: 'Expense categorization', included: true },
        ]},
        { category: 'Global Payment Solutions', items: [
          { name: 'Accept Stripe & PayPal payments', included: true },
          { name: 'Mobile money payments (M-Pesa, etc.)', included: true },
          { name: 'Reduced transaction fees', included: true },
          { name: 'Multi-currency support', included: true },
          { name: 'Currency exchange services', value: '1% fee' },
          { name: 'Invoice factoring (US & Canada)', included: true },
          { name: 'White-label payment solutions', included: true },
        ]},
        { category: 'Inventory Management', items: [
          { name: 'Basic inventory tracking', included: true },
          { name: 'Low stock alerts', included: true },
          { name: 'Barcode scanning', included: true },
          { name: 'Inventory forecasting', included: true },
          { name: 'Multi-location inventory', included: true },
          { name: 'Custom inventory categories', included: true },
        ]},
        { category: 'Mobile Features', items: [
          { name: 'Mobile app access', included: true },
          { name: 'Mobile Point of Sale (mPOS)', included: true },
          { name: 'Offline mode', included: true },
        ]},
        { category: 'Tax & Compliance', items: [
          { name: 'Tax calculation', included: true },
          { name: 'Self-service payroll (0.4% fee)', value: 'Discounted' },
          { name: 'Regional compliance updates', included: true },
        ]},
        { category: 'Integrations', items: [
          { name: 'Accounting software integration', included: true },
          { name: 'E-commerce platform integration', included: true },
          { name: 'Custom integrations', included: true },
        ]},
        { category: 'Additional Features', items: [
          { name: 'Storage space', value: 'Unlimited' },
          { name: 'AI-powered business insights', included: true },
          { name: 'Advanced forecasting', included: true },
          { name: 'Custom API access', included: true },
          { name: 'Priority support', included: true },
          { name: 'Dedicated account manager', included: true },
          { name: 'HR & CRM modules', value: 'Discounted' },
        ]},
      ],
      cta: 'Contact Sales',
      highlight: false,
      badge: 'Premium',
      color: 'bg-gradient-to-b from-purple-50 to-white border-secondary-main',
    },
  ];`
  );

  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Fixed Pricing component with hardcoded USA pricing');
}

/**
 * Create documentation
 */
async function createDocumentation() {
  const docPath = path.join(PROJECT_ROOT, 'src/app/components/PRICING_DISPLAY_FINAL_FIX.md');
  
  const documentation = `# Pricing Display Final Fix Documentation

## Version: 0036 v1.0
## Date: ${new Date().toISOString().split('T')[0]}
## Purpose: Final fix for pricing display issue with hardcoded USA pricing

## Issue Description
Despite correct logic in the backend, the pricing component was still showing discounted prices ($7.50 and $17.50) for USA users instead of the correct full prices ($15 and $35).

## Root Cause
The pricing component was using the dynamicPricing object which already had the discount applied, regardless of the hasDiscount flag.

## Solution Implemented

### 1. Hardcoded USA Pricing Logic
\`\`\`javascript
price: { 
  monthly: hasDiscount && userCountry !== 'US' ? 
    (dynamicPricing?.professional?.monthly?.formatted ? 
      \`\${dynamicPricing.professional.monthly.formatted}/mo\` : '$7.50/mo') :
    '$15/mo',
  annual: hasDiscount && userCountry !== 'US' ? 
    (dynamicPricing?.professional?.annual?.formatted ? 
      \`\${dynamicPricing.professional.annual.formatted}/mo\` : '$7.50/mo') :
    '$15/mo'
}
\`\`\`

### 2. Logic Flow
1. **USA Users**: Always show $15 and $35 regardless of dynamic pricing
2. **Developing Countries with Discount**: Show dynamic pricing or fallback to $7.50/$17.50
3. **Other Developed Countries**: Show $15 and $35

### 3. Pricing Matrix
| Country Type | Professional | Enterprise | Discount Banner |
|-------------|-------------|------------|----------------|
| USA | $15/mo | $35/mo | No |
| Developed Countries | $15/mo | $35/mo | No |
| Developing Countries | $7.50/mo | $17.50/mo | Yes |

## Files Modified
1. \`/src/app/components/Pricing.js\` - Hardcoded USA pricing logic

## Benefits
- ✅ USA users always see correct pricing
- ✅ Developing countries still get discount
- ✅ No dependency on dynamic pricing for USA
- ✅ Immediate fix regardless of cache issues

## Testing
1. **USA Users**: Should see $15 and $35 with no discount banner
2. **Developing Country Users**: Should see $7.50 and $17.50 with discount banner
3. **Other Developed Countries**: Should see $15 and $35 with no discount banner

## Backup Files Created
All modified files have backup copies with timestamp: \`${BACKUP_TIMESTAMP}\`
`;

  await fs.writeFile(docPath, documentation, 'utf8');
  console.log('✅ Created pricing display final fix documentation');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Version0036_fix_pricing_display_final.mjs');
  console.log('📋 Purpose: Final fix for pricing display with hardcoded USA pricing');
  
  try {
    console.log('\n📝 Step 1: Fixing Pricing component with hardcoded USA pricing...');
    await fixPricingComponent();
    
    console.log('\n📝 Step 2: Creating documentation...');
    await createDocumentation();
    
    console.log('\n✅ SUCCESS: Version0036_fix_pricing_display_final.mjs completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('  ✅ Added hardcoded USA pricing logic to Pricing component');
    console.log('  ✅ USA users will always see $15 and $35');
    console.log('  ✅ Developing countries will still get discount');
    console.log('  ✅ Created comprehensive documentation');
    console.log('\n🎯 Results:');
    console.log('  ✅ USA: Professional $15/mo, Enterprise $35/mo');
    console.log('  ✅ Developing Countries: Professional $7.50/mo, Enterprise $17.50/mo');
    console.log('  ✅ No dependency on dynamic pricing for USA');
    console.log('  ✅ Immediate fix regardless of cache issues');
    
  } catch (error) {
    console.error('\n❌ ERROR: Script execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the script
main(); 