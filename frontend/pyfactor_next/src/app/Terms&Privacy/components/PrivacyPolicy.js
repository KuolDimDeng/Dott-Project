'use client';


import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const PrivacyPolicy = () => {
  const router = useRouter();
  const [fromDashboard, setFromDashboard] = useState(false);
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
    
    // Check for referrer on client side
    if (typeof window !== 'undefined') {
      const referer = document.referrer;
      const isFromDashboard = referer.includes('/dashboard') || sessionStorage.getItem('fromDashboard') === 'true';
      setFromDashboard(isFromDashboard);
      
      // Save the fact that we're in privacy from dashboard
      if (isFromDashboard) {
        sessionStorage.setItem('fromDashboard', 'true');
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const handleBackClick = () => {
    try {
      if (fromDashboard) {
        // Clear the fromDashboard flag
        sessionStorage.removeItem('fromDashboard');
        
        // Use direct location navigation which is more reliable for going back to dashboard
        window.location.href = '/dashboard';
      } else {
        // For non-dashboard returns, router.push is fine
        router.push('/');
      }
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation using direct location method
      window.location.href = fromDashboard ? '/dashboard' : '/';
    }
  };

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

  const privacySections = [
    {
      title: 'A. Scope',
      content:
        'Protecting your personal information is important to us. This privacy policy applies to our products and services offered under the Dott brand, our websites, and our mobile applications that incorporate this privacy policy. Our products and services are offered by Dott LLC. This policy covers how we collect, use, store, process, and share your information in connection with our financial management platform, including accounting, payroll, payment processing, invoicing, and other services.',
    },
    {
      title: 'B. Personal Information',
      content:
        "As part of providing our services, we may collect personal information about you, your business, your employees, and your customers. 'Personal Information' is data that can be used to identify a person individually. This policy outlines our collection, protection, use, retention, disclosure and other processing of Personal Information and your rights relating to these activities.",
      subsections: [
        {
          title: 'B.1 Business Information',
          content: 'This includes your business name, address, tax identification numbers, industry type, business entity type, and other information necessary to provide our services.'
        },
        {
          title: 'B.2 Individual Information',
          content: 'This includes information about you as a business owner, your employees, contractors, and your customers, as necessary to provide our services.'
        }
      ]
    },
    {
      title: 'C. Categories of Personal Information Collected',
      content:
        'The information we may collect includes, but is not limited to:',
      subsections: [
        {
          title: 'C.1 Identification Information',
          content: 'Contact Information (name, email address, phone number, postal address), Government Identification Numbers (EIN, SSN, tax IDs), Date of Birth, photographic ID, and business documentation.'
        },
        {
          title: 'C.2 Financial Information',
          content: 'Bank account details, payment card information, transaction history, account balances, payment records, credit history, financial statements, and payroll information.'
        },
        {
          title: 'C.3 Employee Information',
          content: 'For payroll services, we collect information about your employees including their names, contact details, salary information, tax withholding information, bank details for direct deposit, and other employment-related data.'
        },
        {
          title: 'C.4 Technical Information',
          content: 'Device Information (IP address, device type, operating system), Browser Information, Geo-Location Data, Usage Data, Login Information, and Application Interaction Data.'
        },
        {
          title: 'C.5 Customer Information',
          content: 'When you use our invoicing or payment processing features, we may collect information about your customers necessary to process these transactions.'
        },
        {
          title: 'C.6 Tax Information',
          content: 'When you use our tax features, we collect your business location, tax rates you enter, tax settings preferences, and tax calculation history. We may also process tax-related queries when you use our AI-powered tax suggestion features. This information is used solely to provide tax calculation services and is not used for tax filing or reporting on your behalf.'
        }
      ]
    },
    {
      title: 'D. How We Collect Your Information',
      content: 'We collect information from various sources:',
      subsections: [
        {
          title: 'D.1 Direct Collection',
          content: 'Information you provide when you register for our services, set up your account, connect your financial accounts, process payments, or communicate with us.'
        },
        {
          title: 'D.2 Automated Collection',
          content: 'Information collected automatically through cookies, web beacons, and similar technologies when you use our services.'
        },
        {
          title: 'D.3 Third-Party Sources',
          content: 'Information we receive from third-party service providers, business partners, identity verification services, credit bureaus, and other publicly available sources.'
        },
        {
          title: 'D.4 Financial Institutions',
          content: 'When you connect your bank accounts or other financial services to Dott, we collect information from these financial institutions with your authorization.'
        }
      ]
    },
    {
      title: 'E. How We Use Your Information',
      content:
        'We use your information for the following purposes:',
      subsections: [
        {
          title: 'E.1 Providing and Improving Our Services',
          content: 'To deliver the financial management services you request, process transactions, facilitate payments, manage invoices, process payroll, provide technical support, and improve our platform.'
        },
        {
          title: 'E.2 Authentication and Security',
          content: 'To verify your identity, secure your account, prevent fraud, and ensure the security of our platform.'
        },
        {
          title: 'E.3 Communications',
          content: 'To communicate with you about your account, provide customer support, send service updates, and, with your consent, send marketing communications.'
        },
        {
          title: 'E.4 Legal Compliance',
          content: 'To comply with our legal obligations, including anti-money laundering regulations, tax reporting requirements, and other financial services regulations.'
        },
        {
          title: 'E.5 Analytics and Improvements',
          content: 'To analyze usage patterns, troubleshoot technical issues, and develop new features and services.'
        }
      ]
    },
    {
      title: 'F. Information Sharing and Disclosure',
      content:
        'We may share your information with the following categories of recipients:',
      subsections: [
        {
          title: 'F.1 Service Providers',
          content: 'Third-party service providers who help us deliver our services, including payment processors (Stripe, Flutterwave, DLocal, Wise, PayPal), hosting providers, customer support services, and analytics providers.'
        },
        {
          title: 'F.2 Financial Partners',
          content: 'Banks and financial institutions necessary to process transactions, facilitate payments, and provide invoice factoring services.'
        },
        {
          title: 'F.3 Legal and Regulatory Authorities',
          content: 'Government authorities, law enforcement, and other third parties where required by law, to comply with legal process, or to protect our rights.'
        },
        {
          title: 'F.4 Business Transfers',
          content: 'In connection with any merger, acquisition, or sale of company assets, your information may be transferred as a business asset.'
        },
        {
          title: 'F.5 With Your Consent',
          content: 'We may share your information with other third parties when you have given your consent to do so.'
        }
      ]
    },
    {
      title: 'G. Your Choices and Rights',
      content:
        'Depending on your jurisdiction, you may have the following rights regarding your personal information:',
      subsections: [
        {
          title: 'G.1 Access and Portability',
          content: 'You may request access to your personal information and receive a copy in a structured, commonly used format.'
        },
        {
          title: 'G.2 Correction',
          content: 'You may request that we correct inaccurate or incomplete personal information.'
        },
        {
          title: 'G.3 Deletion',
          content: 'You may request that we delete your personal information, subject to certain exceptions.'
        },
        {
          title: 'G.4 Objection and Restriction',
          content: 'You may object to or request restriction of processing of your personal information.'
        },
        {
          title: 'G.5 Withdraw Consent',
          content: 'Where we rely on your consent to process your personal information, you may withdraw your consent at any time.'
        },
        {
          title: 'G.6 How to Exercise Your Rights',
          content: 'To exercise your rights, please contact us at support@dottapps.com We may need to verify your identity before fulfilling your request.'
        }
      ]
    },
    {
      title: 'H. Data Security',
      content:
        'We implement appropriate technical and organizational measures to protect your personal information:',
      subsections: [
        {
          title: 'H.1 Security Measures',
          content: 'We use industry-standard security measures including encryption, access controls, firewalls, and regular security assessments.'
        },
        {
          title: 'H.2 Payment Information',
          content: 'Payment information is processed in compliance with the Payment Card Industry Data Security Standard (PCI DSS).'
        },
        {
          title: 'H.3 Employee Access',
          content: 'We restrict employee access to personal information to those who need it to perform their job functions.'
        },
        {
          title: 'H.4 Data Breach Procedures',
          content: 'We have procedures in place to respond to suspected data security breaches and will notify you and applicable regulators of breaches as required by law.'
        },
        {
          title: 'H.5 Tax Data Security',
          content: 'Tax rates and settings you enter are encrypted and stored securely. AI-powered tax suggestions are processed without storing your specific queries. We do not share your tax configuration data with third parties except as necessary to provide our services or as required by law. You remain responsible for the accuracy of all tax information entered into our system.'
        }
      ]
    },
    {
      title: 'I. Data Retention',
      content:
        'We retain your personal information for as long as necessary to provide our services and for legitimate business purposes, such as maintaining business records, complying with legal obligations, resolving disputes, and enforcing our agreements. When we no longer need your personal information, we will securely delete or anonymize it.'
    },
    {
      title: 'J. International Data Transfers',
      content:
        'Your information may be transferred to and processed in countries other than the country you live in, including the United States, Rwanda, and other countries where Dott LLC or its service providers operate. These countries may have data protection laws different from the laws of your country. We implement appropriate safeguards to protect your information when transferred internationally, such as standard contractual clauses approved by relevant data protection authorities.'
    },
    {
      title: 'K. Children\'s Privacy',
      content:
        'Our services are not directed to children under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us so that we can delete the information.'
    },
    {
      title: 'L. Cookies and Similar Technologies',
      content:
        'We use cookies and similar technologies to collect information about how you interact with our services, to remember your preferences, and to optimize your experience. You can manage your cookie preferences through your browser settings.',
      subsections: [
        {
          title: 'L.1 Types of Cookies We Use',
          content: 'Essential cookies (necessary for the functionality of our services), Analytical cookies (to understand how users interact with our services), and Marketing cookies (to deliver relevant advertisements).'
        },
        {
          title: 'L.2 Your Cookie Choices',
          content: 'Most web browsers allow you to control cookies through their settings. However, if you reject certain cookies, you may not be able to use all features of our services.'
        }
      ]
    },
    {
      title: 'M. AI and Automated Processing',
      content:
        'We use artificial intelligence and automated systems to enhance our services and provide features like tax rate suggestions, financial insights, and fraud detection.',
      subsections: [
        {
          title: 'M.1 AI-Powered Features',
          content: 'Our AI features analyze your location and business type to suggest tax rates and provide other business insights. These suggestions are generated based on publicly available information and general tax rules.'
        },
        {
          title: 'M.2 No Professional Advice',
          content: 'AI-generated suggestions, including tax rate recommendations, are provided for informational purposes only and do not constitute professional tax, legal, or financial advice. You should independently verify all suggestions before using them.'
        },
        {
          title: 'M.3 Human Review',
          content: 'Significant automated decisions that may have legal or similarly significant effects on you are subject to human review upon request.'
        }
      ]
    },
    {
      title: 'N. Changes to This Privacy Policy',
      content:
        'We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the new version on our website and updating the effective date. We encourage you to review our privacy policy periodically.'
    },
    {
      title: 'O. Contact Us',
      content:
        'If you have any questions about this Privacy Policy or our data practices, or if you wish to exercise your rights regarding your personal information, please contact us at:',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center mt-8">
        <button 
          onClick={handleBackClick}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {fromDashboard ? 'Back to Dashboard' : 'Back to Home'}
        </button>
        
        <div 
          onClick={handleBackClick} 
          className="cursor-pointer flex items-center"
        >
          <Image
            src="/static/images/PyfactorLandingpage.png"
            alt="Dott Logo"
            width={120}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
      
      <div className="mt-4 mb-12 bg-white rounded-lg shadow-lg p-6 sm:p-10">
        <h1 className={`text-center font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-2`}>
          Privacy Policy
        </h1>

        <p className="text-center text-gray-600 mb-8">
          Effective as of: {new Date().toLocaleDateString()}
        </p>

        <hr className="mb-8 border-t border-gray-200" />

        <p className="mb-6 leading-relaxed text-gray-600">
          At Dott LLC, we value your trust and respect your privacy. We exist to provide businesses with comprehensive financial management tools. This Privacy Policy explains—in clear and plain language—what information we collect, how we use it, and the choices you have regarding your personal information, so you can feel confident about using our platform.
        </p>

        <ul className="space-y-6">
          {privacySections.map((section, index) => (
            <li key={index} className="py-4">
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <div key={subIndex} className="w-full mb-4">
                  <SubsectionTitle>{subsection.title}</SubsectionTitle>
                  <SectionContent>{subsection.content}</SectionContent>
                </div>
              ))}
              
              {index !== privacySections.length - 1 && <hr className="w-full mt-4 border-t border-gray-200" />}
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

export default PrivacyPolicy;