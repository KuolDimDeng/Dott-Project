import React, { useState } from 'react';
import { Button, TextField, Card } from '@/components/ui/TailwindComponents';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordions, setOpenAccordions] = useState({});

  // Mock FAQs
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
  ];

  // Mock popular articles
  const popularArticles = [
    { 
      title: 'Getting Started Guide', 
      description: 'Learn the basics of setting up your account and using the platform.'
    },
    { 
      title: 'Invoice Management', 
      description: 'Everything you need to know about creating and managing invoices.'
    },
    { 
      title: 'Payment Processing', 
      description: 'Learn about different payment methods and how to process payments.'
    },
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
      <h1 className="text-2xl font-bold mb-6">
        Help Center
      </h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Frequently Asked Questions
              </h2>
              
              {filteredFaqs.length > 0 ? (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <button 
                        onClick={() => toggleAccordion(index)}
                        className="w-full flex justify-between items-center p-4 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
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
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No results found for "{searchQuery}". Try a different search term or contact support.
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Popular Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {popularArticles.map((article, index) => (
                  <Card key={index}>
                    <div className="p-4 flex-grow">
                      <h3 className="font-medium text-lg mb-2">{article.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {article.description}
                      </p>
                    </div>
                    <div className="px-4 pb-4">
                      <Button variant="text">
                        Read More
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <h2 className="text-xl font-semibold">Contact Support</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <Button 
                variant="primary" 
                fullWidth
                className="mb-4"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Submit a Support Ticket
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                For urgent matters, contact us directly:
              </p>
              <p className="text-sm mb-2">
                Email: <a href="mailto:support@pyfactor.com" className="text-blue-600 hover:underline">support@pyfactor.com</a>
              </p>
              <p className="text-sm mb-2">
                Phone: <a href="tel:+12345678901" className="text-blue-600 hover:underline">+1 (234) 567-8901</a>
              </p>
              <p className="text-sm mb-2">
                Hours: Monday-Friday, 9AM-6PM EST
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <h2 className="text-xl font-semibold">Community</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Join our user community to connect with other users and share experiences.
              </p>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                <li>
                  <a href="#" className="flex items-center py-3 hover:text-blue-600">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                    </svg>
                    <span>User Forums</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center py-3 hover:text-blue-600">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <span>Video Tutorials</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center py-3 hover:text-blue-600">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span>Documentation</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter; 