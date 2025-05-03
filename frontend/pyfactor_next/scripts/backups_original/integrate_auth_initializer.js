/**
 * Script: integrate_auth_initializer.js
 * 
 * This script modifies the RootLayout component to include the AuthInitializer component
 * to ensure AWS Amplify is properly configured on application start.
 */

const fs = require('fs');
const path = require('path');

// Find the root layout file
const LAYOUT_PATHS = [
  path.resolve(__dirname, '../src/app/layout.js'),
  path.resolve(__dirname, '../src/app/layout.jsx'),
  path.resolve(__dirname, '../src/app/layout.tsx')
];

let layoutPath = null;
for (const p of LAYOUT_PATHS) {
  if (fs.existsSync(p)) {
    layoutPath = p;
    break;
  }
}

if (!layoutPath) {
  console.error('Root layout file not found');
  process.exit(1);
}

// Read the layout file
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Create backup
fs.writeFileSync(`${layoutPath}.bak`, layoutContent);

// Check if AuthInitializer is already imported
if (!layoutContent.includes('AuthInitializer')) {
  // Add the import - fix the regex pattern by using a string pattern instead
  const importPattern = 'import';
  let updatedContent = layoutContent;
  
  // Find a good place to add the import - after another import
  if (layoutContent.includes('import')) {
    const importLines = layoutContent.split('\n').filter(line => line.trim().startsWith('import'));
    if (importLines.length > 0) {
      // Add after the last import
      const lastImport = importLines[importLines.length - 1];
      updatedContent = layoutContent.replace(
        lastImport,
        `${lastImport}\nimport AuthInitializer from '@/components/AuthInitializer';`
      );
    } else {
      // Just add at the top if no imports found
      updatedContent = `import AuthInitializer from '@/components/AuthInitializer';\n${layoutContent}`;
    }
  } else {
    // Just add at the top if no imports found
    updatedContent = `import AuthInitializer from '@/components/AuthInitializer';\n${layoutContent}`;
  }
  
  // Add the component to the layout - improved body tag handling
  const bodyTagRegex = /<body[^>]*>/;
  if (bodyTagRegex.test(updatedContent)) {
    const match = bodyTagRegex.exec(updatedContent);
    if (match) {
      const bodyTag = match[0];
      updatedContent = updatedContent.replace(
        bodyTag,
        `${bodyTag}\n        <AuthInitializer />`
      );
    } else {
      console.warn('Could not find exact body tag. You may need to manually add <AuthInitializer /> to your layout.');
    }
  } else {
    console.warn('Could not find body tag. You may need to manually add <AuthInitializer /> to your layout.');
  }
  
  // Write updated file
  fs.writeFileSync(layoutPath, updatedContent);
  console.log('Added AuthInitializer to layout file:', layoutPath);
} else {
  console.log('AuthInitializer already present in layout file');
}
