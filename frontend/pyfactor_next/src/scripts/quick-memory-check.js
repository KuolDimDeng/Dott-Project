/**
 * Quick Memory Check Script
 * 
 * A faster alternative to find-memory-leaks.js that targets only critical areas
 * and common memory issues.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const HIGH_RISK_DIRS = [
  'src/app/dashboard',
  'src/components',
  'src/hooks',
  'src/context'
];

// Critical memory leak patterns
const CRITICAL_PATTERNS = [
  // Event listeners without cleanup
  {
    pattern: /addEventListener\([^)]+\)[^]*?useEffect/g,
    check: (content) => {
      const hasAddListener = content.includes('addEventListener');
      const hasRemoveListener = content.includes('removeEventListener');
      return hasAddListener && !hasRemoveListener;
    },
    risk: 'high',
    description: 'Event listener without cleanup'
  },
  
  // Missing dependency arrays in useEffect
  {
    pattern: /useEffect\(\s*\(\)\s*=>\s*{[^}]*}\s*\)/g,
    risk: 'high',
    description: 'useEffect without dependency array (causes infinite loops)'
  },
  
  // Timers without cleanup
  {
    pattern: /setInterval\(/g,
    check: (content) => {
      return content.includes('setInterval') && 
             !content.includes('clearInterval') && 
             content.includes('useEffect');
    },
    risk: 'high',
    description: 'setInterval without clearInterval in cleanup'
  },
  
  // Unsafe array access
  {
    pattern: /(\w+)\.map\(/g,
    check: (content, match) => {
      // Extract the array name
      const arrayName = match.replace('.map(', '');
      // Check if there's a safety check for this array
      return !content.includes(`${arrayName} &&`) && 
             !content.includes(`${arrayName}?`) &&
             !content.includes(`Array.isArray(${arrayName})`);
    },
    risk: 'medium',
    description: 'Array.map() without null/undefined check'
  },
  
  // Large useStates
  {
    pattern: /const\s+\[\w+,\s*set\w+\]\s*=\s*useState\([^)]*\);(\s*const\s+\[\w+,\s*set\w+\]\s*=\s*useState\([^)]*\);){3,}/g,
    risk: 'medium',
    description: 'Component with many useState hooks (use useReducer instead)'
  }
];

console.log('🔍 Running quick memory check...');

// Store findings
const findings = [];

// Function to scan file for memory issues
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    const fileFindings = [];
    
    // Check for critical patterns
    CRITICAL_PATTERNS.forEach(({ pattern, check, risk, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Skip if detailed check function exists and returns false
          if (check && !check(content, match)) {
            return;
          }
          
          fileFindings.push({
            file: relativePath,
            pattern: pattern.toString(),
            risk,
            description,
            code: match.length > 100 ? match.substring(0, 100) + '...' : match
          });
        });
      }
    });
    
    return fileFindings;
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
    return [];
  }
}

// Function to walk directories
async function walkDirs() {
  for (const dir of HIGH_RISK_DIRS) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`Directory not found: ${dir}`);
      continue;
    }
    
    console.log(`Scanning ${dir}...`);
    await walkDir(fullPath);
  }
}

// Function to recursively walk a directory
async function walkDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other non-code directories
        if (['node_modules', '.next', 'public'].includes(entry.name)) {
          continue;
        }
        await walkDir(fullPath);
      } 
      // Process JavaScript and TypeScript files
      else if (entry.isFile() && (
        entry.name.endsWith('.js') || 
        entry.name.endsWith('.jsx') || 
        entry.name.endsWith('.ts') || 
        entry.name.endsWith('.tsx')
      )) {
        const fileFindings = scanFile(fullPath);
        if (fileFindings.length > 0) {
          findings.push(...fileFindings);
        }
      }
    }
  } catch (error) {
    console.error(`Error walking directory ${dir}:`, error.message);
  }
}

// Check for problematic hooks
async function findProblematicHooks() {
  return new Promise((resolve, reject) => {
    // Find components with many useEffect calls
    exec('grep -r "useEffect" --include="*.js" --include="*.jsx" --include="*.tsx" src/app/dashboard src/components 2>/dev/null | wc -l', (error, stdout) => {
      const useEffectCount = parseInt(stdout.trim());
      console.log(`Found ${useEffectCount} useEffect hooks in codebase`);
      
      // Find components with array map operations
      exec('grep -r ".map(" --include="*.js" --include="*.jsx" --include="*.tsx" src/app/dashboard src/components 2>/dev/null | wc -l', (error2, stdout2) => {
        const mapCount = parseInt(stdout2.trim());
        console.log(`Found ${mapCount} .map() operations in codebase`);
        
        // Try to find the most complex components
        exec('grep -r "useState\\|useEffect\\|useCallback\\|useMemo" --include="*.js" --include="*.jsx" --include="*.tsx" src/app/dashboard src/components 2>/dev/null | sort | uniq -c | sort -nr | head -10', (error3, stdout3) => {
          console.log('Most hook-intensive files:');
          console.log(stdout3);
          resolve();
        });
      });
    });
  });
}

// Generate quick report
async function generateReport() {
  // Walk directories to find issues
  await walkDirs();
  
  // Find problematic hooks
  await findProblematicHooks();
  
  console.log(`\n✅ Found ${findings.length} potential memory issues`);
  
  // Group findings by file
  const byFile = {};
  findings.forEach(finding => {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  });
  
  // Print findings to console
  console.log('\n🔍 MEMORY ISSUES BY FILE:');
  Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([file, fileFindings]) => {
      console.log(`\n📁 ${file} (${fileFindings.length} issues):`);
      fileFindings.forEach(f => {
        console.log(`  - ${f.risk.toUpperCase()} RISK: ${f.description}`);
        console.log(`    ${f.code.replace(/\n/g, ' ').substring(0, 100)}...`);
      });
    });
  
  // Find most problematic files
  console.log('\n🚨 TOP PROBLEMATIC FILES:');
  Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .forEach(([file, fileFindings], index) => {
      console.log(`${index + 1}. ${file} (${fileFindings.length} issues)`);
    });
  
  console.log('\n💡 QUICK FIXES:');
  console.log('1. Add dependency arrays to all useEffect hooks');
  console.log('2. Add removeEventListener cleanup in useEffect return functions');
  console.log('3. Check arrays before calling .map() or other array methods');
  console.log('4. Clear all setInterval/setTimeout calls in useEffect cleanup');
  console.log('5. Use the optimize-component.js script on problematic files:');
  
  if (Object.keys(byFile).length > 0) {
    const worstFile = Object.entries(byFile)
      .sort((a, b) => b[1].length - a[1].length)[0][0];
    console.log(`   node src/scripts/optimize-component.js ${worstFile}`);
  }
}

// Run the report
generateReport().catch(console.error); 