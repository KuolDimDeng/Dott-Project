'use client';

import React from 'react';

const CookiePolicyInternal = () => {
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
          Cookie Policy
        </h1>

        <p className="text-gray-600 mb-6">
          Last Updated: {new Date().toLocaleDateString()}
        </p>

        <hr className="my-6 border-t border-gray-200" />

        <SectionTitle>1. What Are Cookies</SectionTitle>
        <SectionContent>
          Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently, provide information to the owners of the site, and improve the user experience. This Cookie Policy explains what cookies are, how we use them, and your choices regarding cookies.
        </SectionContent>

        <SectionTitle>2. How We Use Cookies</SectionTitle>
        <SectionContent>
          Dott uses cookies and similar tracking technologies for several purposes:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            <strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas of the website.
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Performance Cookies:</strong> These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Functionality Cookies:</strong> These cookies enable the website to provide enhanced functionality and personalization, such as remembering your preferences.
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Marketing Cookies:</strong> These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant advertisements on other sites.
          </li>
        </ul>

        <SectionTitle>3. Types of Cookies We Use</SectionTitle>
        
        <SubsectionTitle>3.1 First-Party Cookies</SubsectionTitle>
        <SectionContent>
          These are cookies set by Dott directly. They include:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            <strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Persistent Cookies:</strong> Cookies that remain on your device for a set period or until you delete them
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Authentication Cookies:</strong> Used to identify you when you log in to your account
          </li>
        </ul>

        <SubsectionTitle>3.2 Third-Party Cookies</SubsectionTitle>
        <SectionContent>
          These are cookies set by third-party services that we use:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            <strong>Analytics Cookies:</strong> We use services like Google Analytics and PostHog to understand how our service is used
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Customer Support Cookies:</strong> Set by our customer support tools like Crisp to provide better assistance
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Payment Processing Cookies:</strong> Set by payment providers like Stripe for secure transaction processing
          </li>
        </ul>

        <SectionTitle>4. Specific Cookies We Use</SectionTitle>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 mb-6">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cookie Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">sid</td>
                <td className="px-4 py-2 text-sm text-gray-600">Session identification</td>
                <td className="px-4 py-2 text-sm text-gray-600">Session</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">dott_auth_session</td>
                <td className="px-4 py-2 text-sm text-gray-600">Authentication state</td>
                <td className="px-4 py-2 text-sm text-gray-600">24 hours</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">cookie_consent</td>
                <td className="px-4 py-2 text-sm text-gray-600">Cookie preferences</td>
                <td className="px-4 py-2 text-sm text-gray-600">1 year</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">ph_*</td>
                <td className="px-4 py-2 text-sm text-gray-600">PostHog analytics</td>
                <td className="px-4 py-2 text-sm text-gray-600">1 year</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">_ga, _gid</td>
                <td className="px-4 py-2 text-sm text-gray-600">Google Analytics</td>
                <td className="px-4 py-2 text-sm text-gray-600">2 years / 24 hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        <SectionTitle>5. Your Cookie Choices</SectionTitle>
        <SectionContent>
          You have several options for managing cookies:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            <strong>Cookie Banner:</strong> When you first visit our site, you can choose to accept or reject non-essential cookies
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Browser Settings:</strong> Most web browsers allow you to control cookies through their settings
          </li>
          <li className="mb-2 text-gray-600">
            <strong>Opt-Out Links:</strong> You can opt out of specific third-party cookies using their opt-out mechanisms
          </li>
        </ul>

        <SectionTitle>6. Impact of Disabling Cookies</SectionTitle>
        <SectionContent>
          Please note that if you disable cookies, some features of our service may not function properly. Essential cookies cannot be disabled as they are necessary for the basic functioning of our service.
        </SectionContent>

        <SectionTitle>7. Do Not Track</SectionTitle>
        <SectionContent>
          Some browsers include a "Do Not Track" (DNT) feature that signals to websites that you do not want to have your online activity tracked. Currently, there is no industry standard for how companies should respond to DNT signals. We do not currently respond to DNT signals.
        </SectionContent>

        <SectionTitle>8. Updates to This Policy</SectionTitle>
        <SectionContent>
          We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will post any changes on this page and update the "Last Updated" date.
        </SectionContent>

        <SectionTitle>9. Contact Us</SectionTitle>
        <SectionContent>
          If you have any questions about our use of cookies, please contact us at:
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

export default CookiePolicyInternal;