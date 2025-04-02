import React, { useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import Image from 'next/image';

const faqs = [
  {
    question: 'How do I create an invoice?',
    answer:
      "To create an invoice, navigate to the 'Sales' section in the sidebar, then click on 'Create New' and select 'Invoice'. Fill in the required details including customer information, items/services, quantities, prices, and any applicable taxes or discounts. You can also add notes, payment terms, and due dates. Preview the invoice before saving to ensure everything is correct. Click 'Save' to finalize the invoice, after which you can choose to send it directly to the customer or download it as a PDF.",
  },
  {
    question: 'How can I connect my bank account?',
    answer:
      "Go to the 'Banking' section in the main menu, then click on 'Connect Bank Account'. You'll be presented with a list of supported financial institutions. Select your bank and follow the secure authentication process. Dott uses bank-level encryption to establish a secure connection. Once verified, you'll be able to choose which accounts to connect (checking, savings, etc.). After successful connection, your transactions will begin syncing automatically within 24-48 hours. You can manage connected accounts from the Banking section at any time.",
  },
  {
    question: 'How do I generate financial reports?',
    answer:
      "Navigate to the 'Reports' section in the sidebar. Choose the type of report you want to generate (Profit & Loss, Balance Sheet, Cash Flow, etc.). Set the date range for your report - you can use preset periods (This Month, Last Quarter, Year to Date, etc.) or choose custom dates. Apply any filters if needed, such as specific projects, clients, or departments. Click 'Generate Report' to create your financial statement. Once generated, you can export the report as PDF, Excel, or CSV formats for sharing or further analysis. Reports can also be scheduled to automatically generate on a recurring basis.",
  },
  {
    question: 'Is my data secure when using Dott?',
    answer:
      "Absolutely. Dott ensures bank-level encryption and security to protect your sensitive data, whether you're using our web or mobile platforms. We implement 256-bit SSL encryption for all data transmission, and all stored information is encrypted at rest. We follow SOC 2 compliance standards and regularly undergo security audits by third-party specialists. Our platform uses multi-factor authentication to protect your account from unauthorized access. We never share your financial data with third parties without your explicit consent. Additionally, we perform regular backups to protect against data loss and maintain strict access controls within our organization.",
  },
  {
    question: 'Can I use Dott on mobile?',
    answer:
      'Yes! Dott offers native mobile apps for both iOS and Android, making it easy to manage your business from anywhere. The mobile apps include most features from the web version, including invoice creation and sending, expense tracking, receipt scanning, and financial reporting. You can capture photos of receipts directly within the app for immediate expense recording. Push notifications keep you updated on payment statuses, approaching due dates, and account activity. Your data synchronizes seamlessly between mobile and web versions, ensuring you always have access to up-to-date information regardless of which device you use.',
  },
  {
    question: 'Does Dott offer payroll management?',
    answer:
      'Yes, Dott provides comprehensive payroll management that allows you to automate payroll processing, ensuring compliance with tax laws and regulations. You can manage both employees and contractors, process direct deposits, calculate tax withholdings automatically, track vacation and sick leave, and generate payroll reports. Our platform supports multiple pay schedules (weekly, bi-weekly, monthly) and handles year-end tax documents like W-2s and 1099s. Dott also offers employee self-service portals where staff can access pay stubs, tax documents, and update personal information. The payroll system integrates seamlessly with our time tracking and accounting features for a complete business management solution.',
  },
  {
    question: 'What payment methods can my customers use?',
    answer:
      'Your customers can pay using a wide variety of methods, including mobile money services (M-Pesa, MTN Mobile Money), credit/debit cards (Visa, Mastercard, American Express), bank transfers (ACH, SEPA, wire transfers), and digital wallets (PayPal, Apple Pay, Google Pay). We integrate with global payment processors like Stripe, Flutterwave (for Africa), DLocal (for Latin America), and many others to ensure you can accept payments from customers worldwide. You can enable specific payment methods based on your business needs and customer preferences. For recurring payments, customers can securely save their payment information for future transactions.',
  },
  {
    question: 'Does Dott support multi-currency transactions?',
    answer:
      'Yes, Dott fully supports multi-currency transactions, making it easier for you to handle international business. You can create invoices, record expenses, and generate reports in more than 130 currencies. Exchange rates are automatically updated daily, but you can also set custom rates if needed. The platform allows you to define a base currency for your business while still working with foreign currencies. When receiving payments in foreign currencies, you can choose to convert immediately or hold funds in the original currency. Our multi-currency reporting gives you clear insights into your global financial position, with options to view reports in any currency you choose.',
  },
  {
    question: 'Can I automate recurring payments?',
    answer:
      'Absolutely! With Dott, you can set up recurring invoices and payments, helping you streamline your business operations. For subscription-based businesses, you can create templates with customizable billing frequencies (weekly, monthly, quarterly, yearly). Set specific billing dates, automatic payment collection methods, and stop dates if applicable. The system automatically notifies customers before payments are processed and sends receipts after successful transactions. You can track all recurring revenue streams through dedicated reports and dashboards. If a payment fails, our system will automatically retry based on your configured retry settings and alert you if intervention is needed.',
  },
  {
    question: 'How do I set up different tax rates for different regions?',
    answer:
      'Dott makes it easy to configure multiple tax rates for different regions. Navigate to "Settings" > "Tax Settings" to manage your tax profiles. You can create specific tax rates for each country, state, or city where you do business. For each jurisdiction, you can set up multiple tax types (sales tax, VAT, GST) with their respective rates. The system automatically applies the correct tax based on your customer\'s location. For businesses with complex tax requirements, you can also create tax groups that combine multiple taxes. Our platform keeps up with tax regulation changes in major jurisdictions to help ensure compliance.',
  },
  {
    question: 'Can I track time and bill hours through Dott?',
    answer:
      'Yes, Dott includes comprehensive time tracking features that integrate with invoicing. Team members can log time through the web interface or mobile app, categorizing hours by client, project, or task. Time entries can include notes and attachments for detailed documentation. For client billing, you can set different hourly rates by project, service type, or team member. Time entries can be easily converted into invoices with a few clicks, either individually or in batches. The system also provides time utilization reports to help you analyze team productivity and project profitability.',
  },
  {
    question: 'How do I manage permissions for my team members?',
    answer:
      'Dott offers granular permission controls to ensure team members have appropriate access. Navigate to "Settings" > "Team Members" to invite new users and manage existing ones. You can assign predefined roles like Admin, Manager, Accountant, or Employee, each with different permission levels. For more specific needs, you can create custom roles with precise access controls. Permissions can be set for different areas including accounting, invoicing, expenses, banking, reports, payroll, and settings. You can restrict access by department, location, or client if needed. All user activity is logged in the system for accountability and security auditing.',
  },
  {
    question: 'Can I customize my invoice templates?',
    answer:
      'Absolutely! Dott provides extensive invoice customization options. Go to "Settings" > "Templates" to access the invoice editor. You can add your company logo, change colors to match your brand, and select different layouts. Customize which fields appear on invoices and their positioning. Add personalized terms and conditions, thank you messages, or payment instructions. Save multiple templates for different purposes (quotes, standard invoices, receipts). You can also create language-specific templates for international clients. All templates are mobile-responsive and look professional when viewed on any device or printed.',
  },
  {
    question: 'How do I reconcile my bank transactions in Dott?',
    answer:
      'Bank reconciliation in Dott is straightforward. Once your bank account is connected, transactions import automatically. Navigate to the "Banking" section and select "Reconcile" for the appropriate account. The system uses smart matching to automatically pair imported transactions with those in your books. For unmatched transactions, you can categorize them individually or in batches. You can create rules to automatically categorize recurring transactions. The reconciliation page clearly shows matched, unmatched, and pending transactions, with real-time updates of your reconciled balance. Once complete, you can generate reconciliation reports for your records or accountant review.',
  },
  {
    question: 'Does Dott work in countries with mobile money like M-Pesa?',
    answer:
      'Yes, Dott is specifically designed to work seamlessly with mobile money services like M-Pesa, MTN Mobile Money, Orange Money, and others popular across Africa and parts of Asia. Through our integration with Flutterwave and other regional payment processors, your business can accept mobile money payments directly from customers. The funds appear in your Dott dashboard in real-time once transactions are completed. You can also use mobile money for disbursements, making it easy to pay suppliers or employees who prefer these payment methods. Our reporting system properly categorizes and tracks all mobile money transactions for easy reconciliation and financial management.',
  },
];

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredFaqs, setFilteredFaqs] = useState(faqs);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredFaqs(faqs);
      return;
    }
    
    const filtered = faqs.filter(
      faq => 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFaqs(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await axiosInstance.post('/api/help/contact', { name, email, message });
      setSnackbarOpen(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <svg className="h-11 w-11 text-blue-900 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-2xl font-semibold">Help Center</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column - FAQs */}
        <div className="md:col-span-8">
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-lg font-medium mb-2">Search for Help</h2>
            <div className="flex">
              <input
                type="text"
                placeholder="Search for help topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-900 text-white rounded-r-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500">
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
            </p>
          </div>
          
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-600">
                No results found for "{searchTerm}". Try a different search term or browse our help topics below.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFaqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <details className="group">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 focus:outline-none">
                      <span className="text-blue-900 font-semibold">{faq.question}</span>
                      <span className="transition group-open:rotate-180">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </summary>
                    <div className="p-4 pt-0 text-gray-700">
                      <p>{faq.answer}</p>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
          
          {/* FAQ Image */}
          <div className="mt-8 flex justify-center">
            <Image
              src="/static/images/FAQ.png"
              alt="FAQ Illustration"
              width={300}
              height={200}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Right column - Quick links and contact form */}
        <div className="md:col-span-4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-lg font-medium mb-3">Quick Links</h2>
            <ul className="space-y-2">
              <li>
                <a href="/tutorials" className="flex items-center p-2 hover:bg-gray-50 rounded-md group">
                  <svg className="h-5 w-5 text-blue-900 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="group-hover:text-blue-900">Video Tutorials</span>
                </a>
              </li>
              <li>
                <a href="/user-guide" className="flex items-center p-2 hover:bg-gray-50 rounded-md group">
                  <svg className="h-5 w-5 text-blue-900 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="group-hover:text-blue-900">User Guide</span>
                </a>
              </li>
              <li>
                <a href="/blog" className="flex items-center p-2 hover:bg-gray-50 rounded-md group">
                  <svg className="h-5 w-5 text-blue-900 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <span className="group-hover:text-blue-900">Blog & Tips</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-medium mb-4">Contact Support</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  id="message"
                  rows="4"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
              
              {error && (
                <div className="mb-4 text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {isLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
            <p className="mt-4 text-sm text-gray-500 italic">
              We aim to respond to all inquiries within 24 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Success notification */}
      {snackbarOpen && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p>Your message has been sent successfully. We'll get back to you within 24 hours.</p>
              <button 
                onClick={() => setSnackbarOpen(false)}
                className="absolute top-2 right-2 text-white"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;