'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { 
  BriefcaseIcon, 
  ShoppingBagIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function RoleSelectionPage() {
  const router = useRouter();
  const { session } = useSession();
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    {
      id: 'business',
      title: 'I run a business',
      description: 'Manage inventory, receive orders, track sales, and grow your business',
      icon: BriefcaseIcon,
      color: 'blue',
      features: [
        'Product & inventory management',
        'Order & payment processing',
        'Customer management',
        'Sales analytics & reports',
        'Chat with customers'
      ]
    },
    {
      id: 'consumer',
      title: "I'm a customer",
      description: 'Browse businesses, order products & services, chat with sellers',
      icon: ShoppingBagIcon,
      color: 'green',
      features: [
        'Discover local businesses',
        'Order products & services',
        'Chat with businesses',
        'Track orders & delivery',
        'Save favorite stores'
      ]
    },
    {
      id: 'both',
      title: 'I do both',
      description: 'Run your business and shop from others - switch modes anytime',
      icon: UserGroupIcon,
      color: 'purple',
      features: [
        'All business features',
        'All consumer features',
        'Quick mode switching',
        'Unified dashboard',
        'Single account for everything'
      ]
    }
  ];

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      toast.error('Please select how you want to use Dott');
      return;
    }

    setIsLoading(true);

    try {
      // Set up user based on selection
      if (selectedRole === 'business' || selectedRole === 'both') {
        // Redirect to business setup
        router.push('/onboarding/business-setup?role=' + selectedRole);
      } else {
        // Consumer only - set up consumer profile
        const response = await fetch('/api/users/mode/switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ mode: 'consumer' })
        });

        if (response.ok) {
          // Set default mode
          await fetch('/api/users/mode/set-default', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ default_mode: 'consumer' })
          });

          toast.success('Welcome to Dott Marketplace!');
          router.push('/consumer/dashboard');
        } else {
          throw new Error('Failed to set up consumer mode');
        }
      }
    } catch (error) {
      console.error('Error setting up role:', error);
      toast.error('Failed to set up your account. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Dott! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            How would you like to use Dott?
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => {
            const isSelected = selectedRole === role.id;
            const colorClasses = {
              blue: {
                border: isSelected ? 'border-blue-500' : 'border-gray-200',
                bg: isSelected ? 'bg-blue-50' : 'bg-white',
                icon: 'text-blue-600',
                button: 'bg-blue-600 hover:bg-blue-700'
              },
              green: {
                border: isSelected ? 'border-green-500' : 'border-gray-200',
                bg: isSelected ? 'bg-green-50' : 'bg-white',
                icon: 'text-green-600',
                button: 'bg-green-600 hover:bg-green-700'
              },
              purple: {
                border: isSelected ? 'border-purple-500' : 'border-gray-200',
                bg: isSelected ? 'bg-purple-50' : 'bg-white',
                icon: 'text-purple-600',
                button: 'bg-purple-600 hover:bg-purple-700'
              }
            };
            const colors = colorClasses[role.color];

            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${colors.border} ${colors.bg} hover:shadow-lg`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className={`inline-flex p-3 rounded-lg ${colors.bg} mb-4`}>
                  <role.icon className={`w-8 h-8 ${colors.icon}`} />
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {role.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {role.description}
                </p>

                <ul className="space-y-2">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className={`w-5 h-5 ${colors.icon} mr-2 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={handleRoleSelection}
            disabled={!selectedRole || isLoading}
            className={`px-8 py-3 rounded-lg text-white font-medium text-lg transition-all ${
              !selectedRole
                ? 'bg-gray-400 cursor-not-allowed'
                : isLoading
                ? 'bg-gray-500 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3 inline" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Setting up...
              </>
            ) : (
              'Continue'
            )}
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            You can always switch modes or add business features later
          </p>
        </div>
      </div>
    </div>
  );
}