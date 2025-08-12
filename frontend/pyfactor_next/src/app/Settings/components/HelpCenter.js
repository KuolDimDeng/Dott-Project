import React, { useState } from 'react';
import { Button, TextField, Card } from '@/components/ui/TailwindComponents';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordions, setOpenAccordions] = useState({});

  // Expanded industry-standard FAQs
  const faqs = [
    {
      question: 'How do I create an invoice?',
      answer: 'To create an invoice, navigate to the "Invoices" tab from the dashboard, click on "New Invoice", fill in the required information, and click "Save" or "Send" to complete the process.'
    },
    {
      question: 'How can I add a new client?',
      answer: 'You can add a new client by going to the "Clients" section, clicking on "Add Client", and filling out the client information form with details such as name, contact information, and payment terms.'
    },
    {
      question: 'What payment methods are supported?',
      answer: 'We currently support credit card payments through Stripe, bank transfers, PayPal, and mobile money services depending on your region and account settings.'
    },
    {
      question: 'How do I generate financial reports?',
      answer: 'To generate financial reports, go to the "Reports" section, select the type of report you want (e.g., Profit & Loss, Balance Sheet), set the date range, and click "Generate Report".'
    },
    {
      question: 'Can I customize my invoice templates?',
      answer: 'Yes, you can customize invoice templates by going to "Settings" > "Invoice Settings", where you can adjust the layout, add your logo, and change colors to match your brand.'
    },
    {
      question: 'How do I export my data?',
      answer: 'You can export your data from most screens using the export button (usually at the top right). We support CSV, Excel, and PDF formats for most data types including invoices, customers, and reports.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we use bank-level security with 256-bit SSL encryption, regular backups, and SOC 2 compliance. All data is stored in secure data centers with 24/7 monitoring and regular security audits.'
    },
    {
      question: 'Can I integrate with other software?',
      answer: 'We offer integrations with popular accounting software, payment processors, and business tools. Check the Integrations section in Settings or contact support for specific integration requests.'
    },
    {
      question: 'How do I manage user permissions?',
      answer: 'As an admin or owner, go to Settings > User Management to add users and set their permissions. You can control access to specific features and data based on user roles.'
    },
    {
      question: 'What happens if I exceed my plan limits?',
      answer: 'You\'ll receive notifications when approaching plan limits. You can upgrade your plan anytime from Settings > Billing. We never stop your service abruptly - you\'ll have time to upgrade or manage your usage.'
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription from Settings > Billing > Manage Subscription. Your data remains accessible until the end of your billing period, and you can export it anytime.'
    },
    {
      question: 'Can I recover deleted data?',
      answer: 'Deleted items are moved to a trash/recycle bin for 30 days before permanent deletion. You can restore items from the trash during this period. For permanent deletions, contact support within 7 days.'
    },
    {
      question: 'How do I set up recurring invoices?',
      answer: 'When creating an invoice, select "Make Recurring" and set the frequency (weekly, monthly, etc.). The system will automatically generate and send invoices based on your schedule.'
    },
    {
      question: 'What tax features are available?',
      answer: 'We support multiple tax rates, automatic tax calculations, tax reports, and compliance with major tax regulations. You can configure tax settings in Settings > Tax Configuration.'
    },
    {
      question: 'How do I track inventory?',
      answer: 'Enable inventory tracking in Settings, then add products with stock levels. The system automatically updates inventory when you create invoices or record purchases.'
    },
    {
      question: 'Can I work offline?',
      answer: 'While most features require an internet connection, we offer limited offline functionality for critical operations. Data syncs automatically when you reconnect.'
    },
    {
      question: 'How do I handle refunds?',
      answer: 'Create a credit note from the original invoice or payment. This can be applied to future invoices or processed as a refund through your payment processor.'
    },
    {
      question: 'What browsers are supported?',
      answer: 'We support the latest versions of Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using Chrome or Firefox with JavaScript enabled.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page and follow the email instructions. For security, password reset links expire after 24 hours.'
    },
    {
      question: 'Can I have multiple businesses?',
      answer: 'Yes, you can manage multiple businesses from one account. Switch between businesses using the dropdown in the top navigation bar.'
    }
  ];

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const toggleAccordion = (index) => {
    setOpenAccordions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2 flex items-center">
        <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600 mr-2" />
        Help Center
      </h1>
      <p className="text-gray-600 mb-6">
        Find answers to common questions and learn how to make the most of Dott's features
      </p>

      <div className="grid grid-cols-1 gap-6">
        <div className="w-full">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              How can we help you today?
            </h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <TextField
                fullWidth
                placeholder="Search for help topics..."
                value={searchQuery}
                onChange={handleSearchChange}
                inputProps={{ className: "pl-10" }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Frequently Asked Questions
              </h2>
              
              {filteredFaqs.length > 0 ? (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                      <button 
                        onClick={() => toggleAccordion(index)}
                        className="w-full flex justify-between items-center p-4 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none"
                      >
                        <span className="font-medium">{faq.question}</span>
                        <svg 
                          className={`w-5 h-5 transition-transform ${openAccordions[index] ? 'transform rotate-180' : ''}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                      </button>
                      {openAccordions[index] && (
                        <div className="p-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No results found for "{searchQuery}". Try a different search term or contact support.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <h2 className="text-xl font-semibold">Contact Support</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <p className="text-sm mb-4">
                Email: <a href="mailto:support@dottapps.com" className="text-blue-600 hover:underline">support@dottapps.com</a>
              </p>
              <p className="text-sm text-gray-600">
                We typically respond within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;