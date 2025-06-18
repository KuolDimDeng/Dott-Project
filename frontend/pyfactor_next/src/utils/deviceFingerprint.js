/**
 * Device Fingerprinting Utility
 * Collects device information for enhanced security
 */

class DeviceFingerprint {
  constructor() {
    this.fingerprint = null;
    this.components = {};
  }

  /**
   * Collect all device fingerprint components
   * @returns {Promise<Object>} Device fingerprint data
   */
  async collect() {
    try {
      // Collect basic browser info
      this.components.userAgent = navigator.userAgent;
      this.components.language = navigator.language || navigator.userLanguage;
      this.components.platform = navigator.platform;
      this.components.hardwareConcurrency = navigator.hardwareConcurrency || 0;
      this.components.deviceMemory = navigator.deviceMemory || 0;

      // Screen information
      this.components.screenResolution = `${screen.width}x${screen.height}`;
      this.components.screenColorDepth = screen.colorDepth;
      this.components.pixelRatio = window.devicePixelRatio || 1;

      // Timezone
      this.components.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.components.timezoneOffset = new Date().getTimezoneOffset();

      // WebGL information
      const webglInfo = this.getWebGLInfo();
      this.components.webglVendor = webglInfo.vendor;
      this.components.webglRenderer = webglInfo.renderer;

      // Canvas fingerprint
      this.components.canvasFingerprint = await this.getCanvasFingerprint();

      // Audio fingerprint (if supported)
      this.components.audioFingerprint = await this.getAudioFingerprint();

      // Font detection
      this.components.fonts = this.detectFonts();

      // Plugin information (limited in modern browsers)
      this.components.plugins = this.getPlugins();

      // Touch support
      this.components.touchSupport = this.getTouchSupport();

      // Storage availability
      this.components.localStorage = this.isStorageAvailable('localStorage');
      this.components.sessionStorage = this.isStorageAvailable('sessionStorage');
      this.components.cookiesEnabled = navigator.cookieEnabled;

      // Generate fingerprint hash
      this.fingerprint = await this.generateHash();

      return {
        fingerprint: this.fingerprint,
        ...this.components
      };
    } catch (error) {
      console.error('Error collecting device fingerprint:', error);
      // Return minimal fingerprint on error
      return {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
      };
    }
  }

  /**
   * Get WebGL vendor and renderer information
   */
  getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return { vendor: 'unknown', renderer: 'unknown' };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown',
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown'
        };
      }

      return {
        vendor: gl.getParameter(gl.VENDOR) || 'unknown',
        renderer: gl.getParameter(gl.RENDERER) || 'unknown'
      };
    } catch (e) {
      return { vendor: 'unknown', renderer: 'unknown' };
    }
  }

  /**
   * Generate canvas fingerprint
   */
  async getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 280;
      canvas.height = 60;

      // Draw text with various styles
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      
      ctx.fillStyle = '#069';
      ctx.font = '11pt Arial';
      ctx.fillText('Canvas fingerprint \u{1F60E}', 2, 15);
      
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18pt Arial';
      ctx.fillText('BrowserLeaks.com', 4, 45);

      // Add some geometric shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      // Convert to data URL and hash
      const dataURL = canvas.toDataURL();
      return await this.hashString(dataURL);
    } catch (e) {
      return 'canvas_not_available';
    }
  }

  /**
   * Generate audio fingerprint
   */
  async getAudioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return 'audio_not_available';
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      let fingerprint = '';
      
      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = (event) => {
          const output = event.inputBuffer.getChannelData(0);
          const slice = output.slice(0, 100);
          fingerprint = slice.toString();
          
          oscillator.disconnect();
          analyser.disconnect();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          context.close();
          
          resolve(this.hashString(fingerprint));
        };

        oscillator.start(0);
      });
    } catch (e) {
      return 'audio_not_available';
    }
  }

  /**
   * Detect available fonts
   */
  detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 
      'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    
    const baseFontWidths = {};
    
    // Get base font widths
    baseFonts.forEach(baseFont => {
      ctx.font = `${testSize} ${baseFont}`;
      baseFontWidths[baseFont] = ctx.measureText(testString).width;
    });

    // Test each font
    const detectedFonts = [];
    testFonts.forEach(font => {
      for (let baseFont of baseFonts) {
        ctx.font = `${testSize} ${font}, ${baseFont}`;
        const width = ctx.measureText(testString).width;
        
        if (width !== baseFontWidths[baseFont]) {
          detectedFonts.push(font);
          break;
        }
      }
    });

    return detectedFonts.join(',');
  }

  /**
   * Get plugin information
   */
  getPlugins() {
    try {
      const plugins = [];
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name);
      }
      return plugins.join(',');
    } catch (e) {
      return 'plugins_not_available';
    }
  }

  /**
   * Get touch support information
   */
  getTouchSupport() {
    const maxTouchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
    const touchEvent = 'ontouchstart' in window;
    const touchPoints = maxTouchPoints;
    
    return {
      maxTouchPoints,
      touchEvent,
      touchPoints
    };
  }

  /**
   * Check storage availability
   */
  isStorageAvailable(type) {
    try {
      const storage = window[type];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate SHA-256 hash
   */
  async hashString(str) {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate overall fingerprint hash
   */
  async generateHash() {
    const fingerprintString = JSON.stringify(this.components);
    return await this.hashString(fingerprintString);
  }

  /**
   * Get minimal fingerprint for fast collection
   */
  getMinimal() {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled
    };
  }
}

// Create singleton instance
const deviceFingerprint = new DeviceFingerprint();

// Export for use in components
export default deviceFingerprint;

// Also export as a hook for React components
export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const collectFingerprint = async () => {
      setLoading(true);
      try {
        const data = await deviceFingerprint.collect();
        setFingerprint(data);
      } catch (error) {
        console.error('Failed to collect fingerprint:', error);
        setFingerprint(deviceFingerprint.getMinimal());
      }
      setLoading(false);
    };

    collectFingerprint();
  }, []);

  return { fingerprint, loading };
};