'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

// Blog article data
const blogArticles = [
  {
    id: 1,
    title: "5 Inventory Management Challenges Small Businesses Face Today",
    excerpt: "Managing inventory efficiently is a critical challenge for small businesses. Learn about the top 5 inventory challenges and practical solutions to overcome them.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Inventory",
    date: "March 20, 2025",
    readTime: "7 min read",
    featured: true,
  },
  {
    id: 2,
    title: "How Mobile Money is Transforming Business in Emerging Markets",
    excerpt: "Mobile money platforms are revolutionizing how small businesses operate in emerging markets. Discover how this technology is driving financial inclusion and business growth.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Fintech",
    date: "March 15, 2025",
    readTime: "5 min read",
    featured: true,
  },
  {
    id: 3,
    title: "The Benefits of Cloud-Based POS Systems for Retail Businesses",
    excerpt: "Cloud-based POS systems offer significant advantages over traditional systems. Learn how these solutions can streamline operations and boost your bottom line.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Technology",
    date: "March 10, 2025",
    readTime: "6 min read",
    featured: false,
  },
  {
    id: 4,
    title: "Effective Cash Flow Management Strategies for Small Businesses",
    excerpt: "Cash flow management is crucial for small business survival. Discover practical strategies to optimize your cash flow and ensure financial stability.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Finance",
    date: "March 5, 2025",
    readTime: "8 min read",
    featured: false,
  },
  {
    id: 5,
    title: "How to Choose the Right Inventory Management Software",
    excerpt: "Selecting the right inventory management software can be overwhelming. This guide helps you evaluate options based on your business needs and budget.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Inventory",
    date: "February 28, 2025",
    readTime: "9 min read",
    featured: false,
  },
  {
    id: 6,
    title: "Understanding Supply Chain Disruptions and Building Resilience",
    excerpt: "Supply chain disruptions can severely impact small businesses. Learn how to identify potential risks and build a more resilient supply chain.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Supply Chain",
    date: "February 22, 2025",
    readTime: "7 min read",
    featured: false,
  }
];

export default function Blog() {
  const router = useRouter();
  const primaryColor = '#0a3d62'; // Navy blue to match About page
  const hoverColor = '#3c6382'; // Lighter navy blue for hover

  const featuredArticles = blogArticles.filter(article => article.featured);
  const regularArticles = blogArticles.filter(article => !article.featured);

  return (
    <div className="w-full text-gray-800 bg-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Home Button */}
        <div className="mb-8 flex justify-start">
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-[#0a3d62] text-white rounded-full font-semibold shadow-lg hover:bg-[#3c6382] transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            Back to Home
          </a>
        </div>

        {/* Blog Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-[#0a3d62] font-poppins">
            Dott Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-inter">
            Insights, tips, and strategies to help small businesses thrive in today's digital economy
          </p>
        </div>

        {/* Featured Articles */}
        <div className="mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-[#0a3d62] font-poppins relative inline-block after:content-[''] after:absolute after:left-0 after:bottom-[-8px] after:w-[60px] after:h-[3px] after:rounded-md after:bg-blue-600">
            Featured Articles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredArticles.map((article) => (
              <div 
                key={article.id}
                className="h-full flex flex-col rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 bg-white"
              >
                <div className="h-60 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow p-6">
                  <div className="flex items-center mb-4 space-x-2">
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-[#0a3d62] rounded-md">
                      {article.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      {article.date} • {article.readTime}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-poppins leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mb-4 font-inter text-sm leading-relaxed">
                    {article.excerpt}
                  </p>
                  <button className="text-[#0a3d62] font-semibold hover:bg-[#0a3d62]/10 px-3 py-1 rounded-md transition-colors">
                    Read More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="mb-12" />

        {/* Recent Articles */}
        <div className="mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-[#0a3d62] font-poppins relative inline-block after:content-[''] after:absolute after:left-0 after:bottom-[-8px] after:w-[60px] after:h-[3px] after:rounded-md after:bg-blue-600">
            Recent Articles
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {regularArticles.map((article) => (
              <div 
                key={article.id}
                className="h-full flex flex-col rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow p-5">
                  <div className="flex items-center mb-3 space-x-2">
                    <span className="px-2 py-0.5 text-xs font-semibold text-[#0a3d62] bg-[#0a3d62]/10 rounded-md">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {article.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 font-poppins leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mb-3 font-inter text-sm leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                  <button className="text-[#0a3d62] font-semibold hover:underline text-sm pl-0">
                    Read More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscribe Banner */}
        <div 
          className="p-10 rounded-2xl text-center text-white mt-12 shadow-xl"
          style={{background: `linear-gradient(135deg, #0a3d62 0%, #3c6382 100%)`}}
        >
          <h3 className="text-2xl font-bold mb-4 font-poppins">
            Subscribe to Our Newsletter
          </h3>
          <p className="mb-6 font-inter max-w-2xl mx-auto opacity-90">
            Get the latest insights, tips, and resources delivered directly to your inbox.
          </p>
          <button
            className="bg-white text-[#0a3d62] font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-colors"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}