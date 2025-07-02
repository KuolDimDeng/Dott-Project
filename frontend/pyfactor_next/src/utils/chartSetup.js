'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Flag to track if Chart.js has been registered
let isRegistered = false;

export const setupChart = () => {
  if (typeof window !== 'undefined' && !isRegistered) {
    try {
      ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        Title,
        Tooltip,
        Legend,
        ArcElement
      );
      isRegistered = true;
    } catch (error) {
      console.warn('Chart.js registration failed:', error);
    }
  }
};

// Auto-setup when imported
setupChart();

export { ChartJS };