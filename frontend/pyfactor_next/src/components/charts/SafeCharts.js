'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChartWrapper } from './ChartWrapper';

/**
 * Safe chart components that handle SSR and registration properly
 */

// Recharts components (already SSR-safe)
export { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area,
  ComposedChart,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Chart.js components with dynamic imports and wrapper
const ChartJSLine = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />
  }
);

const ChartJSBar = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Bar),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />
  }
);

const ChartJSPie = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Pie),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />
  }
);

const ChartJSDoughnut = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Doughnut),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />
  }
);

// Wrapped Chart.js components
export const SafeLineChart = (props) => (
  <ChartWrapper>
    <ChartJSLine {...props} />
  </ChartWrapper>
);

export const SafeBarChart = (props) => (
  <ChartWrapper>
    <ChartJSBar {...props} />
  </ChartWrapper>
);

export const SafePieChart = (props) => (
  <ChartWrapper>
    <ChartJSPie {...props} />
  </ChartWrapper>
);

export const SafeDoughnutChart = (props) => (
  <ChartWrapper>
    <ChartJSDoughnut {...props} />
  </ChartWrapper>
);