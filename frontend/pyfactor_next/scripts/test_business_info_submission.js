// Test script to debug business info submission
// Run with: node scripts/test_business_info_submission.js

const testData = {
  businessName: "Dott",
  businessType: "Adventure Tourism and Tour Guides",
  country: "United States",
  legalStructure: "LLC",
  dateFounded: "2024-01-01"
};

console.log("Original data (camelCase):", testData);

// Transform to snake_case (what OnboardingFlow.v2.jsx does)
const transformedData = {
  business_name: testData.businessName,
  business_type: testData.businessType,
  country: testData.country || 'US',
  legal_structure: testData.legalStructure,
  date_founded: testData.dateFounded
};

console.log("\nTransformed data (snake_case):", transformedData);

// Simulate what the API route extracts
const extractedData = {
  businessName: transformedData.business_name || transformedData.businessName || '',
  businessType: transformedData.business_type || transformedData.businessType || '',
  country: transformedData.country || '',
  legalStructure: transformedData.legal_structure || transformedData.legalStructure || '',
  dateFounded: transformedData.date_founded || transformedData.dateFounded || ''
};

console.log("\nExtracted data in API route:", extractedData);

// What gets sent to Django
const djangoData = {
  business_name: extractedData.businessName,
  business_type: extractedData.businessType,
  country: extractedData.country === 'United States' ? 'US' : extractedData.country,
  legal_structure: extractedData.legalStructure,
  date_founded: extractedData.dateFounded
};

console.log("\nFinal data sent to Django:", djangoData);

// Check for empty values
const hasEmptyValues = Object.entries(djangoData).some(([key, value]) => !value);
console.log("\nHas empty values?", hasEmptyValues);

if (hasEmptyValues) {
  console.log("Empty fields:");
  Object.entries(djangoData).forEach(([key, value]) => {
    if (!value) console.log(`  - ${key}: "${value}"`);
  });
}