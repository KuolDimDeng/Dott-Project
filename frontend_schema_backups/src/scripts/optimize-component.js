/**
 * Component Optimizer Script
 * 
 * This script takes a component file and applies memory optimization techniques.
 * Run with: node src/scripts/optimize-component.js [component-path]
 */

const fs = require('fs');
const path = require('path');

// Check if a component path was provided
const componentPath = process.argv[2];
if (!componentPath) {
  console.error('❌ Please provide a component path as an argument.');
  console.error('Usage: node src/scripts/optimize-component.js src/app/dashboard/components/forms/InvoiceManagement.js');
  process.exit(1);
}

// Get the absolute path of the component
const absolutePath = path.isAbsolute(componentPath) 
  ? componentPath 
  : path.join(process.cwd(), componentPath);

// Check if the file exists
if (!fs.existsSync(absolutePath)) {
  console.error(`❌ The file ${absolutePath} does not exist.`);
  process.exit(1);
}

// Define optimization patterns
const optimizations = [
  // Fix missing dependency arrays in useEffect
  {
    pattern: /useEffect\(\s*\(\)\s*=>\s*{([^}]*)}\s*\)/g,
    replacement: (match, body) => {
      // If there's a fetch or DOM operation, add empty array to prevent continuous re-runs
      if (body.includes('fetch(') || 
          body.includes('document.') || 
          body.includes('window.') ||
          body.includes('localStorage') ||
          body.includes('sessionStorage')) {
        return `useEffect(() => {${body}}, [])`;
      }
      // Otherwise suggest effect needs dependencies
      return `useEffect(() => {${body}}, [/* TODO: Add dependencies */])`;
    },
    description: 'Added missing dependency array to useEffect'
  },
  
  // Fix event listener cleanup
  {
    pattern: /useEffect\(\s*\(\)\s*=>\s*{([^}]*addEventListener[^}]*)}\s*,\s*\[(.*)\]\s*\)/g,
    replacement: (match, body, deps) => {
      if (!body.includes('return ') && !body.includes('removeEventListener')) {
        return `useEffect(() => {${body}\n  // Added cleanup to prevent memory leaks
  return () => {
    // TODO: Remove event listeners here
  };
}, [${deps}])`;
      }
      return match;
    },
    description: 'Added event listener cleanup in useEffect'
  },
  
  // Fix setInterval/setTimeout cleanup
  {
    pattern: /useEffect\(\s*\(\)\s*=>\s*{([^}]*(?:setInterval|setTimeout)[^}]*)}\s*,\s*\[(.*)\]\s*\)/g,
    replacement: (match, body, deps) => {
      if (body.includes('setInterval') && !body.includes('clearInterval') && !body.includes('return ')) {
        const intervalVar = 'intervalId';
        return `useEffect(() => {
  const ${intervalVar} = ${body.trim().includes('setInterval') ? body.trim() : `setInterval(${body.trim()})`};
  
  // Added cleanup to prevent memory leaks
  return () => {
    clearInterval(${intervalVar});
  };
}, [${deps}])`;
      }
      if (body.includes('setTimeout') && !body.includes('clearTimeout') && !body.includes('return ')) {
        const timeoutVar = 'timeoutId';
        return `useEffect(() => {
  const ${timeoutVar} = ${body.trim().includes('setTimeout') ? body.trim() : `setTimeout(${body.trim()})`};
  
  // Added cleanup to prevent memory leaks
  return () => {
    clearTimeout(${timeoutVar});
  };
}, [${deps}])`;
      }
      return match;
    },
    description: 'Added timer cleanup in useEffect'
  },
  
  // Fix empty useState arrays
  {
    pattern: /useState\(\[\]\)/g,
    replacement: 'useState(() => [])',
    description: 'Optimized empty array useState initialization'
  },
  
  // Convert multiple useState calls to useReducer
  {
    pattern: /const\s*\[\w+,\s*set\w+\]\s*=\s*useState\([^)]*\);\s*const\s*\[\w+,\s*set\w+\]\s*=\s*useState\([^)]*\);\s*const\s*\[\w+,\s*set\w+\]\s*=\s*useState\([^)]*\);(\s*const\s*\[\w+,\s*set\w+\]\s*=\s*useState\([^)]*\);)*/g,
    replacement: (match) => {
      return match + '\n\n// TODO: Consider using useReducer instead of multiple useState calls\n/* Example:\nconst [state, dispatch] = useReducer(reducer, initialState);\n*/';
    },
    description: 'Suggested useReducer for multiple useState calls'
  },
  
  // Optimize useMemo with empty dependency array
  {
    pattern: /useMemo\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*,\s*\[\s*\]\s*\)/g,
    replacement: (match, body) => {
      // If creating a new object/array, make it a constant outside component
      if (body.includes('{') || body.includes('[')) {
        return `// TODO: Move this outside component to avoid recreation\n${match}`;
      }
      return match;
    },
    description: 'Flagged useMemo with empty dependency array for optimization'
  },
  
  // Fix object literals in useState
  {
    pattern: /useState\(\{([^}]*)\}\)/g,
    replacement: 'useState(() => ({$1}))',
    description: 'Optimized object literal in useState'
  },
  
  // Fix array checks in render
  {
    pattern: /(\w+)\.map\(/g,
    replacement: (match, array) => {
      return `(${array} || []).map(`;
    },
    description: 'Added array existence check before map'
  },
  
  // Add error boundaries around expensive calculations or large components
  {
    pattern: /<([A-Z]\w+)([^>]*)>([^<]*)<\/\1>/g,
    replacement: (match, component, props, children) => {
      // Only add for complex-looking components
      if (props.includes('data={') || props.includes('items={') || component.includes('Table') || component.includes('Grid') || component.includes('List')) {
        return `{/* TODO: Consider adding error boundary */}\n<${component}${props}>${children}</${component}>`;
      }
      return match;
    },
    description: 'Suggested error boundary for complex components'
  },
  
  // Memoize child components
  {
    pattern: /function\s+(\w+)\s*\(\s*\{\s*([^}]*)\}\s*\)\s*\{/g,
    replacement: (match, name, props) => {
      // Only for components that receive props and render content
      if (props.trim() && !name.includes('use')) {
        return `// TODO: Consider memoizing this component with React.memo\nfunction ${name}({ ${props} }) {`;
      }
      return match;
    },
    description: 'Suggested memoization for child components'
  },
  
  // Replace expensive operations in render
  {
    pattern: /const\s+(\w+)\s*=\s*(\w+\.\w+\(.*\))\s*;/g,
    replacement: (match, name, operation) => {
      // Only for potentially expensive operations
      if (operation.includes('filter') || operation.includes('map') || operation.includes('reduce') || operation.includes('sort')) {
        return `// TODO: Consider using useMemo for expensive operation\nconst ${name} = useMemo(() => ${operation}, [${operation.split('.')[0]}]);`;
      }
      return match;
    },
    description: 'Suggested useMemo for expensive operations'
  }
];

