'use client';

// src/components/LoadingState/LoadingStateWithProgress.js

import React from 'react';
import Image from 'next/image';

export function LoadingStateWithProgress({
  message = 'Loading...',
  progress = 0,
  showProgress = false,
  isLoading = true,
  image = null,
  isBackground = false,
  error = null,
  onRetry = null
}) {
  if (isBackground) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[1000] max-w-[400px] rounded-lg bg-white dark:bg-gray-800 p-4 shadow-lg"
      >
        <div className="w-full text-center">
          {error ? (
            <>
              <p className="mb-2 text-sm text-error-main">
                {error}
              </p>
              {onRetry && (
                <span
                  className="text-xs cursor-pointer underline"
                  onClick={onRetry}
                >
                  Retry
                </span>
              )}
            </>
          ) : (
            <>
              {showProgress && (
                <div className="relative h-2 w-full mb-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div 
                    className="h-full rounded-full bg-primary-main" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
              <p className="text-sm">
                {message}
              </p>
              {showProgress && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {progress}% complete
                </span>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white dark:bg-gray-900 p-4">
      {image && (
        <div className="mb-8">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            priority
          />
        </div>
      )}

      {error ? (
        <>
          <h6 className="mb-2 text-xl font-semibold text-error-main">
            {error}
          </h6>
          {onRetry && (
            <p
              className="text-sm cursor-pointer underline"
              onClick={onRetry}
            >
              Retry
            </p>
          )}
        </>
      ) : (
        showProgress ? (
          <div className="w-full max-w-[400px] text-center">
            <div className="relative h-2 w-full mb-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div 
                className="h-full rounded-full bg-primary-main transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <h6 className="mb-2 text-lg font-semibold">
              {message}
            </h6>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {progress}% Complete
            </span>
          </div>
        ) : (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary-main"></div>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </>
        )
      )}
    </div>
  );
}