'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Define keyframes animation styles
const progressAnimationKeyframes = `
  @keyframes progressAnimation {
    0% {
      transform: translateX(-70%);
    }
    100% {
      transform: translateX(0%);
    }
  }
`;

export default function AboutUs() {
  const router = useRouter();

  // Add global styles for keyframes animation
  React.useEffect(() => {
    // Add style element for keyframes
    const styleElement = document.createElement('style');
    styleElement.innerHTML = progressAnimationKeyframes;
    document.head.appendChild(styleElement);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const primaryColor = '#0a3d62'; // Navy blue
  const secondaryColor = '#ff9800'; // Orange accent for emphasis
  const accentGreen = '#4caf50'; // Green for innovative features

  // Company journey milestones
  const milestones = [
    {
      year: '2022',
      title: 'The Idea',
      description: 'Dott was conceived from the founders\' experiences with small businesses struggling to manage operations efficiently.',
      color: primaryColor
    },
    {
      year: '2023',
      title: 'Launch',
      description: 'Official launch of Dott platform, offering core financial and inventory management features.',
      color: secondaryColor
    },
    {
      year: '2024',
      title: 'Global Expansion',
      description: 'Expanded internationally with multi-currency support and localized tax compliance for 25+ countries.',
      color: accentGreen
    },
    {
      year: '2025',
      title: 'The Future',
      description: 'Roadmap includes AI-powered forecasting, expanded payment options, and deeper integration with e-commerce platforms.',
      color: '#673ab7' // Purple for future vision
    },
  ];

  // Team members
  const teamMembers = [
    {
      name: 'Sarah Johnson',
      title: 'CEO & Co-Founder',
      bio: 'Previously led product at Shopify, Sarah brings 15+ years of fintech and small business experience.',
      image: '/static/images/team/placeholder.png' 
    },
    {
      name: 'Michael Chen',
      title: 'CTO & Co-Founder',
      bio: 'Former engineering leader at Square, Michael oversees our technical architecture and security infrastructure.',
      image: '/static/images/team/placeholder.png'
    },
    {
      name: 'Priya Patel',
      title: 'Chief Product Officer',
      bio: 'With expertise in UX design and user research, Priya ensures our platform remains intuitive and effective.',
      image: '/static/images/team/placeholder.png'
    },
  ];

  // Core values with icons
  const values = [
    {
      title: "Simplicity",
      description: "We design our platform with intuitive interfaces that make complex business operations straightforward and accessible to everyone, regardless of technical expertise.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={primaryColor} className="w-9 h-9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      )
    },
    {
      title: "Innovation",
      description: "We continuously evolve our platform with cutting-edge features that anticipate the changing needs of small businesses in an increasingly digital economy.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={secondaryColor} className="w-9 h-9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      )
    },
    {
      title: "Empowerment",
      description: "We believe in giving small business owners the same caliber of tools that larger enterprises enjoy, leveling the playing field and enabling growth on their terms.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={accentGreen} className="w-9 h-9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
        </svg>
      )
    },
    {
      title: "Customer Focus",
      description: "Every feature we develop, every support interaction we have, and every business decision we make is guided by what will best serve our customers' success.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#e91e63" className="w-9 h-9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      )
    }
  ];

  // Features that make us different
  const features = [
    {
      title: "All-in-One Platform",
      description: "Dott integrates accounting, invoicing, inventory, HR, and payment processing in one unified platform, eliminating the need for multiple subscriptions and fragmented data.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
        </svg>
      )
    },
    {
      title: "Global & Local",
      description: "Our platform works with local payment methods, tax regulations, and business practices while maintaining global standards of security and functionality.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      )
    },
    {
      title: "Enterprise Security",
      description: "Bank-level encryption, compliance with international data protection standards, and regular security audits keep your business data safe.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      )
    },
    {
      title: "Data-Driven Insights",
      description: "Turn your financial data into actionable insights with visual reports and dashboards that help you make informed business decisions.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      )
    }
  ];

  return (
    <div id="about" className="w-full text-gray-800 bg-gray-50">
      {/* Hero Section with Gradient Background */}
      <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-blue-200/20 to-transparent top-[-50px] right-[-100px]"></div>
        <div className="absolute w-52 h-52 rounded-full bg-gradient-to-r from-orange-200/20 to-transparent bottom-[50px] left-[-50px]"></div>
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          {/* Home Button */}
          <div className="mb-12 flex justify-start">
            <a
              href="/"
              className="inline-flex items-center px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-full font-semibold shadow-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Back to Home
            </a>
          </div>
        
          {/* Title and Mission Statement */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <span className="text-blue-900 tracking-wider font-semibold text-base uppercase">
                OUR STORY
              </span>
              <h1 className="text-4xl md:text-[clamp(3rem,6vw,4rem)] font-extrabold mt-2 mb-6 bg-gradient-to-r from-blue-900 to-orange-500 bg-clip-text text-transparent leading-tight font-['Poppins',sans-serif] tracking-tight">
                Empowering Small Businesses Worldwide
              </h1>
              <p className="text-xl md:text-2xl font-medium text-gray-700 max-w-xl leading-relaxed">
                We build technology that helps small businesses thrive in a digital world.
              </p>
            </div>
            <div className="md:col-span-5 flex justify-center">
              <div className="relative">
                <div className="absolute w-full h-full rounded-[30%_70%_70%_30%/30%_30%_70%_70%] bg-gradient-to-br from-blue-900/20 to-orange-500/20 top-[10%] left-[10%] -z-10"></div>
                <Image
                  src="/static/images/Team-Building-4--Streamline-Brooklyn.png"
                  alt="Dott Team Illustration"
                  width={550}
                  height={400}
                  className="max-w-full h-auto rounded-xl shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4">
        {/* Company Overview */}
        <div className="py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-8 font-['Poppins',sans-serif] relative after:content-[''] after:absolute after:left-0 after:bottom-[-10px] after:w-20 after:h-1 after:bg-orange-500 after:rounded-full">
                Who We Are
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6 font-['Inter',sans-serif]">
                Founded in 2023, Dott is a comprehensive business management platform designed specifically for small businesses, freelancers, consultants, and micro-enterprises. We combine financial management, HR tools, inventory tracking, and integrated payment solutions into one seamless platform.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-6 font-['Inter',sans-serif]">
                What sets Dott apart is our deep understanding of the unique challenges faced by small businesses, especially in emerging markets. Our platform adapts to local business environments while maintaining global best practices in financial management and security.
              </p>
              <div className="mt-10 p-6 rounded-lg border border-gray-200 bg-white shadow-md">
                <h3 className="text-xl font-semibold text-orange-500 mb-4 font-['Poppins',sans-serif]">
                  Our Impact
                </h3>
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-900">15K+</p>
                    <p className="text-sm text-gray-600">Active Businesses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-900">32</p>
                    <p className="text-sm text-gray-600">Countries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-900">$120M</p>
                    <p className="text-sm text-gray-600">Processed Monthly</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              {/* Mission Card */}
              <div className="relative bg-white rounded-2xl shadow-lg p-8 transform transition-all hover:-translate-y-2 hover:shadow-xl">
                <div className="absolute top-4 right-4 bg-blue-900 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-4 font-['Poppins',sans-serif]">
                  Our Mission
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4 font-['Inter',sans-serif]">
                  At Dott, our mission is to empower small businesses to thrive by providing them with affordable, accessible, and powerful management tools that simplify day-to-day operations. We believe that when the administrative burden is reduced, creativity and growth can flourish.
                </p>
                <p className="text-gray-700 leading-relaxed font-['Inter',sans-serif]">
                  We're committed to breaking down technological barriers and making sophisticated business management accessible to entrepreneurs regardless of their technical background or location.
                </p>
              </div>

              {/* Vision Card */}
              <div className="relative bg-white rounded-2xl shadow-lg p-8 transform transition-all hover:-translate-y-2 hover:shadow-xl">
                <div className="absolute top-4 right-4 bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-orange-500 mb-4 font-['Poppins',sans-serif]">
                  Our Vision
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4 font-['Inter',sans-serif]">
                  We envision a world where small businesses have access to the same quality of management tools as large corporations, but tailored to their specific needs and scale. Our goal is to become the essential operating system for small businesses worldwide.
                </p>
                <p className="text-gray-700 leading-relaxed font-['Inter',sans-serif]">
                  By 2030, we aim to help one million small businesses improve their operational efficiency, financial health, and growth prospects through our integrated platform that evolves with their needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Journey Section */}
        <div className="py-16 md:py-24 bg-gray-100 rounded-2xl -mx-4 px-4 md:px-8 shadow-inner">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 text-center mb-16 font-['Poppins',sans-serif] inline-block relative after:content-[''] after:absolute after:left-[30%] after:right-[30%] after:bottom-[-10px] after:h-1 after:bg-orange-500 after:rounded-full mx-auto">
            Our Journey
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md h-full relative overflow-hidden transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div 
                  className="h-1.5 w-full" 
                  style={{ backgroundColor: milestone.color }}
                ></div>
                <div className="p-6">
                  <h3 
                    className="text-2xl font-bold mb-2 font-['Poppins',sans-serif]"
                    style={{ color: milestone.color }}
                  >
                    {milestone.year}
                  </h3>
                  <h4 className="text-xl font-semibold mb-2 font-['Poppins',sans-serif]">
                    {milestone.title}
                  </h4>
                  <p className="text-gray-600">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Journey Line */}
          <div className="relative mt-12 mx-auto w-4/5 h-1 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-900 via-orange-500 to-green-500 animate-[progressAnimation_3s_ease-in-out_infinite_alternate]"
            ></div>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 text-center mb-4 font-['Poppins',sans-serif]">
            Our Core Values
          </h2>
          
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-16 leading-relaxed">
            These principles guide every decision we make and every feature we build
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl shadow-lg p-8 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 font-['Poppins',sans-serif]">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* What Makes Us Different */}
        <div className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-orange-50 rounded-2xl -mx-4 px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 text-center mb-16 font-['Poppins',sans-serif]">
            What Makes Dott Different
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex bg-white rounded-xl shadow-md p-6 items-start transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mr-4 p-3 rounded-xl text-white bg-gradient-to-r from-blue-900 to-orange-500 flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 font-['Poppins',sans-serif]">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Impact Section */}
        <div className="py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute w-[85%] h-[85%] rounded-[30%_70%_70%_30%/30%_30%_70%_70%] bg-gradient-to-br from-green-500/20 to-blue-900/20 bottom-[-5%] right-[-5%] -z-10"></div>
              <Image
                src="/static/images/Team-Building-4--Streamline-Brooklyn.png"
                alt="Social Impact Illustration"
                width={550}
                height={400}
                className="max-w-full h-auto rounded-xl shadow-2xl"
              />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-green-600 mb-8 font-['Poppins',sans-serif] relative after:content-[''] after:absolute after:left-0 after:bottom-[-10px] after:w-20 after:h-1 after:bg-blue-900 after:rounded-full">
                Our Social Impact
              </h2>
              
              <p className="text-lg text-gray-700 leading-relaxed mb-6 font-['Inter',sans-serif]">
                Beyond providing software, Dott is committed to making a positive impact on the small business ecosystem. We regularly conduct workshops, produce educational content, and partner with organizations that support entrepreneurship in underserved communities.
              </p>
              
              <p className="text-lg text-gray-700 leading-relaxed font-['Inter',sans-serif]">
                Through our Dott Grants program, we provide free access to our platform for non-profits and social enterprises making a difference in their communities. To date, we've supported over 200 organizations globally with technology that amplifies their impact.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-12 md:py-20 my-8 md:my-16 text-center bg-white rounded-2xl shadow-lg relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-[-100px] right-[-100px] w-52 h-52 rounded-full bg-blue-900/10"></div>
          <div className="absolute bottom-[-80px] left-[-80px] w-40 h-40 rounded-full bg-orange-500/10"></div>
          
          <div className="max-w-3xl mx-auto px-4 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-6 font-['Poppins',sans-serif]">
              Ready to Transform Your Business?
            </h2>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join thousands of businesses that use Dott to streamline operations, 
              reduce costs, and drive growth. Get started today!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a
                href="/#pricing"
                className="inline-flex px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white text-lg font-semibold rounded-full shadow-lg transition-colors"
              >
                Start Your Free Trial
              </a>
              
              <a
                href="/contact"
                className="inline-flex px-8 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-50 text-lg font-semibold rounded-full transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}