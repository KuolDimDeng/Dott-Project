'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';

export default function LogoCollection() {
  const { t } = useTranslation();

  const logos = [
    { src: '/static/images/logos/logo1.png', alt: 'Company 1' },
    { src: '/static/images/logos/logo2.png', alt: 'Company 2' },
    { src: '/static/images/logos/logo3.png', alt: 'Company 3' },
    { src: '/static/images/logos/logo4.png', alt: 'Company 4' },
    { src: '/static/images/logos/logo5.png', alt: 'Company 5' },
    { src: '/static/images/logos/logo6.png', alt: 'Company 6' },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-lg font-medium text-gray-600">
            {t('logoCollection.title', 'Trusted by innovative companies worldwide')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {logos.map((logo, index) => (
            <div 
              key={index}
              className="flex justify-center items-center col-span-1 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={120}
                height={60}
                className="object-contain h-12"
                onError={(e) => {
                  // Fallback for missing images
                  e.target.src = '/static/images/logos/placeholder.png';
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
