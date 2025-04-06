/**
 * PDF Optimization Verification Script
 * 
 * This script verifies that all PDF-related components are using our optimized
 * PDF libraries and utilities to prevent memory issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.resolve(__dirname, '../..');
const componentsToCheck = [
  'app/dashboard/components/forms/ReportDisplay.js',
  'app/dashboard/components/components/EstimatePdfViewer.js',
  'utils/pdfOptimizer.js',
  'utils/dynamic-imports.js'
];

// Required patterns that should be present in optimized files
const requiredPatterns = {
  'app/dashboard/components/forms/ReportDisplay.js': [
    'import { optimizeJsPDF } from',
    'const doc = optimizeJsPDF',
  ],
  'app/dashboard/components/components/EstimatePdfViewer.js': [
    'import { loadReactPdfRenderer } from',
    'const ReactPDF = await loadReactPdfRenderer',
  ],
  'utils/pdfOptimizer.js': [
    'import { loadPdfLib, loadReactPdfRenderer }',
    'cleanupPDFTasks',
    'updateMetadata: false', // Memory optimization
  ],
  'utils/dynamic-imports.js': [
    'export const loadReactPdfRenderer',
    'export const loadPdfLib',
  ]
};

// Patterns that should NOT be present (unoptimized code)
const forbiddenPatterns = {
  'app/dashboard/components/forms/ReportDisplay.js': [
    'import PDFDocument from',
    'new PDFDocument',
  ],
  'app/dashboard/components/components/EstimatePdfViewer.js': [
    'import { pdfjs } from \'react-pdf\'',
    'import { Document, Page } from \'react-pdf\'',
  ]
};

// Helper functions
function checkFile(filePath, requiredPatterns = [], forbiddenPatterns = []) {
  const fullPath = path.join(rootDir, 'src', filePath);
  console.log(`Checking file: ${fullPath}`);
  
  if (!fs.existsSync(fullPath)) {
    return {
      file: filePath,
      status: 'missing',
      error: `File does not exist: ${fullPath}`
    };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const missingPatterns = [];
  const foundForbiddenPatterns = [];

  // Check for required patterns
  for (const pattern of requiredPatterns) {
    if (!content.includes(pattern)) {
      missingPatterns.push(pattern);
    }
  }

  // Check for forbidden patterns
  for (const pattern of forbiddenPatterns) {
    if (content.includes(pattern)) {
      foundForbiddenPatterns.push(pattern);
    }
  }

  if (missingPatterns.length === 0 && foundForbiddenPatterns.length === 0) {
    return {
      file: filePath,
      status: 'optimized',
      details: 'All required patterns found, no forbidden patterns detected'
    };
  }

  return {
    file: filePath,
    status: 'needs-optimization',
    issues: {
      missingPatterns,
      foundForbiddenPatterns
    }
  };
}

// Main verification function
function verifyPdfOptimizations() {
  console.log('Verifying PDF optimizations...\n');
  console.log(`Root directory: ${rootDir}`);
  const results = [];

  for (const file of componentsToCheck) {
    const result = checkFile(
      file,
      requiredPatterns[file] || [],
      forbiddenPatterns[file] || []
    );
    results.push(result);
  }

  // Print results
  console.log('=== PDF Optimization Verification Results ===');
  let optimizedCount = 0;
  let needsOptimizationCount = 0;
  let missingCount = 0;

  for (const result of results) {
    if (result.status === 'optimized') {
      optimizedCount++;
      console.log(`✅ ${result.file}: Optimized`);
    } else if (result.status === 'needs-optimization') {
      needsOptimizationCount++;
      console.log(`❌ ${result.file}: Needs optimization`);
      
      if (result.issues.missingPatterns.length > 0) {
        console.log('   Missing patterns:');
        result.issues.missingPatterns.forEach(p => console.log(`   - ${p}`));
      }
      
      if (result.issues.foundForbiddenPatterns.length > 0) {
        console.log('   Found forbidden patterns:');
        result.issues.foundForbiddenPatterns.forEach(p => console.log(`   - ${p}`));
      }
    } else if (result.status === 'missing') {
      missingCount++;
      console.log(`❓ ${result.file}: ${result.error}`);
    }
    console.log(''); // Add empty line between results
  }

  // Summary
  console.log('=== Summary ===');
  console.log(`Total files checked: ${results.length}`);
  console.log(`✅ Optimized: ${optimizedCount}`);
  console.log(`❌ Needs optimization: ${needsOptimizationCount}`);
  console.log(`❓ Missing: ${missingCount}`);

  // Check worker files
  console.log('\n=== PDF Worker Files ===');
  const workerFiles = [
    'public/pdf.worker.min.js',
  ];
  
  for (const file of workerFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📄 ${file}: ${fileSizeMB} MB`);
    } else {
      console.log(`❓ ${file}: Not found`);
    }
  }

  // Return overall status
  return optimizedCount === results.length;
}

// Run the verification
try {
  const success = verifyPdfOptimizations();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('Error running PDF optimization verification:', error);
  process.exit(1);
} 