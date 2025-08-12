const fs = require('fs');
const path = require('path');

// Mobile landing page translations
const mobileLandingTranslations = {
  "mobileLanding": {
    "hero": {
      "title": "Your Business,",
      "subtitle": "In Your Pocket",
      "description": "AI-powered business management platform that works offline.",
      "cta": {
        "getStarted": "Get Started For Free",
        "signIn": "Sign In"
      },
      "noCreditCard": "No credit card required",
      "freePlan": "Free forever plan"
    },
    "features": {
      "title": "Everything You Need",
      "pos": {
        "title": "Point of Sale",
        "description": "Process sales instantly, even offline"
      },
      "barcode": {
        "title": "Barcode Scanner",
        "description": "Scan products with your camera"
      },
      "invoicing": {
        "title": "Quick Invoicing",
        "description": "Create and send invoices on the go"
      },
      "analytics": {
        "title": "Real-time Analytics",
        "description": "Track your business performance"
      }
    },
    "benefits": {
      "title": "Built for Your Success",
      "offline": {
        "title": "Works Offline",
        "description": "Continue selling without internet"
      },
      "fast": {
        "title": "Lightning Fast",
        "description": "Instant loading, no delays"
      },
      "mobile": {
        "title": "Mobile First",
        "description": "Designed for phones & tablets"
      },
      "payments": {
        "title": "Mobile Money",
        "description": "M-Pesa, offline mode, local support"
      }
    },
    "pricing": {
      "title": "Simple, Transparent Pricing"
    },
    "cta": {
      "title": "Ready to Grow Your Business?",
      "subtitle": "Start managing your business better today",
      "button": "Get Started Free",
      "terms": "No credit card required • Cancel anytime"
    }
  }
};

// Languages to update
const languages = [
  'en', 'es', 'fr', 'de', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'id', 'vi', 'tr', 'sw', 'ha', 'am', 'yo', 'zu',
  'it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'
];

// Function to update a language file
function updateLanguageFile(langCode) {
  const filePath = path.join(__dirname, '..', 'public', 'locales', langCode, 'common.json');
  
  try {
    // Read existing file
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Add mobile landing translations if they don't exist
    if (!content.mobileLanding) {
      content = {
        ...content,
        ...mobileLandingTranslations
      };
      
      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
      console.log(`✅ Updated ${langCode}/common.json`);
    } else {
      console.log(`⏭️  ${langCode}/common.json already has mobile landing translations`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${langCode}/common.json:`, error.message);
  }
}

// Update all language files
console.log('🚀 Adding mobile landing translations to all language files...\n');

languages.forEach(langCode => {
  updateLanguageFile(langCode);
});

console.log('\n✨ Done! Mobile landing translations have been added to all language files.');
console.log('\n📝 Note: The translations are currently in English for all languages.');
console.log('You will need to have them professionally translated for each language.');