// This script patches the debug module's browser.js file
// to avoid the "process/browser" dependency error

const fs = require('fs');
const path = require('path');

// Find debug module in node_modules
const findDebugModule = () => {
  const possiblePaths = [
    path.resolve(__dirname, 'node_modules/debug/src/browser.js'),
    path.resolve(__dirname, 'node_modules/.pnpm/debug@4.3.7/node_modules/debug/src/browser.js'),
    ...fs.readdirSync(path.resolve(__dirname, 'node_modules/.pnpm'))
      .filter(dir => dir.startsWith('debug@'))
      .map(dir => path.resolve(__dirname, 'node_modules/.pnpm', dir, 'node_modules/debug/src/browser.js'))
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
};

const patchDebugModule = () => {
  const debugPath = findDebugModule();
  if (!debugPath) {
    console.error('Could not find debug module to patch');
    return false;
  }

  let content = fs.readFileSync(debugPath, 'utf8');
  
  // Patch the problematic code
  const patchedContent = content
    // Replace process checks with direct window checks
    .replace(
      'if (!r && typeof process !== \'undefined\' && \'env\' in process) {',
      'if (!r && typeof window !== \'undefined\' && window.process && window.process.env) {'
    )
    .replace(
      'r = process.env.DEBUG;',
      'r = window.process.env.DEBUG;'
    );

  // Write patched file
  fs.writeFileSync(debugPath, patchedContent, 'utf8');
  console.log(`Patched debug module at ${debugPath}`);
  return true;
};

// Create a process-browser module
const createProcessBrowserModule = () => {
  const dirs = [
    path.resolve(__dirname, 'node_modules/process'),
    path.resolve(__dirname, 'node_modules/process/browser.js'),
  ];

  // Create directories if they don't exist
  dirs.forEach(dir => {
    const dirPath = path.dirname(dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Write the browser.js file
  const browserJsPath = path.resolve(__dirname, 'node_modules/process/browser.js');
  const content = `
// Polyfill for process/browser
var process = module.exports = {};

process.env = { 
  NODE_ENV: (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.NODE_ENV) || 'production',
  DEBUG: (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.DEBUG) || ''
};
process.browser = true;
process.version = '';
process.nextTick = function (fn) {
  setTimeout(fn, 0);
};

// Expose to window for debug module
if (typeof window !== 'undefined') {
  window.process = process;
}
  `;

  fs.writeFileSync(browserJsPath, content, 'utf8');
  console.log(`Created process/browser module at ${browserJsPath}`);
  
  // Also create a package.json
  const packageJsonPath = path.resolve(__dirname, 'node_modules/process/package.json');
  const packageJson = {
    name: 'process',
    version: '0.11.10',
    browser: './browser.js',
    main: './browser.js'
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log(`Created process package.json at ${packageJsonPath}`);
  
  return true;
};

// Run the patches
console.log('Patching debug module and creating process/browser polyfill...');
const debugPatched = patchDebugModule();
const processCreated = createProcessBrowserModule();

if (debugPatched && processCreated) {
  console.log('Patching completed successfully!');
} else {
  console.error('Some patches failed');
  process.exit(1);
} 