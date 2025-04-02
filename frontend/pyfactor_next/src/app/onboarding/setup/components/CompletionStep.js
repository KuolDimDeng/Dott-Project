import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { 
  SparklesIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  CreditCardIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/TailwindComponents';
import { useEffect, useState } from 'react';

export default function CompletionStep({ onContinue, setupDuration = null }) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(true);
  
  // Calculate the duration in seconds with 1 decimal place
  const formattedDuration = setupDuration 
    ? `${(setupDuration / 1000).toFixed(1)}s` 
    : 'complete';
    
  // Fade out confetti after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);
  
  // Features to highlight for new users
  const features = [
    {
      title: 'Financial Dashboard',
      description: 'View your finances at a glance with interactive charts',
      icon: <ChartBarIcon className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Invoice Management',
      description: 'Create and track professional invoices',
      icon: <DocumentTextIcon className="h-5 w-5 text-indigo-500" />
    },
    {
      title: 'Expense Tracking',
      description: 'Log and categorize all business expenses',
      icon: <CreditCardIcon className="h-5 w-5 text-purple-500" />
    },
    {
      title: 'Team Collaboration',
      description: 'Invite team members to streamline workflows',
      icon: <UserGroupIcon className="h-5 w-5 text-green-500" />
    }
  ];
  
  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(30)].map((_, i) => (
            <div 
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}
      
      <div className="flex flex-col items-center text-center mb-10">
        <div className="relative">
          <div className="flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6 relative overflow-hidden">
            <CheckCircleIcon className="h-16 w-16 text-green-600" />
            <div className="absolute inset-0 bg-green-500 opacity-20 pulse-animation"></div>
          </div>
          
          <div className="absolute -top-1 -right-1">
            <SparklesIcon className="h-6 w-6 text-amber-400 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Setup Complete!
        </h2>
        
        <p className="text-gray-600 mb-8 max-w-md">
          Your account has been successfully configured and is ready to use.
          {setupDuration && (
            <span className="block mt-2 text-sm text-gray-500">
              Setup completed in {formattedDuration}
            </span>
          )}
        </p>
      </div>
      
      {/* Feature highlights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Get started with these features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex items-start p-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0 mr-3 mt-1">{feature.icon}</div>
              <div>
                <h4 className="font-medium text-gray-900">{feature.title}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col items-center">
        <Button
          variant="contained"
          color="primary"
          onClick={onContinue}
          className="px-8 py-3 text-lg font-medium"
          data-testid="continue-to-dashboard-button"
        >
          Continue to Dashboard
        </Button>
        <p className="text-sm text-gray-500 mt-3">
          Need help getting started? Check out our <a href="#" className="text-blue-600 hover:underline">quick start guide</a>
        </p>
      </div>
      
      {/* CSS for confetti animation */}
      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 100;
          overflow: hidden;
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          opacity: 0.8;
          animation: fall 5s ease-in-out forwards;
          transform: rotate(3deg);
        }
        @keyframes fall {
          0% {
            top: -10px;
            transform: rotate(0deg) translateX(0);
            opacity: 1;
          }
          100% {
            top: 100%;
            transform: rotate(360deg) translateX(100px);
            opacity: 0;
          }
        }
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
} 