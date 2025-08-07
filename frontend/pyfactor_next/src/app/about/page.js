'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
// Temporary: Remove i18n imports to fix React error #130
// import { useTranslation } from 'react-i18next';
// import { I18nextProvider } from 'react-i18next';
// import i18nInstance from '@/i18n';
import { 
  ArrowLeft, 
  Target,
  Lightning,
  Globe,
  Shield,
  ChartBar,
  Rocket,
  CurrencyCircleDollar,
  DeviceMobile,
  Lock,
  Timer,
  HeartHandshake,
  Sparkle
} from '@phosphor-icons/react';

function AboutUsContent() {
  // Temporary: Remove i18n to fix React error #130
  // const { t } = useTranslation();

  const problems = [
    {
      title: 'Expensive enterprise software they can\'t afford',
      icon: <CurrencyCircleDollar size={24} weight="duotone" className="text-red-500" />
    },
    {
      title: 'Juggling 10+ different tools that don\'t talk to each other',
      icon: <ChartBar size={24} weight="duotone" className="text-orange-500" />
    },
    {
      title: 'Outdated systems that weren\'t built for today\'s mobile, global world',
      icon: <DeviceMobile size={24} weight="duotone" className="text-yellow-600" />
    }
  ];

  const approach = [
    {
      title: 'Built from the ground up for mobile-first businesses',
      icon: <DeviceMobile size={20} weight="bold" className="text-blue-600" />
    },
    {
      title: 'Designed for global operations from day one',
      icon: <Globe size={20} weight="bold" className="text-purple-600" />
    },
    {
      title: 'Focused on what actually matters: helping you make money',
      icon: <CurrencyCircleDollar size={20} weight="bold" className="text-green-600" />
    }
  ];

  const differentiators = [
    {
      emoji: '🌍',
      title: 'Truly Global',
      points: [
        '249 countries supported (not just 20 like competitors)',
        'Automatic tax compliance worldwide',
        'Local payment methods (M-Pesa, UPI, bank transfers)',
        '30+ languages at launch'
      ]
    },
    {
      emoji: '💰',
      title: 'Revenue-Focused',
      points: [
        'Not just tracking money - helping you make it',
        'Built-in payment processing',
        'Integrated tax filing',
        'Smart insights that drive growth'
      ]
    },
    {
      emoji: '🚀',
      title: 'Lightning Fast',
      points: [
        'No committees. No bureaucracy.',
        'We ship updates weekly, not yearly',
        'Direct feedback line to development',
        'Your feature request could be live next week'
      ]
    },
    {
      emoji: '🔒',
      title: 'Uncompromising Security',
      points: [
        'Bank-grade encryption',
        'Stripe-secured payment data',
        'SOC 2 compliance in progress',
        'Your data never sold or shared'
      ]
    }
  ];

  const beliefs = [
    'Small businesses deserve enterprise-grade tools',
    'Complexity is the enemy of growth',
    'Technology should empower, not overwhelm',
    'Success should be affordable for everyone'
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
              <span className="font-medium leading-relaxed">Back to Home</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
              The Future of Business Management is 
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Here
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 leading-relaxed font-medium">
              We're revolutionizing how small businesses operate globally with one unified platform that replaces dozens of expensive tools.
            </p>
          </div>
        </div>
      </section>

      {/* Why Dott Exists */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">
              Why Dott Exists
            </h2>
            <p className="text-lg text-gray-700 mb-10">
              Small businesses power the global economy, yet they're forced to choose between:
            </p>
            <div className="space-y-4 mb-12">
              {problems.map((problem, index) => (
                <div key={index} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  {problem.icon}
                  <p className="text-gray-800 font-medium">{problem.title}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 text-center">
              <p className="text-2xl font-bold">
                We refused to accept this reality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built Different */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">
              Built Different, By Design
            </h2>
            <p className="text-lg text-gray-700 mb-10">
              Dott isn't another VC-backed startup burning cash on features nobody uses. We're a bootstrapped company obsessed with solving real problems for real businesses.
            </p>
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="font-bold text-gray-900 mb-6">Our approach:</h3>
              <div className="space-y-4">
                {approach.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1">{item.icon}</div>
                    <p className="text-gray-800 font-medium">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Dott Difference */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-black text-center text-gray-900 mb-16">
            The Dott Difference
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {differentiators.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {item.points.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex items-start gap-2">
                        <Sparkle size={16} weight="fill" className="text-indigo-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Promise */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">
            Our Promise
          </h2>
          <p className="text-lg text-gray-700 mb-10">
            While big companies debate features in boardrooms, we're shipping solutions. While they focus on their stock price, we focus on your success.
          </p>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
            <h3 className="font-bold text-gray-900 mb-6">We believe:</h3>
            <div className="space-y-3">
              {beliefs.map((belief, index) => (
                <div key={index} className="flex items-center gap-3">
                  <HeartHandshake size={20} weight="duotone" className="text-indigo-600" />
                  <p className="text-gray-800 font-medium">{belief}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Mission */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">
            The Mission
          </h2>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-10">
            <p className="text-2xl md:text-3xl font-bold mb-6">
              Empower 1 million businesses to thrive by 2030.
            </p>
            <p className="text-lg opacity-90">
              Not with fancy promises. With software that actually works, support that actually helps, and pricing that actually makes sense.
            </p>
          </div>
        </div>
      </section>

      {/* Join the Revolution */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">
            Join the Revolution
          </h2>
          <p className="text-lg text-gray-700 mb-10">
            Every mega-corporation started as a small business. We're here to make sure yours has every advantage they did - and more.
          </p>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-10">
            <p className="text-2xl md:text-3xl font-bold mb-4">
              Start your journey with Dott.
            </p>
            <p className="text-xl opacity-90">
              Where small businesses think big.
            </p>
          </div>
          <div className="mt-12">
            <Link 
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <Rocket size={24} weight="bold" />
              Get Started Today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-20"></div>
    </div>
  );
}

export default function AboutUs() {
  // Temporary: Remove i18n wrapper to fix React error #130
  return <AboutUsContent />;
}