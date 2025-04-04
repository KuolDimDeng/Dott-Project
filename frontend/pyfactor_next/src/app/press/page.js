'use client';

import * as React from 'react';
import Link from 'next/link';

export default function Press() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-8 md:py-12 bg-gray-50 text-gray-900">
      <div className="container max-w-3xl px-4 mx-auto">
        {/* Home Button */}
        <div className="mb-6 flex justify-start">
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-[#0a3d62] hover:bg-[#3c6382] text-white rounded-full font-['Inter',sans-serif] font-semibold shadow-lg shadow-blue-900/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Under Development Message */}
        <div className="p-6 md:p-8 rounded-2xl text-center bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-xl">
          <div className="mb-6 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-[#0a3d62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3 text-[#0a3d62] font-['Poppins',sans-serif]">
            Press Page Under Development
          </h1>
          
          <h2 className="text-lg md:text-xl text-gray-600 font-['Inter',sans-serif] mb-4 max-w-[600px] mx-auto">
            Our press and media resources section is coming soon!
          </h2>
          
          <p className="text-gray-600 font-['Inter',sans-serif] text-base md:text-lg leading-relaxed max-w-[700px] mx-auto">
            We're currently developing a comprehensive press center with media resources, company news, and press releases. Check back soon for the latest updates on Dott's mission to empower small businesses.
          </p>
        </div>
      </div>
    </div>
  );
}