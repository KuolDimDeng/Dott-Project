/**
 * Index file for Lambda function
 * This exports the handler from post-confirmation-trigger.js
 */

// Import the handler from the original file
const { handler } = require('./post-confirmation-trigger');

// Re-export the handler as the main module export
exports.handler = handler; 