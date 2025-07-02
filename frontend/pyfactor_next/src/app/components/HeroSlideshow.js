'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const placeholderImages = [
  {
    src: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=Dashboard+Overview',
    alt: 'Dashboard Overview',
    title: 'Comprehensive Dashboard',
    description: 'Get a complete overview of your business metrics'
  },
  {
    src: 'https://via.placeholder.com/600x400/7C3AED/FFFFFF?text=Invoice+Management',
    alt: 'Invoice Management',
    title: 'Professional Invoices',
    description: 'Create and manage invoices with ease'
  },
  {
    src: 'https://via.placeholder.com/600x400/EC4899/FFFFFF?text=Inventory+Tracking',
    alt: 'Inventory Tracking',
    title: 'Smart Inventory',
    description: 'Track inventory with barcode scanning'
  },
  {
    src: 'https://via.placeholder.com/600x400/F59E0B/FFFFFF?text=Payment+Processing',
    alt: 'Payment Processing',
    title: 'Secure Payments',
    description: 'Accept payments from customers worldwide'
  },
  {
    src: 'https://via.placeholder.com/600x400/10B981/FFFFFF?text=Reports+Analytics',
    alt: 'Reports & Analytics',
    title: 'Detailed Analytics',
    description: 'Gain insights with comprehensive reports'
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

  const currentImage = placeholderImages[currentIndex];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative aspect-[3/2] overflow-hidden rounded-lg shadow-2xl bg-gray-100">
        <Image
          src={currentImage.src}
          alt={currentImage.alt}
          fill
          className="object-cover"
          priority={currentIndex === 0}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="text-xl font-semibold mb-1">{currentImage.title}</h3>
          <p className="text-sm opacity-90">{currentImage.description}</p>
        </div>

        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex justify-center mt-4 space-x-2">
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