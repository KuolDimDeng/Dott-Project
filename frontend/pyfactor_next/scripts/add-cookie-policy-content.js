const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../public/locales');

// Define the cookie policy structure for English
const cookiePolicyContent = {
  title: "Cookie Policy",
  effectiveDate: "Effective as of: {{date}}",
  navigation: {
    backToHome: "Back to Home"
  },
  introduction: "This Cookie Policy explains how Dott LLC uses cookies and similar technologies to recognize you when you visit our website and use our services. It explains what these technologies are and why we use them, as well as your rights to control our use of them.",
  sections: {
    whatAreCookies: {
      title: "What are cookies?",
      content: "Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information."
    },
    howWeUseCookies: {
      title: "How we use cookies",
      content: "We use cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate, and we refer to these as \"essential\" or \"strictly necessary\" cookies. Other cookies enable us to track and target the interests of our users to enhance the experience on our website."
    },
    typesOfCookies: {
      title: "Types of cookies we use",
      content: "The specific types of first and third party cookies served through our website and the purposes they perform are described below:",
      essential: {
        title: "Essential cookies",
        content: "These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas."
      },
      functional: {
        title: "Functional cookies",
        content: "These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third party providers whose services we have added to our pages."
      },
      analytics: {
        title: "Analytics cookies",
        content: "These cookies allow us to count visits and traffic sources, so we can measure and improve the performance of our site. They help us know which pages are the most and least popular and see how visitors move around the site."
      },
      marketing: {
        title: "Marketing cookies",
        content: "These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites."
      }
    },
    managingCookies: {
      title: "Managing cookies",
      content: "Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, since it will no longer be personalized to you. It may also stop you from saving customized settings like login information."
    },
    thirdPartyCookies: {
      title: "Third-party cookies",
      content: "In addition to our own cookies, we may also use various third-party cookies to report usage statistics of our service and deliver advertisements on and through our service."
    },
    changes: {
      title: "Changes to this Cookie Policy",
      content: "We may update this Cookie Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal or regulatory reasons. Please therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies."
    },
    contact: {
      title: "Contact us",
      content: "If you have any questions about our use of cookies or other technologies, please contact us."
    }
  },
  contactInfo: {
    company: "Dott LLC",
    email: "Email: support@dottapps.com",
    website: "Website: www.dottapps.com"
  }
};

// Function to add cookie policy content to a language file
function addCookiePolicyToLanguage(langCode) {
  const commonPath = path.join(localesDir, langCode, 'common.json');
  
  try {
    // Read existing common.json
    let common = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
    
    // Check if cookiePolicy exists and is empty
    if (common.cookiePolicy && Object.keys(common.cookiePolicy).length === 0) {
      // Add the cookie policy content
      common.cookiePolicy = cookiePolicyContent;
      
      // Write back to file
      fs.writeFileSync(commonPath, JSON.stringify(common, null, 2));
      console.log(`✅ Added cookie policy content to ${langCode}`);
    } else if (!common.cookiePolicy) {
      console.log(`⚠️  No cookiePolicy key found in ${langCode}`);
    } else {
      console.log(`ℹ️  Cookie policy already has content in ${langCode}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${langCode}:`, error.message);
  }
}

// Add to English first
addCookiePolicyToLanguage('en');

// For other languages, we'll use the English content as a placeholder
// In a real application, these would be properly translated
const languages = ['es', 'fr', 'pt', 'de', 'zh', 'ar', 'hi', 'ru', 'ja', 'sw', 'tr', 'id', 'vi', 'nl', 'ha', 'yo', 'am', 'zu', 'ko'];

languages.forEach(lang => {
  addCookiePolicyToLanguage(lang);
});

console.log('\n✅ Cookie policy content added to all languages!');