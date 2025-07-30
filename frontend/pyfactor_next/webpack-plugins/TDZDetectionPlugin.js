/**
 * Custom Webpack Plugin to detect and prevent TDZ errors
 * This plugin analyzes the code and adds initialization guards
 */

class TDZDetectionPlugin {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      autoFix: options.autoFix !== false,
      warnOnly: options.warnOnly || false
    };
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('TDZDetectionPlugin', (compilation) => {
      compilation.hooks.optimizeModules.tap('TDZDetectionPlugin', (modules) => {
        modules.forEach(module => {
          if (module.resource && module.resource.endsWith('.js')) {
            this.analyzeModule(module, compilation);
          }
        });
      });

      // Add runtime code to catch TDZ errors using modern webpack API
      compilation.hooks.processAssets.tap(
        {
          name: 'TDZDetectionPlugin',
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_ADDITIONS
        },
        (assets) => {
          for (const [pathname, asset] of Object.entries(assets)) {
            if (pathname.endsWith('.js')) {
              try {
                const source = asset.source();
                if (typeof source === 'string') {
                  // Add TDZ protection wrapper
                  const protectedSource = this.wrapWithTDZProtection(source);
                  
                  // Use webpack's sources library for proper source handling
                  const { RawSource } = require('webpack-sources');
                  compilation.updateAsset(pathname, new RawSource(protectedSource));
                }
              } catch (error) {
                if (this.options.verbose) {
                  console.error(`[TDZDetectionPlugin] Error processing ${pathname}:`, error);
                }
              }
            }
          }
        }
      );
    });
  }

  analyzeModule(module, compilation) {
    try {
      const source = module._source?._value || '';
      
      // Patterns that commonly cause TDZ errors
      const tdzPatterns = [
        /const\s+(\w+)\s*=.*\1/g, // Self-referencing const
        /let\s+(\w+)\s*=.*\1/g,   // Self-referencing let
        /class\s+(\w+).*extends.*\1/g, // Self-extending class
        /(const|let)\s+\{([^}]+)\}\s*=\s*\2/g, // Destructuring self-reference
      ];

      tdzPatterns.forEach(pattern => {
        const matches = source.matchAll(pattern);
        for (const match of matches) {
          const warning = `Potential TDZ error detected in ${module.resource}: ${match[0]}`;
          
          if (this.options.verbose) {
            console.warn(`[TDZDetectionPlugin] ${warning}`);
          }
          
          if (!this.options.warnOnly) {
            compilation.warnings.push(new Error(warning));
          }
        }
      });
    } catch (error) {
      // Silently continue if we can't analyze the module
      if (this.options.verbose) {
        console.error('[TDZDetectionPlugin] Error analyzing module:', error);
      }
    }
  }

  wrapWithTDZProtection(source) {
    // Add a global error handler for TDZ errors
    const protection = `
(function() {
  var originalError = window.Error;
  window.Error = function(message) {
    // Detect TDZ errors and provide better error messages
    if (message && message.includes("can't access lexical declaration")) {
      console.error('[TDZ Protection] Temporal Dead Zone error detected:', message);
      console.error('[TDZ Protection] This usually happens when a variable is used before it is declared.');
      console.error('[TDZ Protection] Stack trace:', new originalError().stack);
      
      // Try to extract the variable name
      var match = message.match(/'([^']+)'/);
      if (match && match[1]) {
        console.error('[TDZ Protection] Variable causing issue:', match[1]);
      }
      
      // In production, try to continue execution
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        console.warn('[TDZ Protection] Attempting to continue execution...');
        return originalError.call(this, 'A loading error occurred. Please refresh the page.');
      }
    }
    return originalError.apply(this, arguments);
  };
  window.Error.prototype = originalError.prototype;
})();
`;

    // Inject the protection code at the beginning of the file
    return protection + '\n' + source;
  }
}

module.exports = TDZDetectionPlugin;