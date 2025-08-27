'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  ChartBarIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowsPointingOutIcon 
} from '@heroicons/react/24/outline';

const SmartInsightVisualization = ({ visualizations, className = '' }) => {
  const [collapsedCharts, setCollapsedCharts] = useState(new Set());
  const [expandedChart, setExpandedChart] = useState(null);
  const mermaidRefs = useRef({});

  useEffect(() => {
    // Load Mermaid dynamically only when needed
    const loadMermaid = async () => {
      if (visualizations.some(v => v.type === 'mermaid')) {
        try {
          const mermaid = await import('mermaid');
          mermaid.default.initialize({ 
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose'
          });
          
          // Render all mermaid diagrams
          visualizations.forEach(async (viz, index) => {
            if (viz.type === 'mermaid' && mermaidRefs.current[viz.id]) {
              try {
                const { svg } = await mermaid.default.render(`mermaid-${viz.id}`, viz.content);
                mermaidRefs.current[viz.id].innerHTML = svg;
              } catch (error) {
                console.error('Mermaid rendering error:', error);
                mermaidRefs.current[viz.id].innerHTML = `
                  <div class="text-red-500 text-sm p-4 border border-red-200 rounded">
                    Failed to render diagram: ${error.message}
                  </div>
                `;
              }
            }
          });
        } catch (error) {
          console.error('Failed to load Mermaid:', error);
        }
      }
    };

    loadMermaid();
  }, [visualizations]);

  const toggleChartCollapse = (chartId) => {
    const newCollapsed = new Set(collapsedCharts);
    if (newCollapsed.has(chartId)) {
      newCollapsed.delete(chartId);
    } else {
      newCollapsed.add(chartId);
    }
    setCollapsedCharts(newCollapsed);
  };

  const expandChart = (chartId) => {
    setExpandedChart(chartId);
  };

  const closeExpanded = () => {
    setExpandedChart(null);
  };

  const renderChart = (visualization, size = 'normal') => {
    const { chartType, data, options, title } = visualization;
    
    // Transform Chart.js data format to Recharts format
    const transformedData = data.labels?.map((label, index) => {
      const point = { name: label };
      data.datasets?.forEach((dataset) => {
        point[dataset.label || 'value'] = dataset.data[index];
      });
      return point;
    }) || [];

    // Define colors for charts
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {size === 'expanded' ? <Legend /> : null}
              {data.datasets?.map((dataset, index) => (
                <Bar 
                  key={dataset.label} 
                  dataKey={dataset.label || 'value'} 
                  fill={dataset.backgroundColor || COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {size === 'expanded' ? <Legend /> : null}
              {data.datasets?.map((dataset, index) => (
                <Line 
                  key={dataset.label}
                  type="monotone" 
                  dataKey={dataset.label || 'value'} 
                  stroke={dataset.borderColor || COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'doughnut':
      case 'pie':
        // For pie/doughnut, use first dataset only
        const pieData = data.labels?.map((label, index) => ({
          name: label,
          value: data.datasets?.[0]?.data?.[index] || 0
        })) || [];
        const pieColors = data.datasets?.[0]?.backgroundColor || COLORS;
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'doughnut' ? 60 : 0}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Array.isArray(pieColors) ? pieColors[index % pieColors.length] : pieColors} />
                ))}
              </Pie>
              <Tooltip />
              {size === 'expanded' ? <Legend /> : null}
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {data.datasets?.map((dataset, index) => (
                <Bar 
                  key={dataset.label} 
                  dataKey={dataset.label || 'value'} 
                  fill={dataset.backgroundColor || COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (!visualizations || visualizations.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {visualizations.map((visualization) => (
          <div
            key={visualization.id}
            className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gray-100 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-900">
                  {visualization.title}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                {visualization.type === 'chart' && (
                  <button
                    onClick={() => expandChart(visualization.id)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Expand chart"
                  >
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => toggleChartCollapse(visualization.id)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title={collapsedCharts.has(visualization.id) ? "Show chart" : "Hide chart"}
                >
                  {collapsedCharts.has(visualization.id) ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            {!collapsedCharts.has(visualization.id) && (
              <div className="p-4">
                {visualization.type === 'chart' ? (
                  <div style={{ height: '300px' }}>
                    {renderChart(visualization)}
                  </div>
                ) : visualization.type === 'mermaid' ? (
                  <div
                    ref={(ref) => {
                      if (ref) mermaidRefs.current[visualization.id] = ref;
                    }}
                    className="mermaid-diagram text-center"
                    style={{ minHeight: '200px' }}
                  />
                ) : (
                  <div className="text-gray-500 text-sm">
                    Unsupported visualization type: {visualization.type}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {visualizations.find(v => v.id === expandedChart)?.title}
              </h3>
              <button
                onClick={closeExpanded}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6" style={{ height: '500px' }}>
              {renderChart(visualizations.find(v => v.id === expandedChart), 'expanded')}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartInsightVisualization;