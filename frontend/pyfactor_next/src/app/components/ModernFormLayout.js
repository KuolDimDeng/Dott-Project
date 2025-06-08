'use client';


import { useTranslation } from 'react-i18next';

/**
 * A modern, consistent layout for forms across the application
 */
export default function ModernFormLayout({
  title,
  subtitle,
  children,
  footerContent,
  isLoading,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onCancel = null,
  maxWidth = 'md',
  error = null,
}) {
  const { t } = useTranslation();
  
  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className={`mx-auto px-4 sm:px-6 ${widthClasses[maxWidth] || widthClasses.md}`}>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="px-6 py-3 bg-red-50 border-l-4 border-red-500">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="px-6 py-4">
            {children}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            {footerContent && (
              <div className="flex-1">
                {footerContent}
              </div>
            )}
            
            <div className="flex space-x-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50"
                >
                  {cancelText || t('common.cancel', 'Cancel')}
                </button>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common.processing', 'Processing...')}
                  </>
                ) : (
                  submitText || t('common.submit', 'Submit')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 