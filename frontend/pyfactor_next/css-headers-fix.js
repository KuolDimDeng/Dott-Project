// Temporary script to update next.config.js CSS headers
const fs = require('fs');

const configPath = './next.config.js';
const config = fs.readFileSync(configPath, 'utf8');

// Find the CSS headers section and ensure X-Content-Type-Options is NOT set for CSS
const updatedConfig = config.replace(
  /(source: '\/_next\/static\/css\/:path\*',[\s\S]*?headers: \[)([\s\S]*?)(\],)/,
  (match, p1, headers, p3) => {
    // Remove any X-Content-Type-Options from CSS headers
    const cleanedHeaders = headers
      .split(',')
      .filter(header => !header.includes('X-Content-Type-Options'))
      .join(',');
    
    return p1 + cleanedHeaders + p3;
  }
);

fs.writeFileSync(configPath, updatedConfig);
console.log('✅ Updated next.config.js to remove X-Content-Type-Options from CSS files');
