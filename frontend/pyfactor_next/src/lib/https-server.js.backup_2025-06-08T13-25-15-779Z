/**
 * HTTPS Server Configuration Utility
 * 
 * This module provides functions to configure an Express/Node.js server with HTTPS
 * using SSL certificates. It reads certificates from environment variables or
 * specified paths.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

/**
 * Get SSL certificate options from environment or specified paths
 * @param {Object} options Optional configuration options
 * @param {string} options.certPath Path to certificate file
 * @param {string} options.keyPath Path to key file
 * @returns {Object} SSL options for https.createServer
 */
function getHttpsOptions(options = {}) {
  // Check environment variables first (set by start-https-server.js)
  const certPath = process.env.SSL_CRT_FILE || options.certPath;
  const keyPath = process.env.SSL_KEY_FILE || options.keyPath;
  
  if (!certPath || !keyPath) {
    throw new Error('SSL certificate paths not provided. Set SSL_CRT_FILE and SSL_KEY_FILE environment variables or provide them in options.');
  }
  
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(`SSL certificate files not found at ${certPath} or ${keyPath}`);
  }
  
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

/**
 * Create an HTTPS server with the given Express app
 * @param {Object} app Express app instance
 * @param {Object} options SSL options
 * @returns {https.Server} HTTPS server instance
 */
function createHttpsServer(app, options = {}) {
  const httpsOptions = getHttpsOptions(options);
  return https.createServer(httpsOptions, app);
}

/**
 * Configure your Express app to use HTTPS when the HTTPS environment variable is set
 * @param {Object} app Express app instance
 * @param {number} port Port to listen on
 * @param {Function} callback Callback function to run when server starts
 * @returns {Object} Server instance (HTTP or HTTPS)
 */
function setupServer(app, port, callback) {
  if (process.env.HTTPS === 'true') {
    try {
      console.log('Starting server with HTTPS support...');
      const httpsOptions = getHttpsOptions();
      const server = https.createServer(httpsOptions, app);
      return server.listen(port, () => {
        console.log(`HTTPS server running on port ${port}`);
        if (callback) callback();
      });
    } catch (error) {
      console.error('Failed to start HTTPS server:', error.message);
      console.log('Falling back to HTTP server...');
      return app.listen(port, () => {
        console.log(`HTTP server running on port ${port}`);
        if (callback) callback();
      });
    }
  } else {
    return app.listen(port, () => {
      console.log(`HTTP server running on port ${port}`);
      if (callback) callback();
    });
  }
}

module.exports = {
  getHttpsOptions,
  createHttpsServer,
  setupServer
}; 