'use client';
import api from '@/utils/apiFetch';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function MobileLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/api/auth/consolidated-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          email, 
          password,
          rememberMe 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Welcome back!');
        
        // Handle session bridge if needed
        if (data.useSessionBridge && data.sessionToken) {
          console.log('[MobileLogin] Using session bridge for authentication');
          
          // Store bridge data in sessionStorage
          const bridgeData = {
            token: data.sessionToken,
            redirectUrl: data.onboardingCompleted ? '/mobile' : '/onboarding',
            timestamp: Date.now()
          };
          
          sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
          
          // Redirect to session bridge
          router.push('/auth/session-bridge');
          return;
        }
        
        // Fallback - direct redirect (for backward compatibility)
        if (data.onboardingCompleted) {
          router.push('/mobile');
        } else {
          router.push('/onboarding');
        }
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-center">
          <img 
            src="/static/images/favicon.png" 
            alt="Dott" 
            className="h-20 w-20 rounded-2xl shadow-lg"
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 text-center mt-4">
          Welcome to Dott
        </h1>
        <p className="text-gray-600 text-center mt-2">
          Your business in your pocket
        </p>
      </div>

      {/* Login Form */}
      <div className="flex-1 px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto w-full">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="your@email.com"
                required
                autoComplete="email"
                autoCapitalize="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
              <Link 
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = '/api/auth/login?connection=google-oauth2'}
              className="mt-6 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/mobile-signup"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* PWA Install Hint */}
      <div className="p-4 bg-blue-50 border-t border-blue-100">
        <p className="text-center text-sm text-blue-700">
          💡 Install Dott on your home screen for the best experience
        </p>
      </div>
    </div>
  );
}