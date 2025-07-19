'use client';


import { useTranslation } from 'react-i18next';
import Image from 'next/image';

export default function Highlights() {
  const { t } = useTranslation();
  
  const highlights = [
    {
      title: t('highlights.mobile.title', 'Mobile Application'),
      description: t('highlights.mobile.description', 'Access your business data anytime, anywhere with our powerful mobile app. Manage inventory, process sales, and view real-time reports on the go.'),
      image: '/static/images/mobile-app-screenshot.jpg',
      imageAlt: 'Mobile application screenshot',
      reverse: false,
    },
    {
      title: t('highlights.integration.title', 'Seamless Integrations'),
      description: t('highlights.integration.description', 'Connect with your favorite tools and services. Our platform integrates with payment processors, accounting software, e-commerce platforms, and more.'),
      image: '/static/images/integration-diagram.jpg',
      imageAlt: 'Integration diagram showing connected services',
      reverse: true,
    },
    {
      title: t('highlights.ai.title', 'AI-Powered Insights'),
      description: t('highlights.ai.description', 'Get smart recommendations and predictive analytics based on your business data. Our AI helps you forecast demand, optimize inventory, and identify growth opportunities.'),
      image: '/static/images/ai-dashboard-screenshot.jpg',
      imageAlt: 'AI analytics dashboard screenshot',
      reverse: false,
    },
  ];

  return (
    <div className="bg-gray-50 py-16 sm:py-24" id="highlights">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('highlights.eyebrow', 'Key Benefits')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('highlights.heading', 'Why businesses choose Dott')}
          </p>
          <p className="mt-6 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('highlights.subheading', 'Advanced features that set us apart from the competition and help your business grow.')}
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {highlights.map((highlight, index) => (
            <div 
              key={index}
              className={`relative ${
                index !== highlights.length - 1 ? 'pb-16 border-b border-gray-200' : ''
              }`}
            >
              <div className={`lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center ${
                highlight.reverse ? 'lg:grid-flow-row-dense' : ''
              }`}>
                <div className={`${highlight.reverse ? 'lg:col-start-2' : 'lg:col-start-1'}`}>
                  <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
                    {highlight.title}
                  </h3>
                  <p className="mt-3 text-lg text-gray-600">
                    {highlight.description}
                  </p>
                  
                  {/* Show integration logos for the integration highlight */}
                  {highlight.title === t('highlights.integration.title', 'Seamless Integrations') && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">Integrated with:</p>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                          <span className="text-green-600 font-bold">W</span>
                          <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                          <div className="w-6 h-6 relative">
                            <Image
                              src="/images/integrations/mpesa.jpg"
                              alt="M-Pesa"
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">M-Pesa</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                          <span className="text-purple-600 font-bold">S</span>
                          <span className="text-sm font-medium text-gray-700">Stripe</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
                          <span className="text-gray-400">+</span>
                          <span className="text-sm text-gray-500">More coming</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8">
                    <a
                      href="#"
                      className="inline-flex items-center text-primary-main font-medium hover:text-primary-dark"
                    >
                      {t('highlights.learnMore', 'Learn more')}
                      <svg 
                        className="ml-2 w-5 h-5" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor" 
                        aria-hidden="true"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </a>
                  </div>
                </div>
                
                <div className={`mt-10 lg:mt-0 ${highlight.reverse ? 'lg:col-start-1' : 'lg:col-start-2'}`}>
                  <div className="relative overflow-hidden rounded-lg shadow-xl">
                    <div className="aspect-w-5 aspect-h-3">
                      <Image
                        src={highlight.image}
                        alt={highlight.imageAlt}
                        width={800}
                        height={480}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}