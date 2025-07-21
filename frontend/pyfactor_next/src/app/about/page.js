'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';
import { 
  ArrowLeft, 
  Target, 
  Eye, 
  Heart,
  Users,
  Globe,
  Shield,
  ChartBar,
  Package,
  Rocket,
  Lightbulb,
  HandHeart
} from '@phosphor-icons/react';

function AboutUsContent() {
  const { t } = useTranslation();

  const timeline = [
    {
      year: '2022',
      title: t('about.timeline.beginning.title', 'The Beginning'),
      description: t('about.timeline.beginning.description', 'Identified the need for unified business management tools for SMBs'),
      icon: <Lightbulb size={24} weight="duotone" />
    },
    {
      year: '2023',
      title: t('about.timeline.launch.title', 'Product Launch'),
      description: t('about.timeline.launch.description', 'Launched core platform with financial and inventory management'),
      icon: <Rocket size={24} weight="duotone" />
    },
    {
      year: '2024',
      title: t('about.timeline.expansion.title', 'Global Expansion'),
      description: t('about.timeline.expansion.description', 'Extended to 25+ countries with localized features'),
      icon: <Globe size={24} weight="duotone" />
    },
    {
      year: '2025',
      title: t('about.timeline.ai.title', 'AI Integration'),
      description: t('about.timeline.ai.description', 'Introducing intelligent insights and automation'),
      icon: <ChartBar size={24} weight="duotone" />
    }
  ];

  const values = [
    {
      title: t('about.values.simplicity.title', 'Simplicity First'),
      description: t('about.values.simplicity.description', 'Complex business operations made simple through intuitive design'),
      icon: <Heart size={32} weight="duotone" className="text-blue-600" />
    },
    {
      title: t('about.values.innovation.title', 'Continuous Innovation'),
      description: t('about.values.innovation.description', 'Evolving with the changing needs of modern businesses'),
      icon: <Lightbulb size={32} weight="duotone" className="text-purple-600" />
    },
    {
      title: t('about.values.success.title', 'Customer Success'),
      description: t('about.values.success.description', 'Your growth is our success - we win when you win'),
      icon: <Target size={32} weight="duotone" className="text-green-600" />
    },
    {
      title: t('about.values.empowerment.title', 'Global Empowerment'),
      description: t('about.values.empowerment.description', 'Breaking barriers for businesses worldwide'),
      icon: <HandHeart size={32} weight="duotone" className="text-orange-600" />
    }
  ];

  const differentiators = [
    {
      title: t('about.differentiators.unified.title', 'Unified Platform'),
      description: t('about.differentiators.unified.description', 'All your business tools in one place'),
      icon: <Package size={24} weight="duotone" />
    },
    {
      title: t('about.differentiators.global.title', 'Global, Yet Local'),
      description: t('about.differentiators.global.description', 'International standards with local compliance'),
      icon: <Globe size={24} weight="duotone" />
    },
    {
      title: t('about.differentiators.security.title', 'Enterprise Security'),
      description: t('about.differentiators.security.description', 'Bank-level protection for your data'),
      icon: <Shield size={24} weight="duotone" />
    },
    {
      title: t('about.differentiators.insights.title', 'Smart Insights'),
      description: t('about.differentiators.insights.description', 'AI-powered analytics for better decisions'),
      icon: <ChartBar size={24} weight="duotone" />
    }
  ];


  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} weight="bold" />
              <span className="font-medium leading-relaxed">{t('about.backToHome', 'Back to Home')}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('about.hero.title', 'Empowering businesses to')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {t('about.hero.subtitle', 'thrive globally')}
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              {t('about.hero.description', "We're building the operating system for modern small businesses, making enterprise-grade tools accessible to everyone.")}
            </p>
          </div>
        </div>
      </section>


      {/* Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t('about.story.title', 'Our Story')}
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  {t('about.story.paragraph1', 'Dott was born from a simple observation: small businesses were drowning in complexity. Multiple tools, disconnected data, and processes designed for enterprises were holding back entrepreneurs worldwide.')}
                </p>
                <p>
                  {t('about.story.paragraph2', 'Founded in 2023, we set out to build something different. A platform that understands the unique challenges of small businesses, especially in emerging markets where traditional solutions fall short.')}
                </p>
                <p>
                  {t('about.story.paragraph3', "Today, we're proud to serve businesses worldwide. But we're just getting started.")}
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square relative">
                <Image
                  src="/static/images/Team-Building-4--Streamline-Brooklyn.png"
                  alt="Dott team collaboration"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <Target size={32} weight="duotone" className="text-blue-600" />
                <h3 className="text-2xl font-bold text-gray-900">{t('about.mission.title', 'Our Mission')}</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {t('about.mission.description', 'To democratize business management by providing small businesses with powerful, affordable tools that simplify operations and enable growth, regardless of location or technical expertise.')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <Eye size={32} weight="duotone" className="text-purple-600" />
                <h3 className="text-2xl font-bold text-gray-900">{t('about.vision.title', 'Our Vision')}</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {t('about.vision.description', 'A world where every small business has access to the same quality of management tools as Fortune 500 companies, empowering one million businesses to thrive by 2030.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            {t('about.journey.title', 'Our Journey')}
          </h2>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gray-300"></div>
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className={`relative flex items-center ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}>
                  <div className="flex-1"></div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-blue-600 flex items-center justify-center z-10">
                    {item.icon}
                  </div>
                  <div className="flex-1 px-8">
                    <div className={`bg-white rounded-xl shadow-lg p-6 ${
                      index % 2 === 0 ? 'md:ml-8' : 'md:mr-8'
                    }`}>
                      <div className="text-sm font-semibold text-blue-600 mb-1">{item.year}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            {t('about.values.title', 'Our Values')}
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-2xl mx-auto leading-relaxed">
            {t('about.values.subtitle', 'The principles that guide every decision we make')}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">{value.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            {t('about.differentiators.title', 'What Makes Dott Different')}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {differentiators.map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <div className="text-blue-600">{item.icon}</div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer spacing */}
      <div className="h-20"></div>
    </div>
  );
}

export default function AboutUs() {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <AboutUsContent />
    </I18nextProvider>
  );
}