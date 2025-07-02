'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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

export default function AboutUs() {
  const [statsVisible, setStatsVisible] = React.useState(false);
  const statsRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, []);

  const AnimatedCounter = ({ end, suffix = '', duration = 2000 }) => {
    const [count, setCount] = React.useState(0);
    
    React.useEffect(() => {
      if (!statsVisible) return;
      
      let startTime;
      let animationFrame;
      
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / duration;
        
        if (progress < 1) {
          setCount(Math.floor(end * progress));
          animationFrame = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, [statsVisible, end, duration]);
    
    return <span>{count}{suffix}</span>;
  };

  const timeline = [
    {
      year: '2022',
      title: 'The Beginning',
      description: 'Identified the need for unified business management tools for SMBs',
      icon: <Lightbulb size={24} weight="duotone" />
    },
    {
      year: '2023',
      title: 'Product Launch',
      description: 'Launched core platform with financial and inventory management',
      icon: <Rocket size={24} weight="duotone" />
    },
    {
      year: '2024',
      title: 'Global Expansion',
      description: 'Extended to 25+ countries with localized features',
      icon: <Globe size={24} weight="duotone" />
    },
    {
      year: '2025',
      title: 'AI Integration',
      description: 'Introducing intelligent insights and automation',
      icon: <ChartBar size={24} weight="duotone" />
    }
  ];

  const values = [
    {
      title: 'Simplicity First',
      description: 'Complex business operations made simple through intuitive design',
      icon: <Heart size={32} weight="duotone" className="text-blue-600" />
    },
    {
      title: 'Continuous Innovation',
      description: 'Evolving with the changing needs of modern businesses',
      icon: <Lightbulb size={32} weight="duotone" className="text-purple-600" />
    },
    {
      title: 'Customer Success',
      description: 'Your growth is our success - we win when you win',
      icon: <Target size={32} weight="duotone" className="text-green-600" />
    },
    {
      title: 'Global Empowerment',
      description: 'Breaking barriers for businesses worldwide',
      icon: <HandHeart size={32} weight="duotone" className="text-orange-600" />
    }
  ];

  const differentiators = [
    {
      title: 'Unified Platform',
      description: 'All your business tools in one place',
      icon: <Package size={24} weight="duotone" />
    },
    {
      title: 'Global, Yet Local',
      description: 'International standards with local compliance',
      icon: <Globe size={24} weight="duotone" />
    },
    {
      title: 'Enterprise Security',
      description: 'Bank-level protection for your data',
      icon: <Shield size={24} weight="duotone" />
    },
    {
      title: 'Smart Insights',
      description: 'AI-powered analytics for better decisions',
      icon: <ChartBar size={24} weight="duotone" />
    }
  ];

  const stats = [
    { value: 15000, suffix: '+', label: 'Active Businesses' },
    { value: 32, suffix: '', label: 'Countries' },
    { value: 120, suffix: 'M', label: 'Monthly Volume' },
    { value: 98, suffix: '%', label: 'Customer Satisfaction' }
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
              <span className="font-medium">Back to Home</span>
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
              Empowering businesses to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                thrive globally
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              We're building the operating system for modern small businesses, 
              making enterprise-grade tools accessible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-20 -mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {statsVisible ? (
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    ) : (
                      `0${stat.suffix}`
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Dott was born from a simple observation: small businesses were drowning 
                  in complexity. Multiple tools, disconnected data, and processes designed 
                  for enterprises were holding back entrepreneurs worldwide.
                </p>
                <p>
                  Founded in 2023, we set out to build something different. A platform that 
                  understands the unique challenges of small businesses, especially in emerging 
                  markets where traditional solutions fall short.
                </p>
                <p>
                  Today, we're proud to serve over 15,000 businesses across 32 countries, 
                  processing over $120 million in transactions monthly. But we're just getting started.
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
                <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                To democratize business management by providing small businesses with 
                powerful, affordable tools that simplify operations and enable growth, 
                regardless of location or technical expertise.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <Eye size={32} weight="duotone" className="text-purple-600" />
                <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                A world where every small business has access to the same quality of 
                management tools as Fortune 500 companies, empowering one million 
                businesses to thrive by 2030.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Our Journey
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
            Our Values
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            The principles that guide every decision we make
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
            What Makes Dott Different
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

      {/* Social Impact */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 md:p-12">
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Making a Difference
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Beyond software, we're committed to fostering entrepreneurship globally. 
                Through workshops, educational content, and partnerships with organizations 
                supporting underserved communities, we're building an ecosystem where every 
                business can succeed.
              </p>
              <div className="bg-white/70 backdrop-blur rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Dott Grants Program</h3>
                <p className="text-gray-700">
                  We provide free platform access to non-profits and social enterprises. 
                  To date, we've supported over 200 organizations worldwide, amplifying 
                  their impact through technology.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-20"></div>
    </div>
  );
}