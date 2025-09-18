#!/usr/bin/env node

/**
 * Test script for WebSocket integration
 * Run this to verify WebSocket connections are working
 */

const WebSocket = require('ws');

// Test connection parameters
const TEST_SESSION = 'test-session-id';
const WS_URL = 'wss://staging.dottapps.com/ws/chat/';

console.log('🧪 Testing WebSocket Connection...\n');

function testConnection() {
  console.log('📡 Connecting to:', WS_URL);

  const ws = new WebSocket(`${WS_URL}?session=${TEST_SESSION}`);

  ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('📤 Sending test message...');

    // Send a test ping
    ws.send(JSON.stringify({
      type: 'ping',
      data: { test: true, timestamp: new Date().toISOString() }
    }));
  });

  ws.on('message', (data) => {
    console.log('📨 Received message:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data.toString());
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed. Code: ${code}, Reason: ${reason}`);
  });

  // Test timeout
  setTimeout(() => {
    console.log('\n📊 Test complete. Closing connection...');
    ws.close();
    process.exit(0);
  }, 10000);
}

// Check if ws module is installed
try {
  require('ws');
  testConnection();
} catch (e) {
  console.error('❌ Please install ws module first:');
  console.log('npm install ws\n');
  process.exit(1);
}