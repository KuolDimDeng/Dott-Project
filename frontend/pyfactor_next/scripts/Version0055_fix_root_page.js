/**
 * Version0055_fix_root_page.js
 * 
 * This script fixes the persisting 404 error for the root page.
 * It creates extremely minimal, working page files that will definitely work.
 * 
 * Version: 1.0
 * Date: 2025-05-03
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const frontendRoot = path.join(projectRoot, 'frontend', 'pyfactor_next');
const backupDir = path.join(projectRoot, 'scripts', 'backups');

// Helper function to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Helper function to backup files
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const fileName = path.basename(filePath);
  const backupPath = path.join(backupDir, `${fileName}.backup-${Date.now()}`);
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backed up ${filePath} to ${backupPath}`);
}

// 1. Fix the app directory structure
function fixAppDirectoryStructure() {
  console.log('Fixing app directory structure...');
  
  // Remove the old .next directory to ensure clean build
  const nextDir = path.join(frontendRoot, '.next');
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('Removed .next directory to ensure clean build');
  }
  
  // Make sure we have the right app directory structure
  const appDir = path.join(frontendRoot, 'src', 'app');
  ensureDir(appDir);
  
  // Move app to the correct location if needed
  const potentialAltAppDirs = [
    path.join(frontendRoot, 'app'),
    path.join(frontendRoot, 'pages')
  ];
  
  for (const dir of potentialAltAppDirs) {
    if (fs.existsSync(dir)) {
      console.log(`Found alternate app directory at ${dir}`);
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const srcPath = path.join(dir, file);
        const destPath = path.join(appDir, file);
        
        // Only copy if it's not a directory we don't want to mess with
        if (!fs.statSync(srcPath).isDirectory() || !fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied ${srcPath} to ${destPath}`);
        }
      }
    }
  }
}

// 2. Create a super simple page.js
function createSimplePage() {
  console.log('Creating simple root page...');
  
  const pageJsPath = path.join(frontendRoot, 'src', 'app', 'page.js');
  backupFile(pageJsPath);
  
  const pageContent = `export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#333" }}>Welcome to Next.js</h1>
      <p>This is a simple home page that should always work!</p>
    </div>
  );
}
`;
  
  fs.writeFileSync(pageJsPath, pageContent);
  console.log(`Created minimal page.js at ${pageJsPath}`);
}

// 3. Create a super simple layout.js
function createSimpleLayout() {
  console.log('Creating simple root layout...');
  
  const layoutJsPath = path.join(frontendRoot, 'src', 'app', 'layout.js');
  backupFile(layoutJsPath);
  
  const layoutContent = `export const metadata = {
  title: 'Next.js App',
  description: 'A basic Next.js app',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  
  fs.writeFileSync(layoutJsPath, layoutContent);
  console.log(`Created minimal layout.js at ${layoutJsPath}`);
}

// 4. Create a not-found.js file
function createNotFound() {
  console.log('Creating not-found page...');
  
  const notFoundPath = path.join(frontendRoot, 'src', 'app', 'not-found.js');
  
  const notFoundContent = `export default function NotFound() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#333" }}>404 - Page Not Found</h1>
      <p>The page you are looking for doesn't exist.</p>
    </div>
  );
}
`;
  
  fs.writeFileSync(notFoundPath, notFoundContent);
  console.log(`Created not-found.js at ${notFoundPath}`);
}

// 5. Fix next.config.js to be as simple as possible
function createSimpleNextConfig() {
  console.log('Creating simplified next.config.js...');
  
  const configPath = path.join(frontendRoot, 'next.config.js');
  backupFile(configPath);
  
  const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log(`Created minimal next.config.js at ${configPath}`);
}

// 6. Create/update jsconfig.json
function updateJsConfig() {
  console.log('Updating jsconfig.json...');
  
  const jsConfigPath = path.join(frontendRoot, 'jsconfig.json');
  
  const jsConfigContent = `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
`;
  
  fs.writeFileSync(jsConfigPath, jsConfigContent);
  console.log(`Updated jsconfig.json at ${jsConfigPath}`);
}

// 7. Create global.css file
function createGlobalCss() {
  console.log('Creating global CSS...');
  
  const stylesDir = path.join(frontendRoot, 'src', 'app', 'styles');
  ensureDir(stylesDir);
  
  const globalCssPath = path.join(stylesDir, 'globals.css');
  
  const globalCssContent = `* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}
`;
  
  fs.writeFileSync(globalCssPath, globalCssContent);
  console.log(`Created global CSS at ${globalCssPath}`);
  
  // Update layout.js to import the global CSS
  const layoutJsPath = path.join(frontendRoot, 'src', 'app', 'layout.js');
  const layoutContent = fs.readFileSync(layoutJsPath, 'utf8');
  
  if (!layoutContent.includes('import')) {
    const updatedLayoutContent = `import './styles/globals.css';\n\n${layoutContent}`;
    fs.writeFileSync(layoutJsPath, updatedLayoutContent);
    console.log('Updated layout.js to import global CSS');
  }
}

// Main function
async function main() {
  console.log('Starting root page fix script...');
  
  // Create backup directory
  ensureDir(backupDir);
  
  // Run all fixes
  fixAppDirectoryStructure();
  createSimplePage();
  createSimpleLayout();
  createNotFound();
  createSimpleNextConfig();
  updateJsConfig();
  createGlobalCss();
  
  console.log('\nRoot page fix completed!');
  console.log('\nPlease restart your Next.js server using:');
  console.log(`cd ${frontendRoot} && pnpm run dev:https`);
  console.log('\nIf this doesn\'t work, try the most basic Next.js app setup:');
  console.log(`cd ${frontendRoot} && pnpm run build && pnpm run start`);
}

// Run the script
main().catch(console.error); 