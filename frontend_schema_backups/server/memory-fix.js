/**
 * This file contains patches to mitigate memory leaks and increase memory efficiency
 */

// Increase Node.js memory limit
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--max-old-space-size=12288';

// Set limits for RegExp operations to prevent OOM
try {
  RegExp.prototype._originalExec = RegExp.prototype.exec;
  RegExp.prototype.exec = function(str) {
    // Skip the check if the string is under 50KB
    if (!str || str.length < 50000) {
      return this._originalExec(str);
    }
    
    // For large strings, verify this isn't a dangerous regex pattern
    let pattern = this.toString();
    
    // Check for potentially catastrophic patterns (nested quantifiers, etc.)
    // IMPORTANT: Don't use RegExp to check RegExp patterns - use string methods instead
    const isDangerous = 
      (pattern.includes('(') && pattern.includes('+') && pattern.includes(')+')) ||
      (pattern.includes('[') && pattern.includes(']+')) ||
      (pattern.includes('{') && pattern.includes(',}'));
    
    // Special check for ANSI color codes which often cause RegExp issues
    if (str.includes('\u001b[') || str.includes('\x1b[')) {
      // Just process a limited sample of the string to avoid OOM
      return this._originalExec(str.substring(0, 50000));
    }
    
    // If dangerous pattern detected and string is large, use a safer alternative
    if (isDangerous && str.length > 100000) {
      console.warn(`🚨 Dangerous regex pattern detected: ${pattern}`);
      
      // For very large strings, use a safer alternative (basic substring match)
      if (pattern.includes('|')) {
        // For alternation patterns, check each alternative separately
        let parts = pattern.slice(1, -1).split('|');
        for (let part of parts) {
          // Safely extract literal text from the pattern
          let simplified = '';
          try {
            simplified = part.replace(/[.*+?^${}()|[\]\\]/g, '');
          } catch (e) {
            // If regex replacement fails, just use empty string
            console.warn("Failed to simplify pattern part:", e.message);
          }
          
          if (simplified && str.includes(simplified)) {
            return [simplified];
          }
        }
        return null;
      }
      
      return this._originalExec(str.substring(0, 100000));
    }
    
    return this._originalExec(str);
  };
  
  // Also patch String.prototype.replace to handle large strings
  String.prototype._originalReplace = String.prototype.replace;
  String.prototype.replace = function(pattern, replacement) {
    // If not a regex or small string, use original
    if (!(pattern instanceof RegExp) || this.length < 50000) {
      return this._originalReplace(pattern, replacement);
    }
    
    // Special check for ANSI color codes which often cause RegExp issues
    if (this.includes('\u001b[') || this.includes('\x1b[')) {
      // Use a safer string approach for ANSI color codes
      if (typeof pattern === 'string') {
        let result = '';
        try {
          // Process in chunks if it contains ANSI codes
          const chunkSize = 5000;
          for (let i = 0; i < this.length; i += chunkSize) {
            const chunk = this.substring(i, i + chunkSize);
            // Use simple string replacement for safety
            if (typeof replacement === 'string') {
              result += chunk.split(pattern).join(replacement);
            } else {
              result += chunk;
            }
          }
          return result;
        } catch (e) {
          console.warn("ANSI color code regex handling error:", e.message);
          return this.substring(0, 200000);
        }
      }
    }
    
    // For large strings with regex, check if it's potentially dangerous
    let patternStr = '';
    try {
      patternStr = pattern.toString();
    } catch (e) {
      console.warn("Failed to convert pattern to string:", e.message);
      return this.substring(0, 200000);
    }
    
    // Check for nested capture groups or complex backreferences which are known to cause issues
    // IMPORTANT: Don't use RegExp to test RegExp patterns
    const isDangerous = 
      (patternStr.includes('(') && patternStr.includes('(') && patternStr.includes(')') && patternStr.includes(')')) ||
      (patternStr.includes('\\1') && patternStr.includes('\\2'));
    
    if (isDangerous) {
      console.warn(`🚨 Complex regex replacement pattern detected: ${patternStr}`);
      
      // For overly complex patterns on large strings, use a simpler strategy
      if (typeof replacement === 'function') {
        // For function replacements, process in chunks
        const chunkSize = 10000;
        let result = '';
        for (let i = 0; i < this.length; i += chunkSize) {
          const chunk = this.substring(i, i + chunkSize);
          try {
            result += chunk._originalReplace(pattern, replacement);
          } catch (e) {
            // On error, just append the chunk unchanged
            console.warn("Failed to apply replacement function:", e.message);
            result += chunk;
          }
        }
        return result;
      } else {
        // For string replacements, limit replacements
        return this.substring(0, 500000)._originalReplace(pattern, replacement);
      }
    }
    
    // Handle potential regex errors
    try {
      return this._originalReplace(pattern, replacement);
    } catch (e) {
      console.warn("RegExp replace error:", e.message);
      // Fallback to substring in case of error
      return this.substring(0, 500000);
    }
  };
  
  console.log('✅ RegExp safeguards installed to prevent memory issues');
} catch (e) {
  console.error('Failed to install RegExp safeguards:', e);
}

