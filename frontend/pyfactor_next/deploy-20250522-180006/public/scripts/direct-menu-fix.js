/**
 * Direct Menu Fix - Force visibility of menu items text
 * 
 * This script uses pure CSS overrides and DOM manipulation to force
 * menu items text to be visible regardless of component props or settings.
 */

(function() {
  console.log('[DirectMenuFix] Initializing direct menu visibility fix');
  
  // Create a style element with extremely high specificity selectors
  const style = document.createElement('style');
  style.id = 'direct-menu-fix-styles';
  
  // CSS with !important and high specificity to override everything
  style.textContent = `
    /* Target menu container */
    body #main-menu-container,
    body div[id="main-menu-container"],
    body [data-testid="main-menu-container"],
    body nav[aria-label="Main Navigation"] {
      width: 260px !important;
      min-width: 260px !important;
    }
    
    /* Force all menu items to show text */
    body #main-menu-container li,
    body #main-menu-container button,
    body div[id="main-menu-container"] li,
    body div[id="main-menu-container"] button,
    body [data-testid="main-menu-container"] li,
    body [data-testid="main-menu-container"] button,
    body nav[aria-label="Main Navigation"] li,
    body nav[aria-label="Main Navigation"] button {
      justify-content: flex-start !important;
      text-align: left !important;
      padding-left: 16px !important;
      padding-right: 16px !important;
      width: 100% !important;
    }
    
    /* Force drawer to be correct width */
    body .MuiDrawer-root,
    body .MuiDrawer-paper,
    body div[class*="MuiDrawer-paper"],
    body aside[class*="MuiDrawer"] {
      width: 260px !important;
      min-width: 260px !important;
    }
    
    /* Force all text spans to be visible */
    body #main-menu-container span + span,
    body #main-menu-container button span + span,
    body div[id="main-menu-container"] span + span,
    body div[id="main-menu-container"] button span + span,
    body nav[aria-label="Main Navigation"] span + span,
    body nav[aria-label="Main Navigation"] button span + span,
    body [data-testid="main-menu-container"] span + span,
    body [data-testid="main-menu-container"] button span + span {
      display: inline-block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: static !important;
      color: #1f2937 !important;
      font-weight: 500 !important;
      margin-left: 12px !important;
      width: auto !important;
    }
    
    /* Ensure correct spacing for icon spans */
    body #main-menu-container span:first-child,
    body div[id="main-menu-container"] span:first-child,
    body nav[aria-label="Main Navigation"] span:first-child,
    body [data-testid="main-menu-container"] span:first-child {
      margin-right: 12px !important;
    }
    
    /* Force icons to be visible too */
    body #main-menu-container svg,
    body div[id="main-menu-container"] svg,
    body nav[aria-label="Main Navigation"] svg,
    body [data-testid="main-menu-container"] svg {
      display: inline-block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  `;
  
  // Add style to head
  document.head.appendChild(style);
  console.log('[DirectMenuFix] Applied CSS overrides');
  
  // Function to directly manipulate DOM elements
  function forceMenuVisibility() {
    console.log('[DirectMenuFix] Applying direct DOM fixes');
    
    // Find menu container
    const menuContainer = document.getElementById('main-menu-container') ||
                         document.querySelector('nav[aria-label="Main Navigation"]') ||
                         document.querySelector('[data-testid="main-menu-container"]');
    
    if (!menuContainer) {
      console.log('[DirectMenuFix] Menu container not found, will try again later');
      return false;
    }
    
    // Find all buttons in menu
    const buttons = menuContainer.querySelectorAll('button');
    console.log(`[DirectMenuFix] Found ${buttons.length} menu buttons to fix`);
    
    // Apply styles to each button
    buttons.forEach((button, index) => {
      // Fix button layout
      button.style.display = 'flex';
      button.style.justifyContent = 'flex-start';
      button.style.alignItems = 'center';
      button.style.textAlign = 'left';
      button.style.paddingLeft = '16px';
      button.style.paddingRight = '16px';
      button.style.width = '100%';
      
      // Get all spans in the button
      const spans = button.querySelectorAll('span');
      if (spans.length >= 2) {
        // First span is usually the icon
        const iconSpan = spans[0];
        iconSpan.style.marginRight = '12px';
        
        // Second span is usually the text
        const textSpan = spans[1];
        textSpan.style.display = 'inline-block';
        textSpan.style.visibility = 'visible';
        textSpan.style.opacity = '1';
        textSpan.style.position = 'static';
        textSpan.style.color = '#1f2937';
        textSpan.style.fontWeight = '500';
        
        // Check if text is empty or missing and add it if needed
        if (!textSpan.textContent.trim()) {
          // Determine text based on index or icon
          let menuText = '';
          const iconElement = iconSpan.querySelector('svg');
          const iconClass = iconElement ? iconElement.className.baseVal : '';
          
          // Guess menu item text based on index and icon class
          if (index === 0 || iconClass.includes('dashboard')) menuText = 'Dashboard';
          else if (index === 1 || iconClass.includes('list')) menuText = 'Main Menu';
          else if (index === 2 || iconClass.includes('people')) menuText = 'Customers';
          else if (index === 3 || iconClass.includes('description')) menuText = 'Invoices';
          else if (index === 4 || iconClass.includes('inventory')) menuText = 'Products';
          else if (index === 5 || iconClass.includes('payment')) menuText = 'Payments';
          else if (index === 6 || iconClass.includes('settings')) menuText = 'Settings';
          else menuText = `Menu Item ${index+1}`;
          
          textSpan.textContent = menuText;
        }
      }
      // If no spans are found, inject content into button
      else if (spans.length === 0 || spans.length === 1) {
        // Create text span
        const textSpan = document.createElement('span');
        textSpan.textContent = `Menu Item ${index+1}`;
        textSpan.style.display = 'inline-block';
        textSpan.style.visibility = 'visible';
        textSpan.style.opacity = '1';
        textSpan.style.color = '#1f2937';
        textSpan.style.fontWeight = '500';
        textSpan.style.marginLeft = '12px';
        
        // Add to button
        button.appendChild(textSpan);
      }
    });
    
    return true;
  }
  
  // Apply fix immediately and multiple times to ensure it works
  forceMenuVisibility();
  
  // Set up interval to keep applying fix
  let fixAttempts = 0;
  const fixInterval = setInterval(() => {
    console.log(`[DirectMenuFix] Attempt #${fixAttempts + 1} to fix menu visibility`);
    const result = forceMenuVisibility();
    
    fixAttempts++;
    // Stop after many successful attempts or max tries
    if ((result && fixAttempts > 5) || fixAttempts >= 20) {
      clearInterval(fixInterval);
      console.log('[DirectMenuFix] Completed menu visibility fixes');
    }
  }, 1000);
  
  // Listen for DOM changes to reapply fixes
  const observer = new MutationObserver(() => {
    console.log('[DirectMenuFix] DOM changed, reapplying fixes');
    forceMenuVisibility();
  });
  
  // Start observing DOM changes
  setTimeout(() => {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    console.log('[DirectMenuFix] Started DOM change observer');
  }, 2000);
  
  // Clean up observer after 60 seconds
  setTimeout(() => {
    observer.disconnect();
    console.log('[DirectMenuFix] Stopped DOM change observer');
  }, 60000);
  
  // Export a global function to manually trigger the fix
  window.forceMenuVisibility = forceMenuVisibility;
  console.log('[DirectMenuFix] Ready - use window.forceMenuVisibility() to manually trigger fix');
})(); 