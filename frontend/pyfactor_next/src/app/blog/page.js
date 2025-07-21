'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';

function BlogPageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: t('blog.categories.all', 'All Articles'), count: 6 },
    { id: 'accounting', name: t('blog.categories.accounting', 'Accounting & Taxes'), count: 3 },
    { id: 'business', name: t('blog.categories.business', 'Business'), count: 3 }
  ];

  const articles = [
    // Accounting & Taxes Articles
    {
      id: 'profit-loss-basics',
      title: t('blog.articles.profitLoss.title', 'Understanding Profit & Loss: A Fun Guide for Business Owners'),
      excerpt: t('blog.articles.profitLoss.excerpt', 'Discover how to read and understand your P&L statement without falling asleep. We promise to make it interesting!'),
      category: 'accounting',
      author: 'Sarah Chen',
      date: 'January 15, 2025',
      readTime: t('blog.readTime', '{{minutes}} min read', { minutes: 8 }),
      image: '/images/blog/profit-loss.jpg',
      slug: 'understanding-profit-loss-basics'
    },
    {
      id: 'business-expenses-tracking',
      title: t('blog.articles.expenses.title', 'Track Business Expenses Like a Pro: 5 Simple Steps'),
      excerpt: t('blog.articles.expenses.excerpt', 'Learn how to track every penny without losing your mind. Plus, discover which expenses can save you money at tax time!'),
      category: 'accounting',
      author: 'Michael Roberts',
      date: 'January 12, 2025',
      readTime: t('blog.readTime', '{{minutes}} min read', { minutes: 6 }),
      image: '/images/blog/expense-tracking.jpg',
      slug: 'track-business-expenses-like-pro'
    },
    {
      id: 'tax-deductions',
      title: t('blog.articles.taxDeductions.title', 'Hidden Tax Deductions Every Small Business Should Know'),
      excerpt: t('blog.articles.taxDeductions.excerpt', 'Stop leaving money on the table! Discover legitimate tax deductions that most business owners miss.'),
      category: 'accounting',
      author: 'Jennifer Liu',
      date: 'January 10, 2025',
      readTime: t('blog.readTime', '{{minutes}} min read', { minutes: 10 }),
      image: '/images/blog/tax-deductions.jpg',
      slug: 'hidden-tax-deductions-small-business'
    },
    // Business Articles
    {
      id: 'inventory-scanner',
      title: t('blog.articles.inventory.title', 'Transform Your Inventory Management with Barcode Scanning'),
      excerpt: t('blog.articles.inventory.excerpt', 'Say goodbye to manual counting! Learn how barcode scanning can revolutionize your inventory management.'),
      category: 'business',
      author: 'David Kim',
      date: 'January 14, 2025',
      readTime: t('blog.readTime', '{{minutes}} min read', { minutes: 7 }),
      image: '/images/blog/barcode-scanning.jpg',
      slug: 'transform-inventory-management-barcode-scanning'
    },
    {
      id: 'mobile-business',
      title: t('blog.articles.mobile.title', 'Run Your Entire Business from Your Phone: The Mobile Revolution'),
      excerpt: t('blog.articles.mobile.excerpt', 'Discover how to manage invoices, track inventory, and handle payments - all from your smartphone!'),
      category: 'business',
      author: 'Emma Thompson',
      date: 'January 11, 2025',
      readTime: t('blog.readTime', '{{minutes}} min read', { minutes: 9 }),
      image: '/images/blog/mobile-business.jpg',
      slug: 'run-business-from-phone-mobile-revolution'
    },
    {
      id: 'customer-relationships',
      title: t('blog.articles.customerRelationships.title', 'Building Customer Relationships That Last: CRM Made Simple'),
      excerpt: t('blog.articles.customerRelationships.excerpt', 'Learn how to keep customers coming back without complicated software or expensive tools.'),
      category: 'business',
      author: 'Carlos Rodriguez',
      date: 'January 8, 2025',
      readTime: t('blog.readTime', '{{minutes}} min read', { minutes: 5 }),
      image: '/images/blog/customer-relationships.jpg',
      slug: 'building-customer-relationships-crm-simple'
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = articles[0]; // Latest article as featured

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t('blog.hero.title', 'Dott Business Blog')}</h1>
          <p className="text-xl opacity-90 max-w-2xl">
            {t('blog.hero.subtitle', 'Learn about managing your business finances with Dott. Get tips, insights, and strategies to grow your business.')}
          </p>
          
          {/* Newsletter Signup */}
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-md">
            <p className="text-sm font-medium mb-3">
              {t('blog.newsletter.title', 'Sign up for our newsletter for product updates and new blog posts!')}
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder={t('blog.newsletter.placeholder', 'Your email address')}
                className="flex-1 px-4 py-2 rounded-md text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-white text-blue-600 font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                {t('blog.newsletter.button', 'Subscribe')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Search and Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder={t('blog.search.placeholder', 'Search articles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Featured Article */}
      {selectedCategory === 'all' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <div className="h-64 md:h-full bg-gray-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 p-8">
                <div className="uppercase tracking-wide text-sm text-blue-600 font-semibold">{t('blog.featured', 'Featured')}</div>
                <h2 className="mt-2 text-2xl font-bold text-gray-900 hover:text-blue-600 cursor-pointer"
                    onClick={() => router.push(`/blog/${featuredArticle.slug}`)}>
                  {featuredArticle.title}
                </h2>
                <p className="mt-4 text-gray-600">{featuredArticle.excerpt}</p>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{featuredArticle.author}</p>
                    <div className="flex space-x-1 text-sm text-gray-500">
                      <time>{featuredArticle.date}</time>
                      <span aria-hidden="true">&middot;</span>
                      <span>{featuredArticle.readTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map(article => (
            <article
              key={article.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/blog/${article.slug}`)}
            >
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-2">
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    {categories.find(cat => cat.id === article.category)?.name}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
                  {article.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-300 mr-2"></div>
                    <div className="text-sm">
                      <p className="text-gray-900 font-medium">{article.author}</p>
                      <p className="text-gray-500">{article.date}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{article.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('blog.noArticles', 'No articles found matching your criteria.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogPage() {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <BlogPageContent />
    </I18nextProvider>
  );
}