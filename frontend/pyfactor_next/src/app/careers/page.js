'use client';


import * as React from 'react';
import Link from 'next/link';

export default function Careers() {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3 text-[#0a3d62] font-['Poppins',sans-serif]">
            Careers Page Under Development
          </h1>
          
          <h2 className="text-lg md:text-xl text-gray-600 font-['Inter',sans-serif] mb-4 max-w-[600px] mx-auto">
            We're building something exciting! Our careers page is currently under construction.
          </h2>
          
          <p className="text-gray-600 font-['Inter',sans-serif] text-base md:text-lg leading-relaxed max-w-[700px] mx-auto">
            Please check back soon to explore career opportunities at Dott. We're always looking for talented individuals to join our team and help us empower small businesses worldwide.
          </p>
        </div>
      </div>
    </div>
  );
}