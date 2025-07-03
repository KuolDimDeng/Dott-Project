'use client';

// Fallback chart generator when Claude doesn't return proper JSON format
export const generateFallbackChart = (responseText) => {
  // Try to extract data from text-based responses
  const visualizations = [];
  
  // Look for customer data patterns
  const customerPattern = /(\w+\s*\w*)\s*[:\-|]\s*\$?([\d,]+(?:\.\d+)?)/g;
  const matches = Array.from(responseText.matchAll(customerPattern));
  
  if (matches.length > 0) {
    const labels = [];
    const data = [];
    
    matches.forEach(match => {
      const label = match[1].trim();
      const value = parseFloat(match[2].replace(/,/g, ''));
      
      if (label && !isNaN(value)) {
        labels.push(label);
        data.push(value);
      }
    });
    
    if (labels.length > 0) {
      visualizations.push({
        id: 'fallback-chart-1',
        type: 'chart',
        chartType: 'bar',
        title: 'Data Overview',
        data: {
          labels: labels,
          datasets: [{
            label: 'Values',
            data: data,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Business Data'
            }
          }
        }
      });
    }
  }
  
  // Look for percentage distributions
  const percentPattern = /(\w+\s*\w*)\s*[:\-|]\s*([\d.]+)\s*%/g;
  const percentMatches = Array.from(responseText.matchAll(percentPattern));
  
  if (percentMatches.length > 1) {
    const labels = [];
    const data = [];
    
    percentMatches.forEach(match => {
      const label = match[1].trim();
      const value = parseFloat(match[2]);
      
      if (label && !isNaN(value)) {
        labels.push(label);
        data.push(value);
      }
    });
    
    if (labels.length > 1) {
      visualizations.push({
        id: 'fallback-chart-2',
        type: 'chart',
        chartType: 'doughnut',
        title: 'Distribution',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Percentage Distribution'
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }
  
  return visualizations;
};