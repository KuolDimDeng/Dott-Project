// src/components/LoadingState/LoadingStateWithProgress.js
import React from 'react';
import { Box, Typography, CircularProgress, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import Image from 'next/image';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  gap: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
}));

const ProgressWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  textAlign: 'center',
  '& .MuiLinearProgress-root': {
    height: 8,
    borderRadius: 4,
  },
}));

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
      <Box
        position="fixed"
        bottom={16}
        right={16}
        zIndex={1000}
        bgcolor="background.paper"
        borderRadius={2}
        boxShadow={3}
        p={2}
        maxWidth={400}
      >
        <ProgressWrapper>
          {error ? (
            <>
              <Typography color="error" variant="body2" gutterBottom>
                {error}
              </Typography>
              {onRetry && (
                <Typography
                  variant="caption"
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={onRetry}
                >
                  Retry
                </Typography>
              )}
            </>
          ) : (
            <>
              {showProgress && (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ mb: 1 }}
                />
              )}
              <Typography variant="body2">
                {message}
              </Typography>
              {showProgress && (
                <Typography variant="caption" color="textSecondary">
                  {progress}% complete
                </Typography>
              )}
            </>
          )}
        </ProgressWrapper>
      </Box>
    );
  }

  return (
    <LoadingContainer>
      {image && (
        <Box sx={{ mb: 4 }}>
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            priority
          />
        </Box>
      )}

      {error ? (
        <>
          <Typography color="error" variant="h6" gutterBottom>
            {error}
          </Typography>
          {onRetry && (
            <Typography
              variant="body2"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={onRetry}
            >
              Retry
            </Typography>
          )}
        </>
      ) : (
        showProgress ? (
          <ProgressWrapper>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              {message}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {progress}% Complete
            </Typography>
          </ProgressWrapper>
        ) : (
          <>
            <CircularProgress size={40} />
            <Typography variant="body1" color="textSecondary">
              {message}
            </Typography>
          </>
        )
      )}
    </LoadingContainer>
  );
}