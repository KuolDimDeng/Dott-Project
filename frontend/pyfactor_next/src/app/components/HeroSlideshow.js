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

  const getSlideIndex = (offset) => {
    const newIndex = currentIndex + offset;
    if (newIndex < 0) return placeholderImages.length + newIndex;
    if (newIndex >= placeholderImages.length) return newIndex - placeholderImages.length;
    return newIndex;
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-16">
      <div className="relative h-[400px] flex items-center justify-center">
        {/* Previous slide */}
        <div className="absolute left-0 w-[35%] h-[80%] opacity-60 transform scale-90 -translate-x-8 z-10">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
            <Image
              src={placeholderImages[getSlideIndex(-1)].src}
              alt={placeholderImages[getSlideIndex(-1)].alt}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        </div>

        {/* Current slide - centered and larger */}
        <div className="relative w-[60%] h-full z-20">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
            <Image
              src={placeholderImages[currentIndex].src}
              alt={placeholderImages[currentIndex].alt}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h3 className="text-xl font-semibold mb-1">{placeholderImages[currentIndex].title}</h3>
              <p className="text-sm opacity-90">{placeholderImages[currentIndex].description}</p>
            </div>
          </div>
        </div>

        {/* Next slide */}
        <div className="absolute right-0 w-[35%] h-[80%] opacity-60 transform scale-90 translate-x-8 z-10">
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
            <Image
              src={placeholderImages[getSlideIndex(1)].src}
              alt={placeholderImages[getSlideIndex(1)].alt}
              fill
              className="object-cover"
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