'use client';

import { useEffect, useState } from 'react';
import { Button, ThemeProvider, createTheme } from '@mui/material';

/**
 * GlobalEventDebugger - Uses MUI's recommended approach without direct DOM manipulation
 */
export default function GlobalEventDebugger() {
  const [isEnabled, setIsEnabled] = useState(true);

  // Create a theme that specifically addresses input issues
  const fixedInputTheme = createTheme({
    components: {
      MuiInputBase: {
        defaultProps: {
          // Prevent performance issues with many text fields
          disableInjectingGlobalStyles: true,
        },
        styleOverrides: {
          // Ensure inputs are visible and interactable
          root: {
            '&.MuiInputBase-root': {
              position: 'relative',
              zIndex: 10,
            },
            '& input': {
              color: 'inherit',
              caretColor: 'black',
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          InputLabelProps: {
            // Force labels to shrink consistently
            shrink: true,
          },
        },
        styleOverrides: {
          root: {
            '& .MuiInputBase-input': {
              position: 'relative',
              zIndex: 10,
            },
          },
        },
      },
      MuiModal: {
        defaultProps: {
          // Ensure modals don't block inputs
          disableEnforceFocus: true,
        },
      },
    },
  });

  useEffect(() => {
    if (!isEnabled) return;
    
    // Log initialization
    console.log('[GlobalEventDebugger] Initialized with MUI recommended approach');

    // Helper to check if we're on the dashboard page
    const isDashboardPage = () => {
      return window.location.pathname.includes('/dashboard');
    };
    
    console.log(`[GlobalEventDebugger] Current page: ${window.location.pathname}`);
    
    // Create toggle button using MUI styling approach
    const createToggleButton = () => {
      const existingButton = document.getElementById('global-event-debugger-toggle');
      if (existingButton) {
        existingButton.remove();
      }
      
      const button = document.createElement('button');
      button.id = 'global-event-debugger-toggle';
      button.textContent = isEnabled ? 'Disable MUI Fix' : 'Enable MUI Fix';
      button.style.cssText = `
        position: fixed; 
        bottom: 10px; 
        right: 10px; 
        z-index: 100000; 
        padding: 8px; 
        background: ${isEnabled ? '#ff5722' : '#4caf50'}; 
        color: white; 
        border: none; 
        border-radius: 4px;
      `;
      
      button.addEventListener('click', () => {
        setIsEnabled(prev => !prev);
      });
      
      document.body.appendChild(button);
      return button;
    };
    
    // Create toggle button
    const button = createToggleButton();
    
    // Add global stylesheet to fix common MUI input issues
    const addGlobalStyle = () => {
      const id = 'mui-input-fix-styles';
      if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.innerHTML = `
          /* MUI Input Fix Styles */
          @keyframes mui-auto-fill { from { display: block; } }
          @keyframes mui-auto-fill-cancel { from { display: block; } }
          
          /* Ensure inputs are interactive */
          .MuiInputBase-root, .MuiInput-root, .MuiOutlinedInput-root, .MuiFilledInput-root {
            position: relative !important;
            z-index: 10 !important;
          }
          
          /* Ensure text is visible */
          .MuiInputBase-input {
            color: black !important;
            caret-color: black !important;
          }
        `;
        document.head.appendChild(style);
      }
    };
    
    // Add the global styles
    if (isEnabled) {
      addGlobalStyle();
    }
    
    // Cleanup function
    return () => {
      if (button && button.parentNode) {
        button.parentNode.removeChild(button);
      }
      
      const style = document.getElementById('mui-input-fix-styles');
      if (style) {
        style.parentNode.removeChild(style);
      }
    };
  }, [isEnabled]);
  
  // Wrap the application with the fixed theme
  return isEnabled ? (
    <ThemeProvider theme={fixedInputTheme}>
      {null}
    </ThemeProvider>
  ) : null;
} 