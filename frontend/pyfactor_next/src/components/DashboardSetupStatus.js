'use client';


// components/DashboardSetupStatus.js
import { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const STAGE_MESSAGES = {
    'initializing': 'Initializing your account...',
    'creating_database': 'Creating your database...',
    'configuring': 'Configuring your workspace...',
    'ready': 'Setup complete!',
    'failed': 'Setup failed. Please contact support.',
};

const DashboardSetupStatus = () => {
    const [setupState, setSetupState] = useState({
        show: true,
        progress: 0,
        error: null,
        complete: false,
        stage: 'initializing',
        message: STAGE_MESSAGES.initializing
    });

    useEffect(() => {
        let mounted = true;
        let retryCount = 0;
        let timeoutId = null;
        
        // Exponential backoff for polling
        const getPollingDelay = (retry) => {
            // Start with 5 seconds, then increase exponentially (5s, 10s, 20s, etc.)
            return Math.min(5000 * Math.pow(2, retry), 60000); // Max 60 seconds
        };
        
        const pollStatus = async () => {
            try {
                const response = await axiosInstance.get('/api/onboarding/setup/status/');
                if (!mounted) return;

                // Reset retry count on success
                retryCount = 0;
                
                const { database_status, progress, stage, message } = response.data;

                const newStage = database_status === 'ready' || database_status === 'active'
                    ? 'ready'
                    : database_status === 'failed'
                        ? 'failed'
                        : stage || 'initializing';

                setSetupState(prev => ({
                    ...prev,
                    show: newStage !== 'ready',
                    complete: newStage === 'ready',
                    progress: newStage === 'ready' ? 100 : (progress || prev.progress),
                    stage: newStage,
                    message: message || STAGE_MESSAGES[newStage] || prev.message,
                    error: database_status === 'failed' ? (message || STAGE_MESSAGES.failed) : null
                }));

                if (newStage === 'ready' || newStage === 'failed') {
                    return; // Stop polling
                }

                logger.debug('Setup status updated:', {
                    database_status,
                    progress,
                    stage,
                    message
                });
                
                // Schedule next poll with current delay
                timeoutId = setTimeout(pollStatus, getPollingDelay(retryCount));
                
            } catch (error) {
                logger.error('Setup status check failed:', error);
                
                // Increase retry count for backoff
                retryCount++;
                
                // If we get a 429 (Too Many Requests), increase the backoff more aggressively
                if (error.response?.status === 429) {
                    retryCount = Math.min(retryCount + 2, 10); // Add extra backoff but cap it
                }
                
                // Schedule next poll with increased delay
                timeoutId = setTimeout(pollStatus, getPollingDelay(retryCount));
            }
        };

        // Start polling
        pollStatus();

        return () => {
            mounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    if (!setupState.show) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-md max-w-sm z-50">
            <p className="text-sm font-medium text-primary-main mb-2">
                {STAGE_MESSAGES[setupState.stage] || setupState.message || 'Setting up your account...'}
            </p>
            
            {setupState.error ? (
                <div className="mt-2 bg-red-50 text-red-800 p-3 rounded-md border border-red-200 text-sm">
                    {setupState.error}
                </div>
            ) : (
                <>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-primary-main h-1.5 rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${setupState.progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {setupState.progress}% complete
                    </p>
                </>
            )}
        </div>
    );
};

export default DashboardSetupStatus;