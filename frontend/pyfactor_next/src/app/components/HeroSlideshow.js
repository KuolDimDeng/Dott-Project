'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function HeroSlideshow() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = React.useRef(null);

  const placeholderImages = [
    {
      src: '/static/images/slideshow/business-overview.png',
      alt: 'Business Overview Dashboard',
      title: t('heroSlideshow.slides.businessOverview.title', 'Business Overview'),
      description: t('heroSlideshow.slides.businessOverview.description', 'Monitor your entire business performance from one dashboard')
    },
    {
      src: '/static/images/slideshow/point-of-sale.png',
      alt: 'Point of Sale System',
      title: t('heroSlideshow.slides.pos.title', 'Point of Sale'),
      description: t('heroSlideshow.slides.pos.description', 'Process sales quickly with our integrated POS system')
    },
    {
      src: '/static/images/slideshow/product.png',
      alt: 'Product Management',
      title: t('heroSlideshow.slides.productManagement.title', 'Product Management'),
      description: t('heroSlideshow.slides.productManagement.description', 'Organize and track your products with advanced inventory control')
    },
    {
      src: '/static/images/slideshow/bar-code.png',
      alt: 'Barcode Scanning',
      title: t('heroSlideshow.slides.barcodeScanning.title', 'Barcode Scanning'),
      description: t('heroSlideshow.slides.barcodeScanning.description', 'Scan and manage inventory with built-in barcode support')
    },
    {
      src: '/static/images/slideshow/supplier.png',
      alt: 'Supplier Management',
      title: t('heroSlideshow.slides.supplierManagement.title', 'Supplier Management'),
      description: t('heroSlideshow.slides.supplierManagement.description', 'Manage vendor relationships and track purchase orders')
    },
    {
      src: '/static/images/slideshow/chart-of-accounts.png',
      alt: 'Chart of Accounts',
      title: t('heroSlideshow.slides.financialAccounting.title', 'Financial Accounting'),
      description: t('heroSlideshow.slides.financialAccounting.description', 'Complete chart of accounts for professional bookkeeping')
    },
    {
      src: '/static/images/slideshow/tax-settings.png',
      alt: 'Tax Settings',
      title: t('heroSlideshow.slides.taxConfiguration.title', 'Tax Configuration'),
      description: t('heroSlideshow.slides.taxConfiguration.description', 'Configure tax rates for multiple locations and jurisdictions')
    },
    {
      src: '/static/images/slideshow/tax-filing.png',
      alt: 'Tax Filing',
      title: t('heroSlideshow.slides.taxFiling.title', 'Tax Filing Service'),
      description: t('heroSlideshow.slides.taxFiling.description', 'File your business taxes with our integrated filing service')
    },
    {
      src: '/static/images/slideshow/calendar.png',
      alt: 'Business Calendar',
      title: t('heroSlideshow.slides.smartCalendar.title', 'Smart Calendar'),
      description: t('heroSlideshow.slides.smartCalendar.description', 'Track important dates, deadlines, and business events')
    }
  ];

  // Auto-play functionality
  React.useEffect(() => {
    const startAutoPlay = () => {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === placeholderImages.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000); // Change slide every 5 seconds
    };

    if (!isPaused) {
      startAutoPlay();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  // Pause auto-play for 10 seconds after user interaction
  const handleUserInteraction = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Resume auto-play after 10 seconds
    setTimeout(() => {
      setIsPaused(false);
    }, 10000);
  };

  const goToPrevious = () => {
    handleUserInteraction();
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? placeholderImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    handleUserInteraction();
    setCurrentIndex((prevIndex) => 
      prevIndex === placeholderImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index) => {
    handleUserInteraction();
    setCurrentIndex(index);
  };

  const getSlideIndex = (offset) => {
    const newIndex = currentIndex + offset;
    if (newIndex < 0) return placeholderImages.length + newIndex;
    if (newIndex >= placeholderImages.length) return newIndex - placeholderImages.length;
    return newIndex;
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4">
      <div className="relative h-[800px] flex items-center justify-center">
        {/* Main slide only - larger and centered */}
        <div className="relative w-full h-full">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl bg-gray-50">
            <Image
              src={placeholderImages[currentIndex].src}
              alt={placeholderImages[currentIndex].alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h3 className="text-3xl font-semibold mb-2">{placeholderImages[currentIndex].title}</h3>
              <p className="text-lg opacity-95">{placeholderImages[currentIndex].description}</p>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-30"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="h-8 w-8" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-30"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="h-8 w-8" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center items-center mt-6 space-x-2">
        {placeholderImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-primary-main w-8 h-2' 
                : 'bg-gray-300 hover:bg-gray-400 w-2 h-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
        {/* Auto-play indicator */}
        <div className="ml-4 flex items-center text-xs text-gray-500">
          {!isPaused && (
            <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
          {isPaused ? t('heroSlideshow.controls.paused', 'Paused') : t('heroSlideshow.controls.autoPlaying', 'Auto-playing')}
        </div>
      </div>
    </div>
  );
}