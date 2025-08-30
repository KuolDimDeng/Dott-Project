'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Transition } from '@headlessui/react';
import { 
  BriefcaseIcon, 
  ShoppingBagIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useSession } from '@/hooks/useSession-v2';
import toast from 'react-hot-toast';

export default function ModeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const [currentMode, setCurrentMode] = useState(null);
  const [availableModes, setAvailableModes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (session?.user) {
      loadUserMode();
    }
  }, [session]);

  const loadUserMode = async () => {
    try {
      const response = await fetch('/api/users/mode', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentMode(data.current_mode);
        setAvailableModes(data.available_modes);
        
        // Store in localStorage for quick access
        localStorage.setItem('user_mode', data.current_mode);
      }
    } catch (error) {
      console.error('Error loading user mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = async (newMode) => {
    if (newMode === currentMode) return;
    
    setIsSwitching(true);
    
    try {
      const response = await fetch('/api/users/mode/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ mode: newMode })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentMode(newMode);
        localStorage.setItem('user_mode', newMode);
        
        // Show success message
        toast.success(`Switched to ${newMode === 'business' ? 'Business' : 'Consumer'} mode`);
        
        // Redirect based on mode
        if (newMode === 'business') {
          router.push('/dashboard');
        } else {
          router.push('/consumer/dashboard');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to switch mode');
      }
    } catch (error) {
      console.error('Error switching mode:', error);
      toast.error('Failed to switch mode');
    } finally {
      setIsSwitching(false);
    }
  };

  const getModeIcon = (mode) => {
    return mode === 'business' ? BriefcaseIcon : ShoppingBagIcon;
  };

  const getModeName = (mode) => {
    return mode === 'business' ? 'Business' : 'Consumer';
  };

  const getModeColor = (mode) => {
    return mode === 'business' ? 'text-blue-600' : 'text-green-600';
  };

  if (isLoading || !currentMode) {
    return null;
  }

  // Don't show on auth pages
  if (pathname?.includes('/auth') || pathname?.includes('/onboarding')) {
    return null;
  }

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button 
            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSwitching}
          >
            {isSwitching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                Switching...
              </>
            ) : (
              <>
                {React.createElement(getModeIcon(currentMode), {
                  className: `w-5 h-5 mr-2 ${getModeColor(currentMode)}`
                })}
                <span className={getModeColor(currentMode)}>
                  {getModeName(currentMode)} Mode
                </span>
                <ChevronDownIcon className="w-4 h-4 ml-2 -mr-1" />
              </>
            )}
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-50 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="px-1 py-1">
              {availableModes.map((mode) => (
                <Menu.Item key={mode}>
                  {({ active }) => (
                    <button
                      onClick={() => handleModeSwitch(mode)}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } group flex items-center w-full px-4 py-2 text-sm text-gray-900 rounded-md`}
                      disabled={mode === currentMode}
                    >
                      {React.createElement(getModeIcon(mode), {
                        className: `w-5 h-5 mr-3 ${getModeColor(mode)}`
                      })}
                      <span className="flex-1 text-left">
                        {getModeName(mode)} Mode
                      </span>
                      {mode === currentMode && (
                        <CheckIcon className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
            
            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => router.push('/settings/mode-preferences')}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } group flex items-center w-full px-4 py-2 text-sm text-gray-900 rounded-md`}
                  >
                    <Cog6ToothIcon className="w-5 h-5 mr-3 text-gray-500" />
                    Mode Settings
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}