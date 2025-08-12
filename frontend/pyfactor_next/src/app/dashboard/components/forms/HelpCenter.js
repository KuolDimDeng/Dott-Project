'use client';

import React, { useState } from 'react';
import { 
  QuestionMarkCircleIcon, 
  BookOpenIcon, 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const HelpCenter = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    { id: 'all', name: 'All Topics', icon: BookOpenIcon },
    { id: 'getting-started', name: 'Getting Started', icon: AcademicCapIcon },
    { id: 'billing', name: 'Billing & Subscriptions', icon: DocumentTextIcon },
    { id: 'features', name: 'Features & Tools', icon: QuestionMarkCircleIcon },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: ChatBubbleLeftRightIcon },
  ];

  const helpArticles = [
    {
      id: 1,
      category: 'getting-started',
      title: 'Welcome to Dott',
      description: 'Learn the basics of using Dott for your business',
      readTime: '5 min read',
    },
    {
      id: 2,
      category: 'getting-started',
      title: 'Setting Up Your Business Profile',
      description: 'Complete your business information and preferences',
      readTime: '3 min read',
    },
    {
      id: 3,
      category: 'billing',
      title: 'Understanding Your Subscription',
      description: 'Learn about pricing plans and billing cycles',
      readTime: '4 min read',
    },
    {
      id: 4,
      category: 'features',
      title: 'Creating and Managing Invoices',
      description: 'Step-by-step guide to invoice management',
      readTime: '6 min read',
    },
    {
      id: 5,
      category: 'features',
      title: 'Using the POS System',
      description: 'Process sales quickly with our point of sale',
      readTime: '7 min read',
    },
    {
      id: 6,
      category: 'troubleshooting',
      title: 'Common Login Issues',
      description: 'Solutions for authentication problems',
      readTime: '3 min read',
    },
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const contactMethods = [
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: 'Start Chat',
      available: true,
    },
    {
      icon: EnvelopeIcon,
      title: 'Email Support',
      description: 'support@dottapps.com',
      action: 'Send Email',
      available: true,
    },
    {
      icon: PhoneIcon,
      title: 'Phone Support',
      description: 'Available Mon-Fri, 9AM-5PM EST',
      action: 'Call Now',
      available: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-gray-600">Find answers and get support for all your questions</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <input
            type="text"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <QuestionMarkCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
            <nav className="space-y-2">
              {helpCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <category.icon className="h-5 w-5 mr-3" />
                  {category.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="space-y-3">
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-700">
                <VideoCameraIcon className="h-5 w-5 mr-2" />
                Video Tutorials
              </a>
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-700">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Documentation
              </a>
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-700">
                <AcademicCapIcon className="h-5 w-5 mr-2" />
                Webinars
              </a>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedCategory === 'all' 
                  ? 'All Help Articles' 
                  : helpCategories.find(c => c.id === selectedCategory)?.name}
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredArticles.length === 0 ? (
                <div className="p-8 text-center">
                  <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No articles found</p>
                </div>
              ) : (
                filteredArticles.map(article => (
                  <button
                    key={article.id}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{article.description}</p>
                    <p className="text-sm text-gray-500">{article.readTime}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Need More Help?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contactMethods.map((method, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6 text-center">
                  <method.icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-1">{method.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                  <button
                    disabled={!method.available}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      method.available
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {method.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;