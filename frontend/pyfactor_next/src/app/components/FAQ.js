'use client';


import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function FAQ() {
  const { t } = useTranslation();
  
  const faqs = [
    {
      question: t('faq.global.question', 'Does Dott work for businesses outside the US?'),
      answer: t('faq.global.answer', 'Yes, Dott is designed to work globally. We support multiple currencies, languages, and regional payment methods. Our platform complies with tax regulations in various countries, allowing you to run your business anywhere in the world.')
    },
    {
      question: t('faq.cost.question', 'How much does it cost?'),
      answer: t('faq.cost.answer', 'We offer different pricing tiers based on your business needs. Our basic plan starts at $9.99/month, while our premium plan with advanced features costs $29.99/month. All plans include core features like inventory management, invoicing, and basic reporting. Visit our pricing page for a detailed comparison.')
    },
    {
      question: t('faq.onboarding.question', 'How long does it take to set up?'),
      answer: t('faq.onboarding.answer', 'Most businesses get up and running with Dott in less than a day. Our intuitive setup wizard guides you through the process, and our customer success team is available to help if you need assistance. If you\'re migrating from another system, we offer tools to import your existing data.')
    },
    {
      question: t('faq.support.question', 'What kind of support do you offer?'),
      answer: t('faq.support.answer', 'We provide 24/7 customer support via chat, email, and phone. Our team is available in multiple languages to assist businesses across different time zones. Premium plans include dedicated account managers and priority support.')
    },
    {
      question: t('faq.data.question', 'Is my business data secure?'),
      answer: t('faq.data.answer', 'Yes, we take security seriously. Dott uses bank-level encryption to protect your data, regular security audits, and complies with GDPR and other regional data protection regulations. Your business data is backed up regularly and stored securely in the cloud.')
    },
    {
      question: t('faq.integration.question', 'Can I integrate with other tools I use?'),
      answer: t('faq.integration.answer', 'Absolutely. Dott integrates with popular payment processors, accounting software, e-commerce platforms, and other business tools. We also offer an API for custom integrations. Check our integration page for a full list of supported services.')
    }
  ];
  
  const [openFaq, setOpenFaq] = useState(null);
  
  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div id="faq" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('faq.eyebrow', 'FAQ')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('faq.heading', 'Frequently asked questions')}
          </p>
          <p className="mt-6 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('faq.subheading', 'Find answers to common questions about our platform and services.')}
          </p>
        </div>
        
        <div className="mt-16 max-w-4xl mx-auto divide-y divide-gray-200">
          {faqs.map((faq, index) => (
            <div key={index} className="py-6">
              <button
                onClick={() => toggleFaq(index)}
                className="flex justify-between items-center w-full text-left focus:outline-none"
              >
                <h3 className="text-xl font-medium text-gray-900">{faq.question}</h3>
                <span className="ml-6 flex-shrink-0">
                  <svg 
                    className={`h-6 w-6 text-primary-main transform ${openFaq === index ? 'rotate-180' : 'rotate-0'} transition-transform duration-200 ease-in-out`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div 
                className={`mt-2 transition-all duration-300 overflow-hidden ${
                  openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-base text-gray-600">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-base text-gray-600">
            {t('faq.more.text', 'Still have questions?')}
          </p>
          <a
            href="/contact"
            className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
          >
            {t('faq.more.contact', 'Contact Support')}
          </a>
        </div>
      </div>
    </div>
  );
}