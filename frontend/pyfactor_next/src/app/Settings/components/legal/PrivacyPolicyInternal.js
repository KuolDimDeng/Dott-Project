'use client';

import React from 'react';

const PrivacyPolicyInternal = () => {
  const SectionTitle = ({ children }) => (
    <h2 className="font-bold text-blue-700 text-xl mt-6 mb-4">
      {children}
    </h2>
  );

  const SectionContent = ({ children }) => (
    <p className="mb-4 leading-relaxed text-gray-600">
      {children}
    </p>
  );
  
  const SubsectionTitle = ({ children }) => (
    <h3 className="font-bold text-gray-800 text-lg mt-4 mb-2">
      {children}
    </h3>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>

        <p className="text-gray-600 mb-6">
          Effective Date: {new Date().toLocaleDateString()}
        </p>

        <hr className="my-6 border-t border-gray-200" />

        <SectionTitle>A. Scope</SectionTitle>
        <SectionContent>
          Protecting your personal information is important to us. This privacy policy applies to our products and services offered under the Dott brand, our websites, and our mobile applications that incorporate this privacy policy. Our products and services are offered by Dott LLC. This policy covers how we collect, use, store, process, and share your information in connection with our financial management platform, including accounting, payroll, payment processing, invoicing, and other services.
        </SectionContent>

        <SectionTitle>B. Personal Information</SectionTitle>
        <SectionContent>
          As part of providing our services, we may collect personal information about you, your business, your employees, and your customers. "Personal Information" is data that can be used to identify a person individually. This policy outlines our collection, protection, use, retention, disclosure and other processing of Personal Information and your rights relating to these activities.
        </SectionContent>
        
        <SubsectionTitle>B.1 Business Information</SubsectionTitle>
        <SectionContent>
          This includes your business name, address, tax identification numbers, industry type, business entity type, and other information necessary to provide our services.
        </SectionContent>
        
        <SubsectionTitle>B.2 Individual Information</SubsectionTitle>
        <SectionContent>
          This includes information about you as a business owner, your employees, contractors, and your customers, as necessary to provide our services.
        </SectionContent>

        <SectionTitle>C. Collection of Personal Information</SectionTitle>
        <SectionContent>
          We may collect Personal Information about you from various sources:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            When you register for a Dott account or use our services
          </li>
          <li className="mb-2 text-gray-600">
            When you enter information into our products and services
          </li>
          <li className="mb-2 text-gray-600">
            When you contact our customer support team
          </li>
          <li className="mb-2 text-gray-600">
            From third-party sources such as financial institutions and payment processors
          </li>
          <li className="mb-2 text-gray-600">
            Through automated technologies when you interact with our services
          </li>
        </ul>

        <SectionTitle>D. Use of Personal Information</SectionTitle>
        <SectionContent>
          We use Personal Information to:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            Provide, maintain, and improve our services
          </li>
          <li className="mb-2 text-gray-600">
            Process transactions and send related information
          </li>
          <li className="mb-2 text-gray-600">
            Send technical notices, updates, security alerts, and support messages
          </li>
          <li className="mb-2 text-gray-600">
            Respond to your comments, questions, and requests
          </li>
          <li className="mb-2 text-gray-600">
            Monitor and analyze trends, usage, and activities
          </li>
          <li className="mb-2 text-gray-600">
            Detect, investigate, and prevent fraudulent transactions and other illegal activities
          </li>
          <li className="mb-2 text-gray-600">
            Comply with legal obligations
          </li>
        </ul>

        <SectionTitle>E. Sharing of Personal Information</SectionTitle>
        <SectionContent>
          We may share Personal Information in the following circumstances:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            With service providers who perform services on our behalf
          </li>
          <li className="mb-2 text-gray-600">
            With financial institutions and payment processors to process transactions
          </li>
          <li className="mb-2 text-gray-600">
            In response to legal requests and to comply with applicable laws
          </li>
          <li className="mb-2 text-gray-600">
            To protect our rights, privacy, safety, or property
          </li>
          <li className="mb-2 text-gray-600">
            With your consent or at your direction
          </li>
        </ul>

        <SectionTitle>F. Data Security</SectionTitle>
        <SectionContent>
          We implement appropriate technical and organizational measures to protect Personal Information against unauthorized access, alteration, disclosure, or destruction. These measures include internal reviews of our data collection, storage, and processing practices, as well as physical and technical security measures.
        </SectionContent>

        <SectionTitle>G. Data Retention</SectionTitle>
        <SectionContent>
          We retain Personal Information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When we no longer need Personal Information, we securely delete or anonymize it.
        </SectionContent>

        <SectionTitle>H. Your Rights</SectionTitle>
        <SectionContent>
          Depending on your location, you may have certain rights regarding your Personal Information, including:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            The right to access your Personal Information
          </li>
          <li className="mb-2 text-gray-600">
            The right to correct or update your Personal Information
          </li>
          <li className="mb-2 text-gray-600">
            The right to delete your Personal Information
          </li>
          <li className="mb-2 text-gray-600">
            The right to object to or restrict certain processing
          </li>
          <li className="mb-2 text-gray-600">
            The right to data portability
          </li>
        </ul>

        <SectionTitle>I. International Data Transfers</SectionTitle>
        <SectionContent>
          Your Personal Information may be transferred to and processed in countries other than the country in which you are resident. These countries may have data protection laws that are different from the laws of your country. We take appropriate safeguards to ensure that your Personal Information remains protected in accordance with this privacy policy.
        </SectionContent>

        <SectionTitle>J. Children's Privacy</SectionTitle>
        <SectionContent>
          Our services are not directed to individuals under 18. We do not knowingly collect Personal Information from children under 18. If we become aware that a child under 18 has provided us with Personal Information, we will take steps to delete such information.
        </SectionContent>

        <SectionTitle>K. Updates to This Policy</SectionTitle>
        <SectionContent>
          We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Effective Date" above. We encourage you to review this privacy policy periodically for any changes.
        </SectionContent>

        <SectionTitle>L. Contact Us</SectionTitle>
        <SectionContent>
          If you have any questions about this privacy policy or our practices, please contact us at:
        </SectionContent>
        
        <div className="pl-4 border-l-4 border-blue-700 mt-4 text-gray-700 italic">
          <address className="not-italic text-sm">
            Dott LLC
            <br />
            Privacy Department
            <br />
            800 N King Street
            <br />
            Suite 304 #2797
            <br />
            Wilmington, DE 19801
            <br />
            United States
            <br />
            <br />
            Email: privacy@dottapps.com
          </address>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyInternal;