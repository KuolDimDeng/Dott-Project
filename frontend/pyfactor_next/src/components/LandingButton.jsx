'use client';

import {
  Button,
  CircularProgress,
  alpha,
  useTheme,
  Tooltip,
  Box,
} from '@mui/material';
import {
  useLandingPageStatus,
  BUTTON_STATES,
} from '@/hooks/useLandingPageStatus';
import { logger } from '@/utils/logger';
import { useState, useCallback } from 'react';

export default function LandingButton() {
  const theme = useTheme();
  const { buttonConfig, loading, error, retrying, handleButtonClick } =
    useLandingPageStatus();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // Enhanced error handling with user feedback
  const getButtonContent = useCallback(() => {
    if (loading) {
      return (
        <>
          <CircularProgress
            size={24}
            thickness={4}
            sx={{
              color: theme.palette.common.white,
              position: 'absolute',
              left: '50%',
              marginLeft: '-12px',
            }}
          />
          <span style={{ visibility: 'hidden' }}>Loading...</span>
        </>
      );
    }

    if (error && buttonConfig?.color === 'error') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{buttonConfig.text}</span>
          {retrying && (
            <CircularProgress
              size={16}
              thickness={4}
              sx={{ color: theme.palette.common.white }}
            />
          )}
        </Box>
      );
    }

    return buttonConfig.text;
  }, [loading, error, buttonConfig, retrying, theme.palette]);

  // Log critical errors but allow button to remain functional
  if (error && buttonConfig?.color !== 'error') {
    logger.error('Landing button error:', error);
  }

  const buttonStyles = {
    fontSize: '1.1rem',
    px: 4,
    py: 1.5,
    minWidth: '200px',
    backgroundColor: theme.palette[buttonConfig?.color || 'primary'].main,
    '&:hover': {
      backgroundColor: theme.palette[buttonConfig?.color || 'primary'].dark,
      transform: 'translateY(-1px)',
      boxShadow: `0 5px 15px ${alpha(theme.palette[buttonConfig?.color || 'primary'].main, 0.4)}`,
    },
    transition: 'all 0.2s ease-in-out',
    boxShadow: `0 4px 14px ${alpha(theme.palette[buttonConfig?.color || 'primary'].main, 0.3)}`,
    borderRadius: '50px',
    fontFamily: '"Inter", sans-serif',
    fontWeight: 600,
    letterSpacing: '0.02em',
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background:
        'linear-gradient(120deg, transparent, rgba(255,255,255,0.2), transparent)',
      transform: 'translateX(-100%)',
    },
    '&:hover::after': {
      transform: 'translateX(100%)',
      transition: 'transform 0.75s ease-in-out',
    },
    '&.Mui-disabled': {
      backgroundColor: alpha(
        theme.palette[buttonConfig?.color || 'primary'].main,
        0.7
      ),
    },
  };

  // Enhanced tooltip content based on error state
  const getTooltipContent = useCallback(() => {
    if (!error) return '';

    if (buttonConfig?.color === 'error') {
      return `Error: ${error.message || 'Unknown error'}. Click to retry.`;
    }

    return error.message || 'An error occurred';
  }, [error, buttonConfig]);

  const handleTooltipClose = useCallback(() => {
    setTooltipOpen(false);
  }, []);

  const handleTooltipOpen = useCallback(() => {
    if (error) {
      setTooltipOpen(true);
    }
  }, [error]);

  const button = (
    <Button
      disabled={loading && !retrying} // Allow clicks during retry
      variant={buttonConfig.variant}
      color={buttonConfig.color}
      onClick={handleButtonClick}
      size="large"
      sx={{
        ...buttonStyles,
        opacity: retrying ? 0.9 : 1, // Subtle visual feedback during retry
      }}
    >
      {getButtonContent()}
    </Button>
  );

  // Always wrap in tooltip for consistent hover behavior
  return (
    <Tooltip
      open={tooltipOpen}
      onClose={handleTooltipClose}
      onOpen={handleTooltipOpen}
      title={getTooltipContent()}
      arrow
      placement="top"
    >
      <span style={{ display: 'inline-block' }}>{button}</span>
    </Tooltip>
  );
}
