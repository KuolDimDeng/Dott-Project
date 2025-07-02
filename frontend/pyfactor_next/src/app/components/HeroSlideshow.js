'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const placeholderImages = [
  {
    src: '/static/images/slideshow/business-overview.png',
    alt: 'Business Overview Dashboard',
    title: 'Business Overview',
    description: 'Monitor your entire business performance from one dashboard'
  },
  {
    src: '/static/images/slideshow/point-of-sale.png',
    alt: 'Point of Sale System',
    title: 'Point of Sale',
    description: 'Process sales quickly with our integrated POS system'
  },
  {
    src: '/static/images/slideshow/product.png',
    alt: 'Product Management',
    title: 'Product Management',
    description: 'Organize and track your products with advanced inventory control'
  },
  {
    src: '/static/images/slideshow/bar-code.png',
    alt: 'Barcode Scanning',
    title: 'Barcode Scanning',
    description: 'Scan and manage inventory with built-in barcode support'
  },
  {
    src: '/static/images/slideshow/supplier.png',
    alt: 'Supplier Management',
    title: 'Supplier Management',
    description: 'Manage vendor relationships and track purchase orders'
  },
  {
    src: '/static/images/slideshow/chart-of-accounts.png',
    alt: 'Chart of Accounts',
    title: 'Financial Accounting',
    description: 'Complete chart of accounts for professional bookkeeping'
  },
  {
    src: '/static/images/slideshow/tax-settings.png',
    alt: 'Tax Settings',
    title: 'Tax Configuration',
    description: 'Configure tax rates for multiple locations and jurisdictions'
  },
  {
    src: '/static/images/slideshow/tax-filing.png',
    alt: 'Tax Filing',
    title: 'Tax Filing Service',
    description: 'File your business taxes with our integrated filing service'
  },
  {
    src: '/static/images/slideshow/calendar.png',
    alt: 'Business Calendar',
    title: 'Smart Calendar',
    description: 'Track important dates, deadlines, and business events'
  }
];

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? placeholderImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === placeholderImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const getSlideIndex = (offset) => {
    const newIndex = currentIndex + offset;
    if (newIndex < 0) return placeholderImages.length + newIndex;
    if (newIndex >= placeholderImages.length) return newIndex - placeholderImages.length;
    return newIndex;
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-8">
      <div className="relative h-[500px] flex items-center justify-center">
        {/* Previous slide */}
        <div className="absolute left-0 w-[35%] h-[85%] opacity-60 transform scale-95 -translate-x-4 z-10">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg bg-gray-100">
            <Image
              src={placeholderImages[getSlideIndex(-1)].src}
              alt={placeholderImages[getSlideIndex(-1)].alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 35vw, 35vw"
            />
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        </div>

        {/* Current slide - centered and larger */}
        <div className="relative w-[65%] h-full z-20">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl bg-gray-50">
            <Image
              src={placeholderImages[currentIndex].src}
              alt={placeholderImages[currentIndex].alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 65vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h3 className="text-2xl font-semibold mb-2">{placeholderImages[currentIndex].title}</h3>
              <p className="text-base opacity-95">{placeholderImages[currentIndex].description}</p>
            </div>
          </div>
        </div>

        {/* Next slide */}
        <div className="absolute right-0 w-[35%] h-[85%] opacity-60 transform scale-95 translate-x-4 z-10">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg bg-gray-100">
            <Image
              src={placeholderImages[getSlideIndex(1)].src}
              alt={placeholderImages[getSlideIndex(1)].alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 35vw, 35vw"
            />
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-30"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-30"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {placeholderImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-primary-main w-8' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}