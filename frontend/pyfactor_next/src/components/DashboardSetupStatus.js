'use client';

// components/DashboardSetupStatus.js
import { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, Alert } from '@mui/material';
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
        <Box
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 1,
                boxShadow: 2,
                maxWidth: 400,
                zIndex: 1000
            }}
        >
            <Typography variant="subtitle2" gutterBottom color="primary">
                {STAGE_MESSAGES[setupState.stage] || setupState.message || 'Setting up your account...'}
            </Typography>
            {setupState.error ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                    {setupState.error}
                </Alert>
            ) : (
                <>
                    <LinearProgress
                        variant="determinate"
                        value={setupState.progress}
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {setupState.progress}% complete
                    </Typography>
                </>
            )}
        </Box>
    );
};

export default DashboardSetupStatus;