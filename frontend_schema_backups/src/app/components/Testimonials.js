'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';

export default function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
    {
      content: t(
        'testimonials.quote1',
        'Dott completely transformed our inventory management. We used to spend hours tracking products across different locations, but now everything is streamlined in one platform. The time savings alone made it worth the investment.'
      ),
      author: {
        name: t('testimonials.author1.name', 'Sarah Johnson'),
        role: t('testimonials.author1.role', 'Operations Manager'),
        company: t('testimonials.author1.company', 'Retail Solutions Inc.'),
        image: '/static/images/testimonials/avatar1.png',
      },
    },
    {
      content: t(
        'testimonials.quote2',
        'The reporting features are incredible. We can now visualize our sales data in real-time and make informed decisions quickly. Our quarterly planning meetings are now much more productive with these insights.'
      ),
      author: {
        name: t('testimonials.author2.name', 'David Chen'),
        role: t('testimonials.author2.role', 'CFO'),
        company: t('testimonials.author2.company', 'Global Manufacturing Co.'),
        image: '/static/images/testimonials/avatar2.png',
      },
    },
    {
      content: t(
        'testimonials.quote3',
        'As a growing e-commerce business, we needed a solution that could scale with us. Dott has been the perfect fit - it handled our 300% growth without missing a beat, and the customer support team has been exceptional every step of the way.'
      ),
      author: {
        name: t('testimonials.author3.name', 'Emma Rodriguez'),
        role: t('testimonials.author3.role', 'Founder & CEO'),
        company: t('testimonials.author3.company', 'Bright Home Goods'),
        image: '/static/images/testimonials/avatar3.png',
      },
    },
  ];

  // Placeholder for missing avatar images
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary-main uppercase tracking-wide">
            {t('testimonials.eyebrow', 'Testimonials')}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {t('testimonials.heading', 'Trusted by businesses worldwide')}
          </p>
          <p className="mt-6 max-w-2xl text-xl text-gray-600 mx-auto">
            {t(
              'testimonials.subheading',
              'See what our customers have to say about their experience using Dott to streamline their business operations.'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 flex flex-col h-full hover:shadow-lg transition-shadow duration-300"
            >
              {/* Quote icon */}
              <svg
                className="h-10 w-10 text-primary-light mb-4"
                fill="currentColor"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>

              {/* Testimonial content */}
              <blockquote className="flex-1">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
              </blockquote>

              {/* Author info */}
              <div className="flex items-center mt-4">
                <div className="flex-shrink-0 h-12 w-12 relative">
                  {testimonial.author.image ? (
                    <Image
                      className="h-12 w-12 rounded-full"
                      src={testimonial.author.image}
                      alt={testimonial.author.name}
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary-light/30 flex items-center justify-center text-primary-main font-bold">
                      {getInitials(testimonial.author.name)}
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <div className="text-base font-medium text-gray-900">
                    {testimonial.author.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.author.role}, {testimonial.author.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-base font-medium text-gray-900 mb-4">
            {t('testimonials.cta.text', 'Join thousands of satisfied customers already using Dott')}
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
          >
            {t('testimonials.cta.button', 'Get Started Today')}
          </a>
        </div>
      </div>
    </section>
  );
}
