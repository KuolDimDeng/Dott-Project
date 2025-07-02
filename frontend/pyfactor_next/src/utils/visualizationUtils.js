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

// Register Chart.js components
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

export const parseVisualizationData = (responseText) => {
  const visualizations = [];
  
  try {
    // Look for chart data in JSON format
    const jsonMatches = responseText.match(/```json\n([\s\S]*?)\n```/g);
    
    if (jsonMatches) {
      jsonMatches.forEach((match, index) => {
        try {
          const jsonContent = match.replace(/```json\n/, '').replace(/\n```/, '');
          const chartData = JSON.parse(jsonContent);
          
          if (chartData.type && chartData.data) {
            visualizations.push({
              id: `chart-${index}`,
              type: 'chart',
              chartType: chartData.type,
              data: chartData.data,
              options: chartData.options || {},
              title: chartData.title || 'Data Visualization'
            });
          }
        } catch (error) {
          console.warn('Failed to parse chart data:', error);
        }
      });
    }
    
    // Look for CSV-like data tables
    const tableMatches = responseText.match(/\|.*\|[\s\S]*?\n\n/g);
    
    if (tableMatches) {
      tableMatches.forEach((match, index) => {
        try {
          const tableData = parseTableToChart(match);
          if (tableData) {
            visualizations.push({
              id: `table-chart-${index}`,
              type: 'chart',
              chartType: 'bar',
              data: tableData,
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Data Overview'
                  }
                }
              },
              title: 'Extracted Data'
            });
          }
        } catch (error) {
          console.warn('Failed to parse table data:', error);
        }
      });
    }
    
    // Look for mermaid diagrams
    const mermaidMatches = responseText.match(/```mermaid\n([\s\S]*?)\n```/g);
    
    if (mermaidMatches) {
      mermaidMatches.forEach((match, index) => {
        const mermaidContent = match.replace(/```mermaid\n/, '').replace(/\n```/, '');
        visualizations.push({
          id: `mermaid-${index}`,
          type: 'mermaid',
          content: mermaidContent,
          title: 'Process Diagram'
        });
      });
    }
    
    // Look for simple data patterns and auto-generate charts
    const dataPatterns = extractDataPatterns(responseText);
    dataPatterns.forEach((pattern, index) => {
      visualizations.push({
        id: `auto-chart-${index}`,
        type: 'chart',
        chartType: pattern.type,
        data: pattern.data,
        options: pattern.options,
        title: pattern.title
      });
    });
    
  } catch (error) {
    console.error('Error parsing visualization data:', error);
  }
  
  return visualizations;
};

const parseTableToChart = (tableText) => {
  try {
    const lines = tableText.trim().split('\n').filter(line => line.includes('|'));
    
    if (lines.length < 3) return null; // Need header, separator, and at least one data row
    
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const dataRows = lines.slice(2).map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    if (headers.length < 2 || dataRows.length === 0) return null;
    
    const labels = dataRows.map(row => row[0]);
    const datasets = [];
    
    for (let i = 1; i < headers.length; i++) {
      const data = dataRows.map(row => {
        const value = parseFloat(row[i]);
        return isNaN(value) ? 0 : value;
      });
      
      datasets.push({
        label: headers[i],
        data: data,
        backgroundColor: getChartColor(i - 1, 0.2),
        borderColor: getChartColor(i - 1, 1),
        borderWidth: 1
      });
    }
    
    return {
      labels,
      datasets
    };
    
  } catch (error) {
    console.warn('Error parsing table:', error);
    return null;
  }
};

const extractDataPatterns = (text) => {
  const patterns = [];
  
  // Look for revenue/sales data patterns
  const revenuePattern = /revenue.*?(\$?[\d,]+(?:\.\d{2})?)/gi;
  const revenueMatches = Array.from(text.matchAll(revenuePattern));
  
  if (revenueMatches.length > 1) {
    const data = revenueMatches.map((match, index) => ({
      label: `Period ${index + 1}`,
      value: parseFloat(match[1].replace(/[$,]/g, ''))
    })).filter(item => !isNaN(item.value));
    
    if (data.length > 1) {
      patterns.push({
        type: 'line',
        title: 'Revenue Trend',
        data: {
          labels: data.map(d => d.label),
          datasets: [{
            label: 'Revenue',
            data: data.map(d => d.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Revenue Trend'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
  }
  
  // Look for percentage data
  const percentagePattern = /(\w+).*?(\d+(?:\.\d+)?)\s*%/gi;
  const percentageMatches = Array.from(text.matchAll(percentagePattern));
  
  if (percentageMatches.length > 1) {
    const data = percentageMatches.map(match => ({
      label: match[1],
      value: parseFloat(match[2])
    })).filter(item => !isNaN(item.value));
    
    if (data.length > 1) {
      patterns.push({
        type: 'doughnut',
        title: 'Distribution',
        data: {
          labels: data.map(d => d.label),
          datasets: [{
            data: data.map(d => d.value),
            backgroundColor: data.map((_, index) => getChartColor(index, 0.8)),
            borderColor: data.map((_, index) => getChartColor(index, 1)),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Distribution'
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }
  
  return patterns;
};

const getChartColor = (index, alpha = 1) => {
  const colors = [
    `rgba(59, 130, 246, ${alpha})`,   // Blue
    `rgba(16, 185, 129, ${alpha})`,   // Green
    `rgba(245, 158, 11, ${alpha})`,   // Yellow
    `rgba(239, 68, 68, ${alpha})`,    // Red
    `rgba(139, 92, 246, ${alpha})`,   // Purple
    `rgba(236, 72, 153, ${alpha})`,   // Pink
    `rgba(14, 165, 233, ${alpha})`,   // Sky
    `rgba(34, 197, 94, ${alpha})`     // Emerald
  ];
  
  return colors[index % colors.length];
};

export const generateSampleChart = (type = 'bar') => {
  const sampleData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'Sample Data',
      data: [12, 19, 3, 5, 2],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    }]
  };
  
  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Sample Chart'
      }
    }
  };
  
  return {
    type,
    data: sampleData,
    options
  };
};

export const shouldShowVisualization = (responseText) => {
  // Check if response contains data that would benefit from visualization
  const indicators = [
    /\d+%/g,                    // Percentages
    /\$[\d,]+/g,                // Currency amounts
    /\d+\s*(customers?|orders?|products?|sales?)/gi, // Counts
    /\|.*\|/g,                  // Tables
    /```json/g,                 // JSON data
    /```mermaid/g,              // Mermaid diagrams
    /(trend|comparison|analysis|breakdown)/gi // Analysis keywords
  ];
  
  return indicators.some(pattern => pattern.test(responseText));
};