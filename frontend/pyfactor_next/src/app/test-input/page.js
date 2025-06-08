'use client';


import React, { useState, useRef, useEffect } from 'react';

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
    <div className="border-2 border-blue-500 p-5 rounded-lg my-5 bg-gray-100">
      <h3 className="mt-0 text-lg font-semibold">Direct DOM Input Test</h3>
      <p>This input bypasses React completely and works directly with the DOM:</p>
      
      <input ref={inputRef} type="text" placeholder="Type here to test..." />
      
      <div className="mt-5 p-3 border border-gray-300 bg-white">
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
    <div className="p-8 min-h-screen flex flex-col items-center bg-white">
      <h1 className="text-2xl font-bold mb-4">
        Input Field Test Page
      </h1>
      
      <p className="text-gray-700 mb-6">
        This page tests different approaches to input field handling.
      </p>
      
      {/* Direct DOM manipulation test */}
      <DirectInputTest />
      
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-2xl mt-6 relative z-10">
        <h2 className="text-xl font-semibold mb-4">
          React State Input with stopPropagation
        </h2>
        
        <div className="mb-6">
          <label htmlFor="react-input" className="block mb-2 text-gray-700">
            React Input (with stopPropagation):
          </label>
          <input
            id="react-input"
            type="text"
            value={input1}
            onChange={handleInput1Change}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-base relative z-50"
            style={{ zIndex: 9999 }}
            placeholder="Type here..."
          />
          <p className="mt-2">Current value: {input1 || '(empty)'}</p>
          
          <div className="flex flex-wrap gap-2 mt-3">
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
        
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Tailwind Input
        </h2>
        
        <div className="mb-4">
          <label htmlFor="tailwind-input" className="block text-sm font-medium text-gray-700 mb-1">
            Tailwind Input
          </label>
          <input
            id="tailwind-input"
            type="text"
            value={input2}
            onChange={handleInput2Change}
            placeholder="Type here..."
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            style={{ position: 'relative', zIndex: 9999 }}
          />
        </div>
        <p className="mt-2">Current value: {input2 || '(empty)'}</p>
        
        <div className="flex flex-wrap gap-2 mt-3">
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
      </div>
      
      <div className="bg-amber-50 shadow rounded-lg p-6 mt-8 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">
          Debug Information:
        </h2>
        <pre className="overflow-auto max-h-48 bg-gray-100 p-3 rounded">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
        
        <button 
          className="mt-4 px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 transition-colors"
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
        >
          Detect Event Absorbers
        </button>
      </div>
    </div>
  );
}