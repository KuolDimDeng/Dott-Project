// Theme configuration for business and consumer modes

export const themes = {
  consumer: {
    // Dark green theme for consumer mode
    primary: '#14532d', // Dark forest green
    primaryLight: '#166534', // Lighter green
    primaryDark: '#052e16', // Darker green
    secondary: '#10b981', // Emerald green
    accent: '#34d399', // Light emerald
    gradient: ['#14532d', '#166534'], // Green gradient
    
    // UI colors
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    
    // Navigation
    tabBarActive: '#14532d',
    tabBarInactive: '#6b7280',
    headerBackground: '#14532d',
    headerText: '#ffffff',
    
    // Buttons
    buttonPrimary: '#14532d',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#ffffff',
    buttonSecondaryText: '#14532d',
    buttonDisabled: '#9ca3af',
    buttonDisabledText: '#ffffff',
  },
  
  business: {
    // Navy blue theme for business mode
    primary: '#1e3a8a', // Navy blue
    primaryLight: '#2563eb', // Lighter blue
    primaryDark: '#1e293b', // Darker navy
    secondary: '#3b82f6', // Bright blue
    accent: '#60a5fa', // Sky blue
    gradient: ['#1e3a8a', '#2563eb'], // Navy gradient
    
    // UI colors
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    
    // Navigation
    tabBarActive: '#1e3a8a',
    tabBarInactive: '#6b7280',
    headerBackground: '#1e3a8a',
    headerText: '#ffffff',
    
    // Buttons
    buttonPrimary: '#1e3a8a',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#ffffff',
    buttonSecondaryText: '#1e3a8a',
    buttonDisabled: '#9ca3af',
    buttonDisabledText: '#ffffff',
  }
};

export const getTheme = (mode = 'consumer') => {
  return themes[mode] || themes.consumer;
};