'use client';


import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const CookiePolicy = () => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if screen is mobile size
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const SectionTitle = ({ children }) => (
    <h2 className={`font-bold text-blue-700 ${isMobile ? 'text-lg' : 'text-xl'} mt-8 mb-4`}>
      {children}
    </h2>
  );

  const SectionContent = ({ children }) => (
    <p className="mb-6 leading-relaxed text-gray-600">
      {children}
    </p>
  );
  
  const SubsectionTitle = ({ children }) => (
    <h3 className={`font-bold text-gray-800 mt-4 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
      {children}
    </h3>
  );

  const cookieSections = [
    {
      title: '1. What Are Cookies',
      content:
        'Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners. Cookies help enhance your browsing experience by remembering your preferences, login status, and other customizations.',
    },
    {
      title: '2. How We Use Cookies',
      content:
        'Dott uses cookies for various purposes to improve your experience with our services:',
      subsections: [
        {
          title: '2.1 Essential Cookies',
          content: 'These cookies are necessary for the proper functioning of our website and services. They enable core functionality such as security, network management, and account access. You cannot opt out of these cookies as the website cannot function properly without them.'
        },
        {
          title: '2.2 Functional Cookies',
          content: 'These cookies enable us to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages. If you disable these cookies, some or all of these services may not function properly.'
        },
        {
          title: '2.3 Analytics Cookies',
          content: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. They help us improve the way our website works and optimize user experience.'
        },
        {
          title: '2.4 Marketing Cookies',
          content: 'These cookies are used to track visitors across websites. They are set to display targeted advertisements based on your interests and online behavior. They also help measure the effectiveness of advertising campaigns.'
        }
      ]
    },
    {
      title: '3. Specific Cookies We Use',
      content:
        'Here are the specific cookies that Dott uses:',
      subsections: [
        {
          title: '3.1 Session Cookies',
          content: 'These temporary cookies are erased when you close your browser. They are used to store a temporary identifier that allows you to move from page to page without having to log in repeatedly.'
        },
        {
          title: '3.2 Persistent Cookies',
          content: 'These cookies remain on your device until they expire or you delete them. They help us recognize you as an existing user so it is easier to return to Dott and interact with our services without signing in again.'
        },
        {
          title: '3.3 Third-Party Cookies',
          content: 'We use services from third parties who may also set cookies on your device when you visit our site. These include analytics providers (like Google Analytics), payment processors (like Stripe and PayPal), and feature functionality providers (for customer support, chat, etc.).'
        }
      ]
    },
    {
      title: '4. Cookie Duration',
      content:
        'The length of time a cookie will remain on your device depends on whether it is a "persistent" or "session" cookie. Session cookies will remain on your device until you stop browsing. Persistent cookies remain on your device until they expire or are deleted.',
    },
    {
      title: '5. Managing Cookies',
      content:
        'You can control and manage cookies in various ways:',
      subsections: [
        {
          title: '5.1 Browser Settings',
          content: 'Most web browsers allow you to manage your cookie preferences. You can set your browser to refuse cookies, or to alert you when cookies are being sent. The methods for doing so vary from browser to browser, and from version to version. You can obtain up-to-date information about blocking and deleting cookies via the support pages of your browser:'
        },
        {
          title: '5.2 Our Cookie Preference Tool',
          content: 'When you first visit our website, you will be presented with a cookie consent banner that allows you to choose which types of cookies you accept.'
        },
        {
          title: '5.3 Impact of Disabling Cookies',
          content: 'Please note that if you choose to disable cookies, you may not be able to access certain parts of our website, and some features may not function properly. In particular, you will not be able to use features that require you to log in to your account.'
        }
      ]
    },
    {
      title: '6. Updates to This Cookie Policy',
      content:
        'We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will become effective when we post the revised policy on our website. We encourage you to periodically review this page to stay informed about our use of cookies.',
    },
    {
      title: '7. Contact Us',
      content:
        'If you have any questions about our use of cookies or this Cookie Policy, please contact us at:',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center mt-8">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
        
        <div 
          onClick={() => router.push('/')} 
          className="cursor-pointer flex items-center"
        >
          <Image
            src="/static/images/PyfactorLandingpage.png"
            alt="Pyfactor Logo"
            width={120}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
      
      <div className="mt-4 mb-12 bg-white rounded-lg shadow-lg p-6 sm:p-10">
        <h1 className={`text-center font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-2`}>
          Cookie Policy
        </h1>

        <p className="text-center text-gray-600 mb-8">
          Effective as of: {new Date().toLocaleDateString()}
        </p>

        <hr className="mb-8 border-t border-gray-200" />

        <p className="mb-6 leading-relaxed text-gray-600">
          This Cookie Policy explains how Dott LLC ("we", "us", or "our") uses cookies and similar technologies to recognize you when you visit our website at www.dottapps.com or use our mobile applications ("Services"). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
        </p>

        <ul className="space-y-6">
          {cookieSections.map((section, index) => (
            <li key={index} className="py-4">
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <div key={subIndex} className="w-full mb-4">
                  <SubsectionTitle>{subsection.title}</SubsectionTitle>
                  <SectionContent>{subsection.content}</SectionContent>
                </div>
              ))}
              
              {index !== cookieSections.length - 1 && <hr className="w-full mt-4 border-t border-gray-200" />}
            </li>
          ))}
        </ul>

        <div className="bg-gray-50 p-6 rounded-md border border-gray-200 mt-8">
          <address className="not-italic text-sm">
            <strong>Dott LLC</strong>
            <br />
            800 N King Street
            <br />
            Suite 304 #2797
            <br />
            Wilmington, DE 19801
            <br />
            United States            
            <br />
            Email: support@dottapps.com
            <br />
            Website: www.dottapps.com
          </address>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;