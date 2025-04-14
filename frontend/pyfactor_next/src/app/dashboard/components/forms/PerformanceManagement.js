'use client';

import React, { useState } from 'react';

/**
 * HR Performance Management Component
 * Handles employee performance reviews, goals, and feedback
 */
const PerformanceManagement = () => {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Performance Management</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-8">
          <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17l3 3 3-3m0 0v-11a2 2 0 00-2-2h-2a2 2 0 00-2 2v11zm0-12h4" />
          </svg>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Performance Evaluation System</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Setup and manage performance reviews, set goals, and provide feedback. <br />
            This feature will be available soon.
          </p>
          <button 
            className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            disabled
          >
            Coming Soon
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-3">Performance Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              360° Feedback Collection
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Goal Setting & OKRs
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Continuous Feedback System
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Performance Improvement Plans
            </li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-3">Review Cycle Management</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Schedule annual/quarterly reviews
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Customizable review templates
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Automated reminder notifications
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completion tracking dashboard
            </li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Performance Review Process</h2>
        <div className="flex flex-col md:flex-row justify-between">
          <div className="flex-1 md:pr-4 mb-4 md:mb-0">
            <div className="flex items-center mb-3">
              <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                <span className="text-blue-700 font-semibold">1</span>
              </div>
              <h3 className="font-medium">Goal Setting</h3>
            </div>
            <p className="text-sm text-gray-600 pl-11">
              Managers and employees collaborate to establish clear, measurable objectives aligned with company goals.
            </p>
          </div>
          <div className="flex-1 md:px-4 mb-4 md:mb-0">
            <div className="flex items-center mb-3">
              <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                <span className="text-blue-700 font-semibold">2</span>
              </div>
              <h3 className="font-medium">Mid-cycle Check-ins</h3>
            </div>
            <p className="text-sm text-gray-600 pl-11">
              Regular progress discussions to provide guidance, adjustments, and ongoing feedback.
            </p>
          </div>
          <div className="flex-1 md:pl-4">
            <div className="flex items-center mb-3">
              <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                <span className="text-blue-700 font-semibold">3</span>
              </div>
              <h3 className="font-medium">Final Evaluation</h3>
            </div>
            <p className="text-sm text-gray-600 pl-11">
              Comprehensive assessment of performance, achievements, and areas for development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceManagement; 