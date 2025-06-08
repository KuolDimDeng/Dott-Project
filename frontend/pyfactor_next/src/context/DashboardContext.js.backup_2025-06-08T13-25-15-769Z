'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

// Create the Dashboard Context
const DashboardContext = createContext({
  // Dashboard view state
  currentView: 'main',
  showMainDashboard: true,
  showKPIDashboard: false,
  showHRDashboard: false,
  showInventoryDashboard: false,
  showCRMDashboard: false,
  showSalesDashboard: false,
  showTransportDashboard: false,
  
  // UI state
  drawerOpen: true,
  
  // Form state
  showForm: false,
  formOption: null,
  
  // Action handlers
  setCurrentView: () => {},
  toggleDrawer: () => {},
  showDashboardView: () => {},
  resetAllViews: () => {},
  setFormView: () => {},
  closeForm: () => {},
});

// Custom hook for accessing the Dashboard Context
export const useDashboard = () => useContext(DashboardContext);

// Provider component
export function DashboardProvider({ children }) {
  // Safe initial state detection for SSR
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after first render (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Dashboard view state
  const [currentView, setCurrentView] = useState('main');
  const [showMainDashboard, setShowMainDashboard] = useState(true);
  const [showKPIDashboard, setShowKPIDashboard] = useState(false);
  const [showHRDashboard, setShowHRDashboard] = useState(false);
  const [showInventoryDashboard, setShowInventoryDashboard] = useState(false);
  const [showCRMDashboard, setShowCRMDashboard] = useState(false);
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  const [showTransportDashboard, setShowTransportDashboard] = useState(false);
  
  // UI state - only enable drawer on client side to prevent hydration errors
  const [drawerOpen, setDrawerOpen] = useState(isClient ? true : false);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formOption, setFormOption] = useState(null);
  
  // Update drawer state after client detection
  useEffect(() => {
    if (isClient) {
      setDrawerOpen(true);
    }
  }, [isClient]);
  
  // Action handlers
  const toggleDrawer = useCallback(() => {
    // Only toggle if we're client-side
    if (typeof window !== 'undefined') {
      setDrawerOpen(prev => !prev);
    }
  }, []);
  
  const resetAllViews = useCallback(() => {
    setShowMainDashboard(false);
    setShowKPIDashboard(false);
    setShowHRDashboard(false);
    setShowInventoryDashboard(false);
    setShowCRMDashboard(false);
    setShowSalesDashboard(false);
    setShowTransportDashboard(false);
    setShowForm(false);
    setFormOption(null);
  }, []);
  
  const showDashboardView = useCallback((view) => {
    resetAllViews();
    
    switch(view) {
      case 'main':
        setShowMainDashboard(true);
        break;
      case 'kpi':
        setShowKPIDashboard(true);
        break;
      case 'hr':
        setShowHRDashboard(true);
        break;
      case 'inventory':
        setShowInventoryDashboard(true);
        break;
      case 'crm':
        setShowCRMDashboard(true);
        break;
      case 'sales':
        setShowSalesDashboard(true);
        break;
      case 'transport':
        setShowTransportDashboard(true);
        break;
      default:
        setShowMainDashboard(true);
    }
    
    setCurrentView(view);
  }, [resetAllViews]);
  
  const setFormView = useCallback((option) => {
    resetAllViews();
    setFormOption(option);
    setShowForm(true);
  }, [resetAllViews]);
  
  const closeForm = useCallback(() => {
    setShowForm(false);
    setFormOption(null);
    setShowMainDashboard(true);
  }, []);
  
  // Create memoized context value
  const value = useMemo(() => ({
    // Dashboard view state
    currentView,
    showMainDashboard,
    showKPIDashboard,
    showHRDashboard,
    showInventoryDashboard,
    showCRMDashboard,
    showSalesDashboard,
    showTransportDashboard,
    
    // UI state
    drawerOpen,
    
    // Form state
    showForm,
    formOption,
    
    // Action handlers
    setCurrentView,
    toggleDrawer,
    showDashboardView,
    resetAllViews,
    setFormView,
    closeForm,
  }), [
    currentView, 
    showMainDashboard, 
    showKPIDashboard, 
    showHRDashboard, 
    showInventoryDashboard,
    showCRMDashboard,
    showSalesDashboard,
    showTransportDashboard,
    drawerOpen,
    showForm,
    formOption,
    setCurrentView,
    toggleDrawer,
    showDashboardView,
    resetAllViews,
    setFormView,
    closeForm
  ]);
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
} 