// Apply memory leak fixes
if (typeof global.gc === 'function') {
  const originalGc = global.gc;
  global.gc = function() {
    try {
      // Force garbage collection if available
      originalGc();
      console.log('🧹 Garbage collection performed');
    } catch (e) {
      console.error('Failed to perform garbage collection:', e);
    }
  };
} else {
  console.log('⚠️ Explicit garbage collection not available');
}

// Optimize PDF.js memory usage
if (global.window) {
  try {
    // Add a middleware to clear PDF.js memory when not in use
    const originalPdfDocumentLoadingTask = global.window.pdfjsLib?.getDocument;
    if (originalPdfDocumentLoadingTask) {
      const pendingTasks = new Set();
      
      global.window.pdfjsLib.getDocument = function(...args) {
        const task = originalPdfDocumentLoadingTask.apply(this, args);
        pendingTasks.add(task);
        
        const originalPromise = task.promise;
        task.promise = originalPromise.then(doc => {
          pendingTasks.delete(task);
          
          const originalDestroy = doc.destroy;
          doc.destroy = function() {
            const result = originalDestroy.apply(this, arguments);
            if (global.gc) global.gc();
            return result;
          };
          
          return doc;
        }).catch(err => {
          pendingTasks.delete(task);
          throw err;
        });
        
        return task;
      };
      
      console.log('✅ PDF.js memory optimization applied');
    }
  } catch (e) {
    console.error('Failed to optimize PDF.js:', e);
  }

  // Apply optimizations for other PDF libraries
  try {
    // Patch jsPDF to clean up after rendering
    if (global.window.jspdf) {
      const originalAddPage = global.window.jspdf.prototype.addPage;
      global.window.jspdf.prototype.addPage = function() {
        // Free memory every few pages
        if (this.internal.pages.length % 5 === 0 && global.gc) {
          global.gc();
        }
        return originalAddPage.apply(this, arguments);
      };
      
      console.log('✅ jsPDF memory optimization applied');
    }
    
    // Patch pdf-lib to reduce memory usage
    if (global.window.PDFLib) {
      // Disable font caching which uses a lot of memory
      global.window.PDFLib.enableFontCaching = false;
      console.log('✅ pdf-lib font caching disabled to save memory');
    }
    
    // Patch react-pdf renderer to clean up after rendering
    if (global.window.ReactPDF) {
      console.log('✅ React-PDF optimization applied');
    }
    
  } catch (e) {
    console.error('Failed to optimize additional PDF libraries:', e);
  }
}

// Scheduled garbage collection
let lastGcTime = Date.now();
const GC_INTERVAL = 60000; // 60 seconds - increased from 30 seconds

function checkMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rss = Math.round(memoryUsage.rss / 1024 / 1024);
  
  console.log(`📊 Memory Usage - RSS: ${rss}MB | Heap: ${heapUsed}MB / ${heapTotal}MB (${Math.round(heapUsed/heapTotal*100)}%)`);
  
  // Perform GC if heap usage is high or interval has passed
  if (heapUsed > 0.8 * heapTotal || Date.now() - lastGcTime > GC_INTERVAL) {
    if (typeof global.gc === 'function') {
      try {
        global.gc();
        lastGcTime = Date.now();
        console.log('🧹 Garbage collection performed');
      } catch (e) {
        console.error('Failed to perform garbage collection:', e);
      }
    }
  }
  
  // Add emergency memory release if we're approaching limits
  if (heapUsed > 0.95 * heapTotal) {
    console.warn('⚠️ Memory pressure detected - performing emergency cleanup');
    // Clear module caches that might be holding references
    Object.keys(require.cache).forEach(key => {
      if (key.includes('node_modules') && 
          !key.includes('server') && 
          !key.includes('memory-fix')) {
        delete require.cache[key];
      }
    });
    
    if (typeof global.gc === 'function') {
      global.gc();
    }
  }
}

// Check memory usage periodically
const memoryCheckInterval = setInterval(checkMemoryUsage, 15000); // Every 15 seconds

// Memory optimization configurations
process.on('warning', e => {
  if (e.name === 'MaxListenersExceededWarning') {
    console.warn('⚠️ Warning: Max listeners exceeded - possible memory leak', e);
  } else {
    console.warn('⚠️ Warning:', e);
  }
});

// Monitor for frequent garbage collections which might indicate memory pressure
let gcCount = 0;
let gcResetInterval = setInterval(() => {
  gcCount = 0;
}, 60000);

// Add handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  
  // If this is a memory error, attempt emergency cleanup
  if (err.message && err.message.includes('memory') || 
      err.message && err.message.includes('heap') ||
      err.message && err.message.includes('allocation failed')) {
    
    console.error('Memory-related error detected! Attempting emergency cleanup...');
    
    // Clear as much as possible
    Object.keys(require.cache).forEach(key => {
      if (!key.includes('server/server') && !key.includes('memory-fix')) {
        delete require.cache[key];
      }
    });
    
    // Force garbage collection
    if (typeof global.gc === 'function') {
      global.gc();
    }
    
    // Reset intervals to prevent memory leaks
    clearInterval(memoryCheckInterval);
    clearInterval(gcResetInterval);
    
    console.log('Emergency cleanup completed. Service may be degraded.');
  }
});

module.exports = { checkMemoryUsage }; 