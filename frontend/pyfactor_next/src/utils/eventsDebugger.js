'use client';

/**
 * Events Debugger - A diagnostic tool to locate what's causing input issues
 * 
 * This file should ONLY be used temporarily for debugging, then removed.
 */

// Function to check for event absorbers
export function findEventAbsorbers() {
  if (typeof document === 'undefined') return;
  
  console.log('--- EVENT ABSORBERS DETECTOR ---');
  
  // 1. Detect elements with pointer-events: none
  const elements = document.querySelectorAll('*');
  
  // Store results
  const pointerNoneElements = [];
  const highZIndexElements = [];
  const absPositionedElements = [];
  const blockedInputs = [];
  
  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    
    // Check pointer-events
    if (style.pointerEvents === 'none') {
      pointerNoneElements.push({
        element: el,
        tag: el.tagName,
        id: el.id,
        classes: el.className,
        path: getElementPath(el)
      });
    }
    
    // Check z-index (high values)
    if (style.position !== 'static' && style.zIndex && parseInt(style.zIndex) > 10) {
      highZIndexElements.push({
        element: el,
        tag: el.tagName,
        id: el.id,
        classes: el.className,
        zIndex: style.zIndex,
        position: style.position,
        path: getElementPath(el)
      });
    }
    
    // Check for absolute/fixed positioned elements that cover significant area
    if (style.position === 'absolute' || style.position === 'fixed') {
      // Calculate approximate coverage
      const rect = el.getBoundingClientRect();
      const coverage = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);
      
      if (coverage > 0.1) { // More than 10% of viewport
        absPositionedElements.push({
          element: el,
          tag: el.tagName,
          id: el.id,
          classes: el.className,
          position: style.position,
          dimensions: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          coverage: Math.round(coverage * 100) + '%',
          path: getElementPath(el)
        });
      }
    }
  });
  
  // 2. Check if inputs are blocked
  document.querySelectorAll('input, textarea').forEach(input => {
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    // Get all elements at this point
    const elementsAtPoint = document.elementsFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    
    // If the input isn't the first or second element at its position, it's likely blocked
    const inputIndex = elementsAtPoint.indexOf(input);
    
    if (inputIndex > 1) {
      blockedInputs.push({
        input: input,
        path: getElementPath(input),
        blockedBy: elementsAtPoint.slice(0, inputIndex).map(el => ({
          tag: el.tagName,
          id: el.id,
          classes: el.className,
          path: getElementPath(el)
        }))
      });
    }
  });
  
  // Log findings
  console.log('Elements with pointer-events: none:', pointerNoneElements.length);
  console.log(pointerNoneElements);
  
  console.log('Elements with high z-index:', highZIndexElements.length);
  console.log(highZIndexElements);
  
  console.log('Large absolute/fixed positioned elements:', absPositionedElements.length);
  console.log(absPositionedElements);
  
  console.log('Potentially blocked inputs:', blockedInputs.length);
  console.log(blockedInputs);
  
  console.log('--- END DETECTOR ---');
  
  // Return findings
  return {
    pointerNoneElements,
    highZIndexElements,
    absPositionedElements,
    blockedInputs
  };
}

// Helper to get path to element
function getElementPath(el) {
  const path = [];
  let current = el;
  
  while (current && current !== document.body) {
    let identifier = current.tagName.toLowerCase();
    
    if (current.id) {
      identifier += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      identifier += `.${current.className.trim().replace(/\s+/g, '.')}`;
    }
    
    path.unshift(identifier);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

// Inject form and test input directly into the body
export function createDirectTestInput() {
  if (typeof document === 'undefined') return;
  
  // Create container
  const container = document.createElement('div');
  container.id = 'direct-test-input';
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Create form
  const form = document.createElement('form');
  form.style.cssText = `
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 500px;
  `;
  
  // Create heading
  const heading = document.createElement('h2');
  heading.textContent = 'Direct Test Input';
  heading.style.marginBottom = '20px';
  
  // Create input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type here to test input';
  input.style.cssText = `
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  `;
  
  // Create output display
  const output = document.createElement('div');
  output.style.cssText = `
    min-height: 20px;
    max-height: 100px;
    overflow-y: auto;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
  `;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background-color: #f44336;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 10px;
  `;
  
  // Create debug button
  const debugButton = document.createElement('button');
  debugButton.textContent = 'Run Diagnostics';
  debugButton.style.cssText = `
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  // Add event handlers
  input.addEventListener('input', function(e) {
    output.textContent = e.target.value;
  });
  
  closeButton.addEventListener('click', function() {
    document.body.removeChild(container);
  });
  
  debugButton.addEventListener('click', function() {
    findEventAbsorbers();
  });
  
  // Assemble components
  form.appendChild(heading);
  form.appendChild(input);
  form.appendChild(output);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.appendChild(closeButton);
  buttonContainer.appendChild(debugButton);
  
  form.appendChild(buttonContainer);
  container.appendChild(form);
  
  // Add to body
  document.body.appendChild(container);
  
  // Focus input
  setTimeout(() => {
    input.focus();
  }, 100);
}

// Create DIV overlay to detect clicks
export function createClickDetector() {
  if (typeof document === 'undefined') return;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'click-detector';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(255, 0, 0, 0.1);
    z-index: 99999;
    pointer-events: none;
  `;
  
  // Create info display
  const info = document.createElement('div');
  info.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background-color: white;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
    font-family: monospace;
    max-width: 400px;
    z-index: 100000;
  `;
  info.innerHTML = 'Click anywhere to detect event handlers';
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background-color: #f44336;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
  `;
  
  closeButton.addEventListener('click', function() {
    document.body.removeChild(overlay);
    document.body.removeChild(info);
  });
  
  // Add click handler to document
  const clickHandler = function(e) {
    const target = e.target;
    const elementInfo = {
      tag: target.tagName,
      id: target.id,
      classes: target.className,
      path: getElementPath(target)
    };
    
    info.innerHTML = `
      <div>Clicked element: ${elementInfo.tag}</div>
      <div>ID: ${elementInfo.id || 'none'}</div>
      <div>Classes: ${elementInfo.classes || 'none'}</div>
      <div>Path: ${elementInfo.path}</div>
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      background-color: #f44336;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
    `;
    
    closeBtn.addEventListener('click', function() {
      document.body.removeChild(overlay);
      document.body.removeChild(info);
      document.removeEventListener('click', clickHandler, true);
    });
    
    info.appendChild(closeBtn);
  };
  
  document.addEventListener('click', clickHandler, true);
  
  // Add to body
  document.body.appendChild(overlay);
  document.body.appendChild(info);
}

export default {
  findEventAbsorbers,
  createDirectTestInput,
  createClickDetector
};