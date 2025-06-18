#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update (excluding backups and scripts)
const filesToUpdate = [
  './src/app/api/auth/[auth0]/route.js',
  './src/app/auth/components/SignInForm.js',
  './src/app/dashboard/AuthProtectedLayout.js',
  './src/app/dashboard/DashboardClient.js',
  './src/app/onboarding/page.js',
  './src/app/onboarding/page.v2.js',
  './src/app/onboarding/payment/page.js',
  './src/app/tenant/[tenantId]/dashboard/page.js',
  './src/app/tenant/[tenantId]/layout.js',
  './src/app/tenant/[tenantId]/SessionCheck.js',
  './src/app/tenant/create/page.js',
  './src/components/auth/EmailPasswordSignIn.js',
  './src/components/auth/SignInForm_Auth0.js',
  './src/components/auth/SignInForm.js',
  './src/components/AuthButton.js',
  './src/components/Dashboard/DashboardSetup.js',
  './src/components/Onboarding/OnboardingFlow.v2.jsx',
  './src/components/Onboarding/SubscriptionForm.jsx',
  './src/contexts/AuthContext.js',
  './src/contexts/UserContext.js',
  './src/services/userService.js',
  './src/utils/authFlowHandler.js',
  './src/utils/completeOnboardingAuth0.js',
  './src/utils/oauthTestUtils.js',
  './src/utils/onboardingCheck.js',
  './src/utils/onboardingStateMachine.js',
  './src/utils/smartRouting.js'
];

// Counter for changes
let totalChanges = 0;
let filesChanged = 0;

console.log('🔄 Starting URL pattern fix...\n');

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Pattern replacements
  const replacements = [
    // Direct string replacements
    { from: /\/tenant\/\${/g, to: '/${' },
    { from: /\/tenant\/\$\{/g, to: '/${' },
    { from: /`\/tenant\/\$/g, to: '`/$' },
    { from: /'\/tenant\/\$/g, to: "'/$" },
    { from: /"\/tenant\/\$/g, to: '"/$' },
    
    // Pattern with quotes
    { from: /['"`]\/tenant\/([^'"`]+)\/dashboard/g, to: '`/$1/dashboard' },
    
    // In redirect/push calls
    { from: /\.push\(['"`]\/tenant\//g, to: '.push(`/' },
    { from: /\.replace\(['"`]\/tenant\//g, to: '.replace(`/' },
    { from: /redirect\(['"`]\/tenant\//g, to: 'redirect(`/' },
    
    // URL construction
    { from: /url: ['"`]\/tenant\//g, to: 'url: `/' },
    { from: /redirectUrl = ['"`]\/tenant\//g, to: 'redirectUrl = `/' },
    { from: /redirectPath = ['"`]\/tenant\//g, to: 'redirectPath = `/' },
    
    // In conditions (preserve the check logic but not the URL)
    { from: /pathname\.includes\(['"`]\/tenant\/['"]\)/g, to: "pathname.includes('/')" },
    
    // Special case for comments describing the pattern (don't change these)
    // We'll handle these separately
  ];
  
  let changeCount = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(from, to);
    }
  });
  
  // Special handling for template literals with tenant IDs
  content = content.replace(/`\/tenant\/\$\{([^}]+)\}\/dashboard/g, '`/${$1}/dashboard');
  content = content.replace(/'\/tenant\/'\s*\+\s*([^+]+)\s*\+\s*'\/dashboard'/g, "'/' + $1 + '/dashboard'");
  content = content.replace(/"\/tenant\/"\s*\+\s*([^+]+)\s*\+\s*"\/dashboard"/g, '"/" + $1 + "/dashboard"');
  
  // Don't change comments that describe the pattern
  content = content.replace(/\/\/ Pattern: \/tenant\/\{tenantId\}\/dashboard/g, '// Pattern: /tenant/{tenantId}/dashboard (old format)');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${filePath} - ${changeCount} changes`);
    filesChanged++;
    totalChanges += changeCount;
  } else {
    console.log(`ℹ️  No changes needed in ${filePath}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Files changed: ${filesChanged}`);
console.log(`Total URL patterns fixed: ${totalChanges}`);
console.log('\n✨ URL pattern fix complete!');