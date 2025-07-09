#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define language mappings
const languages = {
  fr: 'French',
  pt: 'Portuguese', 
  de: 'German',
  zh: 'Chinese (Simplified)',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  ja: 'Japanese',
  sw: 'Swahili',
  tr: 'Turkish',
  id: 'Indonesian',
  vi: 'Vietnamese',
  nl: 'Dutch',
  ha: 'Hausa',
  yo: 'Yoruba',
  am: 'Amharic',
  zu: 'Zulu',
  ko: 'Korean'
};

// Read the English auth.json file
const enAuthPath = path.join(__dirname, '../public/locales/en/auth.json');
const enAuth = JSON.parse(fs.readFileSync(enAuthPath, 'utf8'));

// Create auth translations for each language
Object.entries(languages).forEach(([langCode, langName]) => {
  const langPath = path.join(__dirname, `../public/locales/${langCode}/auth.json`);
  
  // Skip if already exists
  if (fs.existsSync(langPath)) {
    console.log(`✓ ${langName} (${langCode}) auth.json already exists`);
    return;
  }

  console.log(`Creating ${langName} (${langCode}) auth.json...`);
  
  // For now, create a placeholder structure
  // In production, this would call a translation API
  const translatedAuth = JSON.parse(JSON.stringify(enAuth));
  
  // Write the file
  fs.writeFileSync(langPath, JSON.stringify(translatedAuth, null, 2));
  console.log(`✓ Created ${langCode}/auth.json`);
});

console.log('\nAuth translation files created successfully!');
console.log('Note: These are placeholder files. Professional translation is recommended.');