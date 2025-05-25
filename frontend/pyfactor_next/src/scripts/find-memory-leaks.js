/**
 * Memory Leak Detection Script
 * 
 * This script analyzes the codebase to find potential memory leaks and excessive memory usage.
 * Run with: node src/scripts/find-memory-leaks.js
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../../src');
const EXCLUDE_DIRS = ['node_modules', '.next', 'public', 'logs'];
const HIGH_RISK_PATTERNS = [
  // Event listener leaks
  { pattern: /addEventListener\([^)]+\)/g, risk: 'high', type: 'event-listener', 
    description: 'Event listener without matching removeEventListener' },
  
  // Memory-intensive array operations
  { pattern: /\.map\([\s\S]*?\.map\(/g, risk: 'medium', type: 'nested-array-ops',
    description: 'Nested array map operations' },
  { pattern: /useMemo\(\s*\(\)\s*=>\s*\[\]\s*,\s*\[\s*\]\s*\)/g, risk: 'medium', type: 'empty-dependency-array',
    description: 'useMemo with empty dependency array creating new objects' },
  
  // React hooks issues
  { pattern: /useState\(\[\]\)/g, risk: 'medium', type: 'empty-array-state',
    description: 'useState with empty array (creates new reference each render)' },
  { pattern: /useEffect\(\s*\(\)\s*=>\s*{[\s\S]*?}\s*\)/g, risk: 'medium', type: 'missing-dependency-array',
    description: 'useEffect without dependency array' },
  
  // Large objects in memory
  { pattern: /const\s+\w+\s*=\s*{(?:[^}{]+|{(?:[^}{]+|{[^}{]*})*})*}/g, risk: 'medium', type: 'large-object-literal',
    description: 'Large object literal declaration' },
  
  // Memory leaks from timers
  { pattern: /setInterval\(/g, risk: 'high', type: 'interval',
    description: 'setInterval without clearInterval' },
  { pattern: /setTimeout\(/g, risk: 'medium', type: 'timeout',
    description: 'setTimeout without clearTimeout' },
  
  // Risky data fetching
  { pattern: /fetch\([^)]*\)(?!\.finally)/g, risk: 'medium', type: 'fetch-without-finally',
    description: 'fetch without finally cleanup' },
  
  // Memory-intensive operations
  { pattern: /new Array\(\d{5,}\)/g, risk: 'high', type: 'large-array',
    description: 'Creation of very large arrays' },
  
  // Unsafe string concatenation in loops
  { pattern: /for\s*\([^)]+\)\s*{[^}]*\+=\s*[^}]*}/g, risk: 'medium', type: 'string-concat-in-loop',
    description: 'String concatenation in loop (use array join instead)' },
  
  // Global state mutations
  { pattern: /window\.\w+\s*=/g, risk: 'high', type: 'global-assignment',
    description: 'Assignment to window object property' },
  { pattern: /(?:var|let|const)\s+\w+\s*=[\s\S]{1000,}?;/g, risk: 'high', type: 'large-variable',
    description: 'Very large variable assignment' },
  
  // Memory leaks from DOM references
  { pattern: /document\.querySelector/g, risk: 'medium', type: 'dom-reference',
    description: 'DOM reference without cleanup' },
  { pattern: /React\.createRef\(\)/g, risk: 'medium', type: 'react-ref',
    description: 'React ref without cleanup' },
  
  // Excessive re-rendering
  { pattern: /\[\w+, set\w+\] = useState\([^)]*{[\s\S]*?}\)/g, risk: 'medium', type: 'object-state',
    description: 'Object in useState (may cause unnecessary re-renders)' },
  
  // Memory leaks from subscriptions
  { pattern: /subscribe\(/g, risk: 'high', type: 'subscription',
    description: 'Subscription without unsubscribe' }
];

// Store findings
const findings = [];

// Function to analyze a file for memory issues
async function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(SRC_DIR, filePath);
    const fileFindings = [];
    
    // Check for high-risk patterns
    HIGH_RISK_PATTERNS.forEach(({ pattern, risk, type, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Get line number of match
          const lineNumber = getLineNumber(content, match);
          fileFindings.push({
            file: relativePath,
            line: lineNumber,
            pattern: pattern.toString(),
            risk,
            type,
            description,
            code: match.length > 100 ? match.substring(0, 100) + '...' : match
          });
        });
      }
    });
    
    // Check for large components
    if (filePath.includes('components') && content.length > 30000) {
      fileFindings.push({
        file: relativePath,
        line: 1,
        pattern: 'large-component',
        risk: 'high',
        type: 'component-size',
        description: 'Component file is extremely large (over 30KB)',
        code: `File size: ${(content.length / 1024).toFixed(2)}KB`
      });
    }
    
    // Check for many useState calls
    const useStateMatches = content.match(/useState\(/g);
    if (useStateMatches && useStateMatches.length > 10) {
      fileFindings.push({
        file: relativePath,
        line: 1,
        pattern: 'many-state-hooks',
        risk: 'medium',
        type: 'hook-count',
        description: `Component uses ${useStateMatches.length} useState hooks (consider useReducer)`,
        code: `${useStateMatches.length} useState calls detected`
      });
    }
    
    // Check for many useEffect calls
    const useEffectMatches = content.match(/useEffect\(/g);
    if (useEffectMatches && useEffectMatches.length > 5) {
      fileFindings.push({
        file: relativePath,
        line: 1,
        pattern: 'many-effect-hooks',
        risk: 'medium',
        type: 'hook-count',
        description: `Component uses ${useEffectMatches.length} useEffect hooks (may cause performance issues)`,
        code: `${useEffectMatches.length} useEffect calls detected`
      });
    }
    
    return fileFindings;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return [];
  }
}

// Helper function to get the line number of a match
function getLineNumber(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return -1;
  return content.substring(0, index).split('\n').length;
}

// Function to check event listener balancing
function checkEventListenerBalance(content) {
  const addListenerMatches = content.match(/addEventListener\(['"](\w+)['"],\s*(\w+)/g) || [];
  const removeListenerMatches = content.match(/removeEventListener\(['"](\w+)['"],\s*(\w+)/g) || [];
  
  const unbalanced = [];
  
  addListenerMatches.forEach(match => {
    // Extract event type and handler name
    const eventMatch = match.match(/addEventListener\(['"](\w+)['"],\s*(\w+)/);
    if (eventMatch) {
      const [_, eventType, handlerName] = eventMatch;
      
      // Check if there's a corresponding removeEventListener
      const hasRemoval = removeListenerMatches.some(rm => {
        const rmMatch = rm.match(/removeEventListener\(['"](\w+)['"],\s*(\w+)/);
        return rmMatch && rmMatch[1] === eventType && rmMatch[2] === handlerName;
      });
      
      if (!hasRemoval) {
        unbalanced.push({ eventType, handlerName });
      }
    }
  });
  
  return unbalanced;
}

// Function to recursively walk directories
async function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded directories
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.some(exclude => entry.name.includes(exclude))) {
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
      const fileFindings = await analyzeFile(fullPath);
      if (fileFindings.length > 0) {
        findings.push(...fileFindings);
      }
    }
  }
}

// Find potentially leaky components using runtime analysis
async function findLeakyComponents() {
  return new Promise((resolve, reject) => {
    exec('grep -r "useEffect\\|useState\\|addEventListener\\|setInterval\\|setTimeout" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"', (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        console.error(`Error running grep: ${error.message}`);
        return resolve([]);
      }
      
      const lines = stdout.split('\n');
      const suspected = new Map();
      
      lines.forEach(line => {
        if (!line) return;
        
        const [file, content] = line.split(':', 2);
        
        if (!suspected.has(file)) {
          suspected.set(file, { count: 0, hooks: 0, events: 0, timers: 0 });
        }
        
        const stats = suspected.get(file);
        stats.count++;
        
        if (content.includes('useEffect') || content.includes('useState')) {
          stats.hooks++;
        }
        if (content.includes('addEventListener')) {
          stats.events++;
        }
        if (content.includes('setInterval') || content.includes('setTimeout')) {
          stats.timers++;
        }
      });
      
      // Prioritize files with a combination of high hooks, events, and timers
      const prioritized = Array.from(suspected.entries())
        .filter(([_, stats]) => stats.count > 5)
        .map(([file, stats]) => ({
          file,
          score: stats.hooks * 2 + stats.events * 3 + stats.timers * 3,
          hooks: stats.hooks,
          events: stats.events,
          timers: stats.timers
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      
      resolve(prioritized);
    });
  });
}

// Generate memory usage report
async function generateReport() {
  console.log('🔍 Analyzing codebase for memory issues...');
  
  await walkDir(SRC_DIR);
  
  console.log(`✅ Found ${findings.length} potential memory issues.`);
  
  // Add runtime analysis
  console.log('🔍 Finding potentially leaky components...');
  const leakyComponents = await findLeakyComponents();
  
  // Group findings by file
  const byFile = {};
  findings.forEach(finding => {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  });
  
  // Generate markdown report
  const reportContent = `# Memory Usage Analysis Report
Generated on ${new Date().toISOString()}

## Summary
- Total issues found: ${findings.length}
- High risk issues: ${findings.filter(f => f.risk === 'high').length}
- Medium risk issues: ${findings.filter(f => f.risk === 'medium').length}
- Components with potential memory leaks: ${leakyComponents.length}

## Top Files by Issue Count
${Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .map((entry, i) => `${i+1}. **${entry[0]}**: ${entry[1].length} issues`)
  .join('\n')}

## Potentially Leaky Components (Runtime Analysis)
${leakyComponents.map((comp, i) => 
  `${i+1}. **${comp.file}** - Score: ${comp.score} (Hooks: ${comp.hooks}, Events: ${comp.events}, Timers: ${comp.timers})`
).join('\n')}

## High Risk Issues
${findings
  .filter(f => f.risk === 'high')
  .map(f => '### ' + f.file + ':' + f.line + '\n' + '```javascript\n' + f.code + '\n```\n' + f.description)
  .join('\n\n')}

## All Issues by File
${Object.entries(byFile).map(([file, fileFindings]) => `
### ${file}
${fileFindings.map(f => `- Line ${f.line}: ${f.description} (${f.risk} risk)
  '\\`' + f.code.replace(/\n/g, ' ') + '\\`').join('\n')}
`).join('\n')}

## Recommendations
1. Check all event listeners have matching cleanup in useEffect return functions
2. Replace multiple useState hooks with useReducer for complex state
3. Ensure all timers (setTimeout/setInterval) are cleared when components unmount
4. Add dependency arrays to all useEffect hooks
5. Break up large components into smaller, focused components
6. Avoid creating new objects or arrays in render functions
7. Use memoization (useMemo, React.memo) for expensive calculations
`;

  // Write report to file
  const reportDir = path.join(process.cwd(), 'memory-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `memory-analysis-${new Date().toISOString().replace(/:/g, '-')}.md`);
  fs.writeFileSync(reportFile, reportContent);
  
  console.log(`📊 Report generated: ${reportFile}`);
}

// Start the analysis
generateReport().catch(console.error); 