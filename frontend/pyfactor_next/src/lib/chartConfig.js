'use client';

/**
 * Centralized Chart.js configuration
 * This ensures Chart.js components are registered only once
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
} from 'chart.js';

// Track if we've already registered
let isRegistered = false;

export const registerChartComponents = () => {
  if (typeof window === 'undefined') return false;
  
  if (!isRegistered) {
    try {
      console.log('[ChartConfig] Registering Chart.js components...');
      
      ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        ArcElement,
        RadialLinearScale,
        Title,
        Tooltip,
        Legend,
        Filler
      );
      
      // Set default options
      ChartJS.defaults.responsive = true;
      ChartJS.defaults.maintainAspectRatio = false;
      ChartJS.defaults.plugins.legend.position = 'top';
      ChartJS.defaults.plugins.title.display = false;
      
      isRegistered = true;
      console.log('[ChartConfig] Chart.js components registered successfully');
      return true;
    } catch (error) {
      console.error('[ChartConfig] Error registering Chart.js components:', error);
      return false;
    }
  }
  
  return true; // Already registered
};

// Auto-register on import (client-side only)
if (typeof window !== 'undefined') {
  registerChartComponents();
}

export { ChartJS };

// Export a flag to check registration status
export const isChartJSRegistered = () => isRegistered;