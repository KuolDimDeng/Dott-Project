import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define Dashboard and Calendar translations for all 10 new languages
const dashboardCalendarTranslations = {
  it: {
    "dashboard": "Dashboard",
    "calendar": "Calendario"
  },
  pl: {
    "dashboard": "Pulpit",
    "calendar": "Kalendarz"
  },
  th: {
    "dashboard": "แดชบอร์ด",
    "calendar": "ปฏิทิน"
  },
  bn: {
    "dashboard": "ড্যাশবোর্ড",
    "calendar": "ক্যালেন্ডার"
  },
  ur: {
    "dashboard": "ڈیش بورڈ",
    "calendar": "کیلنڈر"
  },
  tl: {
    "dashboard": "Dashboard",
    "calendar": "Kalendaryo"
  },
  uk: {
    "dashboard": "Панель",
    "calendar": "Календар"
  },
  fa: {
    "dashboard": "داشبورد",
    "calendar": "تقویم"
  },
  sn: {
    "dashboard": "Dashboard",
    "calendar": "Karenda"
  },
  ig: {
    "dashboard": "Dashboard",
    "calendar": "Kalenda"
  }
};

// Languages to update
const languages = ['it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'];

function updateLanguageFile(lang) {
  const filePath = path.join(__dirname, 'frontend/pyfactor_next/public/locales', lang, 'navigation.json');
  
  try {
    // Read existing file
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update mainMenu with Dashboard and Calendar translations
    const updatedContent = {
      ...existingContent,
      mainMenu: {
        ...existingContent.mainMenu,
        ...dashboardCalendarTranslations[lang]
      }
    };
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf8');
    
    console.log(`✅ Updated Dashboard and Calendar translations for ${lang}`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}:`, error.message);
  }
}

// Update all language files
console.log('🚀 Adding Dashboard and Calendar translations to mainMenu...\n');

languages.forEach(lang => {
  updateLanguageFile(lang);
});

console.log('\n🎉 Dashboard and Calendar translations have been added successfully!');
console.log('\nTranslations added to mainMenu:');
console.log('📊 Dashboard translations:');
console.log('  - Italian: Dashboard');
console.log('  - Polish: Pulpit');
console.log('  - Thai: แดชบอร์ด');
console.log('  - Bengali: ড্যাশবোর্ড');
console.log('  - Urdu: ڈیش بورڈ');
console.log('  - Filipino: Dashboard');
console.log('  - Ukrainian: Панель');
console.log('  - Persian: داشبورد');
console.log('  - Shona: Dashboard');
console.log('  - Igbo: Dashboard');
console.log('');
console.log('📅 Calendar translations:');
console.log('  - Italian: Calendario');
console.log('  - Polish: Kalendarz');
console.log('  - Thai: ปฏิทิน');
console.log('  - Bengali: ক্যালেন্ডার');
console.log('  - Urdu: کیلنڈر');
console.log('  - Filipino: Kalendaryo');
console.log('  - Ukrainian: Календар');
console.log('  - Persian: تقویم');
console.log('  - Shona: Karenda');
console.log('  - Igbo: Kalenda');