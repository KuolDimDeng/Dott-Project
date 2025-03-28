'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

// Create a component that directly manipulates the DOM for testing
function DirectInputTest() {
  // References to input elements
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  
  useEffect(() => {
    if (!inputRef.current || !outputRef.current) return;
    
    // Get the input element
    const input = inputRef.current;
    const output = outputRef.current;
    
    // Apply special styling
    input.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px;
      font-size: 16px;
      border: 2px solid blue;
      border-radius: 4px;
      margin-bottom: 10px;
      position: relative;
      z-index: 9999;
      background-color: white;
    `;
    
    // Add direct event listener
    const handleInput = () => {
      output.textContent = input.value || '(empty)';
    };
    
    // Add event listeners directly to the DOM element
    input.addEventListener('input', handleInput);
    input.addEventListener('keyup', handleInput);
    input.addEventListener('change', handleInput);
    
    // Create helper buttons programmatically
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;';
    
    // Add buttons for common actions
    const buttons = [
      { label: 'Focus', action: () => input.focus() },
      { label: 'Add "A"', action: () => { input.value += 'A'; handleInput(); } },
      { label: 'Add "B"', action: () => { input.value += 'B'; handleInput(); } },
      { label: 'Add Space', action: () => { input.value += ' '; handleInput(); } },
      { label: 'Clear', action: () => { input.value = ''; handleInput(); } }
    ];
    
    buttons.forEach(button => {
      const btnEl = document.createElement('button');
      btnEl.textContent = button.label;
      btnEl.style.cssText = 'padding: 5px 10px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;';
      btnEl.addEventListener('click', button.action);
      buttonsContainer.appendChild(btnEl);
    });
    
    // Add the buttons container after the input
    input.parentNode.appendChild(buttonsContainer);
    
    // Clean up
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keyup', handleInput);
      input.removeEventListener('change', handleInput);
    };
  }, []);
  
  return (
    <div style={{ 
      border: '2px solid blue', 
      padding: '20px', 
      borderRadius: '8px',
      margin: '20px 0',
      backgroundColor: '#f5f5f5'
    }}>
      <h3 style={{ marginTop: 0 }}>Direct DOM Input Test</h3>
      <p>This input bypasses React completely and works directly with the DOM:</p>
      
      <input ref={inputRef} type="text" placeholder="Type here to test..." />
      
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: 'white' }}>
        <p>Input value: <strong ref={outputRef}>(empty)</strong></p>
      </div>
    </div>
  );
}

export default function TestInputPage() {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [debugInfo, setDebugInfo] = useState({});
  
  // Standard React form handling
  const handleInput1Change = (e) => {
    e.stopPropagation(); // Stop event propagation
    setInput1(e.target.value);
  };
  
  const handleInput2Change = (e) => {
    e.stopPropagation(); // Stop event propagation
    setInput2(e.target.value);
  };
  
  // Debug information
  useEffect(() => {
    // Function to capture global events for debugging
    const debugHandler = (e) => {
      if (e.key && (e.type === 'keydown' || e.type === 'keypress')) {
        console.log(`[${e.type}] Key: ${e.key}, Target: ${e.target.tagName}#${e.target.id}`);
        
        setDebugInfo(prev => ({
          ...prev,
          lastKey: e.key,
          lastEvent: e.type,
          targetElement: `${e.target.tagName}#${e.target.id || 'no-id'}`,
          redirected: e.__redirected ? 'Yes' : 'No',
          timestamp: new Date().toLocaleTimeString()
        }));
      }
    };
    
    // Add global event listeners
    document.addEventListener('keydown', debugHandler, true);
    document.addEventListener('keypress', debugHandler, true);
    
    // Create direct DOM test
    const style = document.createElement('style');
    style.textContent = `
      /* Global fix for input fields in the test page */
      input, textarea, select {
        position: relative !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
        background-color: white !important;
      }
      
      /* Apply different styles to debug elements */
      .test-btn {
        padding: 8px 16px;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        margin: 4px;
        cursor: pointer;
      }
      
      .test-btn:hover {
        background-color: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', debugHandler, true);
      document.removeEventListener('keypress', debugHandler, true);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);
  
  return (
    <Box sx={{ 
      p: 4, 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      bgcolor: '#ffffff' // White background
    }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Input Field Test Page
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page tests different approaches to input field handling.
      </Typography>
      
      {/* Direct DOM manipulation test */}
      <DirectInputTest />
      
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          width: '100%', 
          maxWidth: 600, 
          mt: 4,
          position: 'relative',
          zIndex: 5 // Lower z-index than inputs
        }}
      >
        <Typography variant="h6">
          React State Input with stopPropagation
        </Typography>
        
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="react-input" style={{ display: 'block', marginBottom: '8px' }}>
            React Input (with stopPropagation):
          </label>
          <input
            id="react-input"
            type="text"
            value={input1}
            onChange={handleInput1Change}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
              position: 'relative',
              zIndex: 9999 // Very high z-index
            }}
            placeholder="Type here..."
          />
          <p>Current value: {input1 || '(empty)'}</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
            <button 
              onClick={() => setInput1(prev => prev + 'A')}
              className="test-btn"
            >
              Add "A"
            </button>
            <button 
              onClick={() => setInput1(prev => prev + 'B')}
              className="test-btn"
            >
              Add "B"
            </button>
            <button 
              onClick={() => setInput1(prev => prev + ' ')}
              className="test-btn"
            >
              Add Space
            </button>
            <button 
              onClick={() => setInput1('')}
              className="test-btn"
            >
              Clear
            </button>
          </div>
        </div>
        
        <Typography variant="h6" style={{ marginTop: '40px' }}>
          Material UI TextField
        </Typography>
        
        <TextField
          id="mui-input"
          label="Material UI Input"
          variant="outlined"
          fullWidth
          value={input2}
          onChange={handleInput2Change}
          placeholder="Type here..."
          sx={{ 
            mt: 2,
            '& .MuiInputBase-input': {
              position: 'relative',
              zIndex: 9999
            }
          }}
        />
        <p>Current value: {input2 || '(empty)'}</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
          <button 
            onClick={() => setInput2(prev => prev + 'A')}
            className="test-btn"
          >
            Add "A"
          </button>
          <button 
            onClick={() => setInput2(prev => prev + 'B')}
            className="test-btn"
          >
            Add "B"
          </button>
          <button 
            onClick={() => setInput2(prev => prev + ' ')}
            className="test-btn"
          >
            Add Space
          </button>
          <button 
            onClick={() => setInput2('')}
            className="test-btn"
          >
            Clear
          </button>
        </div>
      </Paper>
      
      <Paper 
        elevation={2}
        sx={{ 
          p: 3, 
          mt: 4, 
          width: '100%', 
          maxWidth: 600,
          bgcolor: '#fffde7'
        }}
      >
        <Typography variant="h6" gutterBottom>
          Debug Information:
        </Typography>
        <pre style={{ overflow: 'auto', maxHeight: '200px', backgroundColor: '#f5f5f5', padding: '10px' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
        
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => {
            console.log('--- EVENT ABSORBERS DETECTOR ---');
            
            // Find elements with pointer-events: none
            const elements = document.querySelectorAll('*');
            const pointerNoneElements = [];
            
            elements.forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.pointerEvents === 'none') {
                pointerNoneElements.push({
                  element: el,
                  tag: el.tagName,
                  id: el.id,
                  classes: el.className,
                });
              }
            });
            
            console.log('Elements with pointer-events: none:', pointerNoneElements.length);
            console.log(pointerNoneElements);
            console.log('--- END DETECTOR ---');
          }}
          sx={{ mt: 2 }}
        >
          Detect Event Absorbers
        </Button>
      </Paper>
    </Box>
  );
}