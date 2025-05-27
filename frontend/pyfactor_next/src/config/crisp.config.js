/**
 * Crisp Chat Configuration
 * 
 * This file centralizes all Crisp Chat configuration to ensure
 * consistent behavior across the application.
 */

const crispConfig = {
  // Crisp Website ID - this is your unique identifier for Crisp Chat
  websiteId: '02ce1965-8acf-4c6e-b8c0-a543ead8004e',
  
  // Configuration options
  options: {
    // Position the chat widget on the bottom right
    position: 'right',
    // Reverse the position (from right to left if RTL)
    positionReverse: true,
    // Show on mobile devices
    hideOnMobile: false,
    // Enable safe mode
    safeMode: true,
    // Cookie domain (leave empty for automatic)
    cookieDomain: '',
    // Lock the widget maximized state
    lockMaximized: false,
    // Lock the widget minimized state  
    lockMinimized: false,
  },
  
  // Z-index configuration to ensure proper layering
  zIndex: {
    chatbox: 9999,
    cookieBanner: 99999,
  },
  
  // Delay configurations (in milliseconds)
  delays: {
    // Delay before initializing Crisp after script load
    initDelay: 500,
    // Delay before retrying on script load failure
    retryDelay: 2000,
    // Maximum attempts to wait for Crisp to be ready
    maxReadyAttempts: 10,
    // Delay between ready check attempts
    readyCheckDelay: 100,
  },
  
  // Feature flags
  features: {
    // Whether to set user data when authenticated
    setUserData: true,
    // Whether to show chat immediately after initialization
    autoShow: true,
    // Whether to log debug information
    debug: true,
  }
};

// Freeze the config to prevent accidental modifications
export default Object.freeze(crispConfig); 