import React, { useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import Image from 'next/image';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const faqs = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'How do I get started with Dott?',
    answer: 'Getting started with Dott is simple! After signing up, complete the onboarding process by adding your business information, connecting your bank account, and setting up your first customers and products. Our step-by-step setup wizard will guide you through each process. You can also import existing data from other accounting software using our migration tools. If you need assistance, our support team offers free onboarding sessions to help you get up and running quickly.',
  },
  {
    category: 'Getting Started',
    question: 'Can I import data from my previous accounting software?',
    answer: 'Yes! Dott supports data import from popular accounting software including QuickBooks, Xero, FreshBooks, Wave, and Excel/CSV files. You can import customers, vendors, products, chart of accounts, and historical transactions. Our import wizard guides you through the process and validates your data before importing. For complex migrations, we offer professional migration services to ensure all your historical data is transferred accurately.',
  },
  
  // Invoicing & Billing
  {
    category: 'Invoicing & Billing',
    question: 'How do I create an invoice?',
    answer: "To create an invoice, navigate to the 'Sales' section in the sidebar, then click on 'Create New' and select 'Invoice'. Fill in the required details including customer information, items/services, quantities, prices, and any applicable taxes or discounts. You can also add notes, payment terms, and due dates. Preview the invoice before saving to ensure everything is correct. Click 'Save' to finalize the invoice, after which you can choose to send it directly to the customer or download it as a PDF.",
  },
  {
    category: 'Invoicing & Billing',
    question: 'Can I customize my invoice templates?',
    answer: 'Absolutely! Dott provides extensive invoice customization options. Go to "Settings" > "Templates" to access the invoice editor. You can add your company logo, change colors to match your brand, and select different layouts. Customize which fields appear on invoices and their positioning. Add personalized terms and conditions, thank you messages, or payment instructions. Save multiple templates for different purposes (quotes, standard invoices, receipts). You can also create language-specific templates for international clients.',
  },
  {
    category: 'Invoicing & Billing',
    question: 'How do I set up recurring invoices?',
    answer: 'Set up recurring invoices by creating a standard invoice template, then selecting "Make Recurring" from the invoice actions. Choose your billing frequency (weekly, monthly, quarterly, yearly), start date, and end date if applicable. The system will automatically generate and send invoices according to your schedule. You can set up automatic payment collection, customize email notifications, and track recurring revenue through dedicated reports.',
  },
  
  // Payments
  {
    category: 'Payments',
    question: 'What payment methods can my customers use?',
    answer: 'Your customers can pay using credit/debit cards (Visa, Mastercard, American Express), bank transfers (ACH, SEPA, wire transfers), digital wallets (PayPal, Apple Pay, Google Pay), and mobile money services (M-Pesa, MTN Mobile Money). We integrate with global payment processors like Stripe, Flutterwave, and DLocal to ensure worldwide payment acceptance. You can enable specific payment methods based on your business needs and customer preferences.',
  },
  {
    category: 'Payments',
    question: 'How do I process refunds?',
    answer: 'To process a refund, go to the Payments section and find the original payment. Click "Refund" and choose between a full or partial refund. Enter the refund reason and amount if partial. The refund will be processed through the original payment method within 5-10 business days. Both you and your customer will receive confirmation emails, and the refund will automatically update your financial records.',
  },
  
  // Banking & Financial Management
  {
    category: 'Banking & Financial Management',
    question: 'How can I connect my bank account?',
    answer: "Go to the 'Banking' section in the main menu, then click on 'Connect Bank Account'. You'll be presented with a list of supported financial institutions. Select your bank and follow the secure authentication process. Dott uses bank-level encryption to establish a secure connection. Once verified, you'll be able to choose which accounts to connect (checking, savings, etc.). After successful connection, your transactions will begin syncing automatically within 24-48 hours.",
  },
  {
    category: 'Banking & Financial Management',
    question: 'How do I reconcile my bank transactions?',
    answer: 'Bank reconciliation in Dott is straightforward. Once your bank account is connected, transactions import automatically. Navigate to the "Banking" section and select "Reconcile" for the appropriate account. The system uses smart matching to automatically pair imported transactions with those in your books. For unmatched transactions, you can categorize them individually or in batches. You can create rules to automatically categorize recurring transactions.',
  },
  {
    category: 'Banking & Financial Management',
    question: 'Does Dott support multi-currency transactions?',
    answer: 'Yes, Dott fully supports multi-currency transactions for international business. You can create invoices, record expenses, and generate reports in more than 130 currencies. Exchange rates are automatically updated daily, but you can also set custom rates if needed. The platform allows you to define a base currency for your business while still working with foreign currencies. Our multi-currency reporting gives you clear insights into your global financial position.',
  },
  
  // Reporting & Analytics
  {
    category: 'Reporting & Analytics',
    question: 'How do I generate financial reports?',
    answer: "Navigate to the 'Reports' section in the sidebar. Choose the type of report you want to generate (Profit & Loss, Balance Sheet, Cash Flow, etc.). Set the date range for your report - you can use preset periods (This Month, Last Quarter, Year to Date, etc.) or choose custom dates. Apply any filters if needed, such as specific projects, clients, or departments. Click 'Generate Report' to create your financial statement. Reports can be exported as PDF, Excel, or CSV formats.",
  },
  {
    category: 'Reporting & Analytics',
    question: 'Can I schedule automatic reports?',
    answer: 'Yes! You can schedule reports to be automatically generated and emailed to specified recipients. Go to Reports > Scheduled Reports, choose your report type, set the frequency (daily, weekly, monthly, quarterly), and add email recipients. Reports will be automatically generated and sent according to your schedule. This is perfect for keeping stakeholders updated or maintaining regular financial reviews.',
  },
  
  // Team Management
  {
    category: 'Team Management',
    question: 'How do I manage permissions for my team members?',
    answer: 'Dott offers granular permission controls to ensure team members have appropriate access. Navigate to "Settings" > "Team Members" to invite new users and manage existing ones. You can assign predefined roles like Admin, Manager, Accountant, or Employee, each with different permission levels. For more specific needs, you can create custom roles with precise access controls. Permissions can be set for different areas including accounting, invoicing, expenses, banking, and reports.',
  },
  {
    category: 'Team Management',
    question: 'Can I track time and bill hours through Dott?',
    answer: 'Yes, Dott includes comprehensive time tracking features that integrate with invoicing. Team members can log time through the web interface or mobile app, categorizing hours by client, project, or task. Time entries can include notes and attachments for detailed documentation. For client billing, you can set different hourly rates by project, service type, or team member. Time entries can be easily converted into invoices with a few clicks.',
  },
  
  // Payroll & HR
  {
    category: 'Payroll & HR',
    question: 'Does Dott offer payroll management?',
    answer: 'Yes, Dott provides comprehensive payroll management that allows you to automate payroll processing, ensuring compliance with tax laws and regulations. You can manage both employees and contractors, process direct deposits, calculate tax withholdings automatically, track vacation and sick leave, and generate payroll reports. Our platform supports multiple pay schedules and handles year-end tax documents like W-2s and 1099s.',
  },
  {
    category: 'Payroll & HR',
    question: 'How do I handle employee benefits and deductions?',
    answer: 'Set up employee benefits and deductions in the Payroll section under Employee Settings. You can configure health insurance, retirement contributions, union dues, garnishments, and other deductions. Benefits can be set as fixed amounts, percentages of salary, or tiered based on employee level. The system automatically calculates deductions during payroll processing and maintains detailed records for reporting and compliance purposes.',
  },
  
  // Taxes & Compliance
  {
    category: 'Taxes & Compliance',
    question: 'How do I set up different tax rates for different regions?',
    answer: 'Dott makes it easy to configure multiple tax rates for different regions. Navigate to "Settings" > "Tax Settings" to manage your tax profiles. You can create specific tax rates for each country, state, or city where you do business. For each jurisdiction, you can set up multiple tax types (sales tax, VAT, GST) with their respective rates. The system automatically applies the correct tax based on your customer\'s location.',
  },
  {
    category: 'Taxes & Compliance',
    question: 'Does Dott help with tax filing and compliance?',
    answer: 'Yes! Dott offers comprehensive tax filing services including sales tax, payroll tax, and income tax preparation. Our AI-powered system determines your filing requirements and can handle the entire process for you. We support e-filing for all major states and provide full-service and self-service options. You can also generate tax reports and documents needed for filing, with automated compliance checking to ensure accuracy.',
  },
  
  // Mobile & Accessibility
  {
    category: 'Mobile & Accessibility',
    question: 'Can I use Dott on mobile?',
    answer: 'Yes! Dott offers native mobile apps for both iOS and Android, making it easy to manage your business from anywhere. The mobile apps include most features from the web version, including invoice creation and sending, expense tracking, receipt scanning, and financial reporting. You can capture photos of receipts directly within the app for immediate expense recording. Your data synchronizes seamlessly between mobile and web versions.',
  },
  {
    category: 'Mobile & Accessibility',
    question: 'Does Dott work offline?',
    answer: 'While Dott is primarily cloud-based, our mobile apps offer limited offline functionality. You can view previously loaded data, create invoices and expenses, and capture receipt photos when offline. All changes sync automatically when you reconnect to the internet. For full functionality and real-time data updates, an internet connection is required.',
  },
  
  // Security & Data Protection
  {
    category: 'Security & Data Protection',
    question: 'Is my data secure when using Dott?',
    answer: "Absolutely. Dott ensures bank-level encryption and security to protect your sensitive data. We implement 256-bit SSL encryption for all data transmission, and all stored information is encrypted at rest. We follow SOC 2 compliance standards and regularly undergo security audits by third-party specialists. Our platform uses multi-factor authentication to protect your account from unauthorized access. We never share your financial data with third parties without your explicit consent.",
  },
  {
    category: 'Security & Data Protection',
    question: 'How do I enable two-factor authentication?',
    answer: 'Enable two-factor authentication (2FA) by going to Settings > Security > Multi-Factor Authentication. Choose your preferred method: authenticator app (recommended), SMS, or email. Follow the setup instructions to verify your method. Once enabled, you\'ll need to provide a second form of verification when logging in. 2FA significantly enhances your account security and is strongly recommended for all users.',
  },
  {
    category: 'Security & Data Protection',
    question: 'How often is my data backed up?',
    answer: 'Your data is automatically backed up every hour with real-time replication across multiple secure data centers. We maintain rolling backups for 90 days and can restore your account to any point within that timeframe if needed. All backups are encrypted and stored in geographically distributed locations to ensure maximum data protection and availability.',
  },
  
  // Integrations & Advanced Features
  {
    category: 'Integrations & Advanced Features',
    question: 'What third-party integrations does Dott support?',
    answer: 'Dott integrates with popular business tools including e-commerce platforms (Shopify, WooCommerce), payment processors (Stripe, PayPal), banking providers, CRM systems (Salesforce, HubSpot), and productivity tools (Google Workspace, Microsoft 365). We also offer API access for custom integrations. Check our Integrations marketplace for the complete list of available connections.',
  },
  {
    category: 'Integrations & Advanced Features',
    question: 'Does Dott have an API for custom integrations?',
    answer: 'Yes! Dott provides a comprehensive REST API that allows you to integrate with your existing systems and build custom applications. The API supports all major functions including customer management, invoicing, payment processing, and reporting. We provide detailed documentation, SDKs for popular programming languages, and sandbox environments for testing. API access is available on Professional and Enterprise plans.',
  },
  
  // Support & Troubleshooting
  {
    category: 'Support & Troubleshooting',
    question: 'What support options are available?',
    answer: 'Dott offers multiple support channels: 24/7 live chat through the chat icon in your dashboard, email support at support@dottapps.com (24-hour response time), comprehensive help documentation, video tutorials, and webinar training sessions. Professional and Enterprise plan users also receive priority support and dedicated account management.',
  },
  {
    category: 'Support & Troubleshooting',
    question: 'How do I export my data if I want to switch software?',
    answer: 'You can export all your data at any time from Settings > Data Export. Choose the data types you want to export (customers, transactions, reports, etc.) and select your preferred format (CSV, Excel, or accounting software format). The export includes all historical data and can be easily imported into most other accounting software. We also provide migration assistance for Professional and Enterprise users.',
  },
];

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredFaqs, setFilteredFaqs] = useState(faqs);

  // Get unique categories for filter dropdown
  const categories = [...new Set(faqs.map(faq => faq.category))].sort();

  // Auto-filter when search term or category changes
  React.useEffect(() => {
    let filtered = faqs;
    
    // Filter by category first
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }
    
    // Then filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        faq => 
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredFaqs(filtered);
  }, [searchTerm, selectedCategory]);

  const handleSearch = () => {
    // This function is now mainly for manual search button clicks
    // The actual filtering is handled by the useEffect above
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600 mr-2" />
          Help Center
        </h1>
        <p className="text-gray-600">
          Find answers to frequently asked questions and get support for your Dott account
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column - FAQs */}
        <div className="md:col-span-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Search for Help</h2>
            
            {/* Category Filter */}
            <div className="mb-4">
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories ({faqs.length} articles)</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category} ({faqs.filter(faq => faq.category === category).length} articles)
                  </option>
                ))}
              </select>
            </div>
            
            {/* Search Bar */}
            <div>
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-2">
                Search Articles
              </label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search questions, answers, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(selectedCategory !== 'all' || searchTerm.trim()) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    Category: {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {searchTerm.trim() && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            <div className="text-sm text-gray-500">
              <span className="font-medium">{filteredFaqs.length}</span> {filteredFaqs.length === 1 ? 'article' : 'articles'} found
              {selectedCategory !== 'all' && (
                <span className="ml-2 text-blue-600">in {selectedCategory}</span>
              )}
            </div>
          </div>
          
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm.trim() ? (
                  <>No results found for "<strong>{searchTerm}</strong>"{selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}.</>
                ) : (
                  <>No articles found in {selectedCategory}.</>
                )}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <details className="group">
                    <summary className="flex justify-between items-start cursor-pointer list-none p-6 focus:outline-none focus:bg-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center mb-2">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                          {faq.question}
                        </h3>
                      </div>
                      <span className="flex-shrink-0 transition-transform group-open:rotate-180 ml-2">
                        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-6 pb-6 text-gray-700 leading-relaxed">
                      <div className="pt-4 border-t border-gray-100">
                        <p className="whitespace-pre-line">{faq.answer}</p>
                      </div>
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
            <div className="mt-4 text-sm text-gray-500">
              <p className="italic">We aim to respond to all inquiries within 24 hours.</p>
              <p className="mt-2">
                <strong>Email:</strong> <a href="mailto:support@dottapps.com" className="text-blue-600 hover:text-blue-800">support@dottapps.com</a>
              </p>
              <p className="mt-1">
                For faster response, use the chat icon in the bottom right corner.
              </p>
            </div>
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