// Read the component file
console.log(`📖 Reading ${componentPath}...`);
const componentCode = fs.readFileSync(absolutePath, 'utf8');

// Check if the file includes necessary hooks
const requiredImports = [];
if (!componentCode.includes('useReducer') && componentCode.includes('useState') && 
    (componentCode.match(/useState/g) || []).length >= 3) {
  requiredImports.push('useReducer');
}

if (!componentCode.includes('useMemo') && 
    (componentCode.includes('filter(') || componentCode.includes('map(') || 
     componentCode.includes('reduce(') || componentCode.includes('sort('))) {
  requiredImports.push('useMemo');
}

if (!componentCode.includes('useCallback') && componentCode.includes('function')) {
  requiredImports.push('useCallback');
}

if (!componentCode.includes('memo') && !componentCode.includes('React.memo')) {
  requiredImports.push('memo');
}

// Apply optimizations
console.log('🔄 Applying optimizations...');
let optimizedCode = componentCode;
const appliedOptimizations = [];

for (const { pattern, replacement, description } of optimizations) {
  const matches = optimizedCode.match(pattern);
  if (matches) {
    optimizedCode = optimizedCode.replace(pattern, replacement);
    appliedOptimizations.push({
      description,
      count: matches.length
    });
  }
}

// Add imports if needed
if (requiredImports.length > 0) {
  // Check existing React import
  const reactImportMatch = optimizedCode.match(/import\s+(?:{([^}]*)})?\s*(?:,\s*)?(React)?\s*from\s+['"]react['"]/);
  
  if (reactImportMatch) {
    // Existing import found, append the missing imports
    const [fullMatch, namedImports, reactImport] = reactImportMatch;
    
    let newNamedImports = namedImports || '';
    requiredImports.forEach(imp => {
      if (!newNamedImports.includes(imp)) {
        newNamedImports += newNamedImports ? `, ${imp}` : imp;
      }
    });
    
    const newImport = `import ${newNamedImports ? `{ ${newNamedImports} }` : ''}${newNamedImports && reactImport ? ', ' : ''}${reactImport || ''} from 'react'`;
    optimizedCode = optimizedCode.replace(fullMatch, newImport);
    
    appliedOptimizations.push({
      description: `Added missing imports: ${requiredImports.join(', ')}`,
      count: requiredImports.length
    });
  } else {
    // No React import found, add one
    const newImport = `import React, { ${requiredImports.join(', ')} } from 'react';\n`;
    optimizedCode = newImport + optimizedCode;
    
    appliedOptimizations.push({
      description: `Added React import with: ${requiredImports.join(', ')}`,
      count: requiredImports.length
    });
  }
}

// Add memory optimization hook
if (optimizedCode.includes('useEffect') && !optimizedCode.includes('useMemoryOptimizer')) {
  // Add import
  if (optimizedCode.includes('from \'@/utils/')) {
    // Project uses @/utils pattern, add import there
    optimizedCode = optimizedCode.replace(/(import [^;]*from ['"]@\/utils\/[^'"]*['"];)/, 
      `$1\nimport { useMemoryOptimizer } from '@/utils/memoryManager';`);
  } else {
    // Just add import at the top
    optimizedCode = `import { useMemoryOptimizer } from '@/utils/memoryManager';\n${optimizedCode}`;
  }
  
  // Find component function
  const componentMatch = optimizedCode.match(/function\s+(\w+)\s*\([^)]*\)\s*\{/);
  if (componentMatch) {
    const componentName = componentMatch[1];
    const hookLine = `\n  // Memory optimization\n  const { trackUpdate } = useMemoryOptimizer('${componentName}');\n`;
    
    // Add hook after useState/useEffect declarations
    optimizedCode = optimizedCode.replace(/function\s+\w+\s*\([^)]*\)\s*\{([^}]*)(useState|useEffect|useRef|useMemo)/,
      `function ${componentName}($1$2${hookLine}`);
    
    appliedOptimizations.push({
      description: `Added memory optimization hook for ${componentName}`,
      count: 1
    });
  }
}

// Generate backup and optimized files
const backupPath = `${absolutePath}.backup`;
const optimizedPath = `${absolutePath.slice(0, -3)}.optimized.js`;

console.log('💾 Saving backup and optimized files...');
fs.writeFileSync(backupPath, componentCode);
fs.writeFileSync(optimizedPath, optimizedCode);

// Report results
console.log(`✅ Optimization complete! ${appliedOptimizations.length} improvements made:`);
appliedOptimizations.forEach(({ description, count }) => {
  console.log(`  - ${description} (${count} instances)`);
});

console.log(`\n📄 Original file backed up to: ${backupPath}`);
console.log(`📄 Optimized file saved to: ${optimizedPath}`);
console.log('\n💡 Next steps:');
console.log('  1. Review the optimized file and make any manual adjustments');
console.log('  2. Test the optimized component for functionality');
console.log('  3. If satisfied, replace the original file with the optimized version');
console.log('     You can run: mv ' + optimizedPath + ' ' + absolutePath); 