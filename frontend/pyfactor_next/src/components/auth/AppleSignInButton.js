'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const AppleSignInButton = ({ onClick, disabled = false }) => {
  const { t } = useTranslation('auth');
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex justify-center items-center px-4 py-3 border border-gray-900 rounded-md shadow-sm bg-black text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label={t('signin.signInWithApple')}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.42-1.09-.48-2.08-.49-3.24 0-1.44.62-2.2.44-3.06-.42C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.75 1.18-.24 2.31-.93 3.57-.84 1.51.11 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.13zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
      {t('signin.signInWithApple', 'Sign in with Apple')}
    </button>
  );
};

export default AppleSignInButton;