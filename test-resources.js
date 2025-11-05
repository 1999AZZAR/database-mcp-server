#!/usr/bin/env node

// Simple test script for Project-Guardian resources
import { spawn } from 'child_process';

async function testProjectGuardianResources() {
  console.log('Testing Project-Guardian resources...');

  // Start the server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
  });

  // Send initialize request
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        resources: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait a bit then test resources
  setTimeout(() => {
    // Test list resources
    const listResourcesRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "resources/list",
      params: {}
    };

    server.stdin.write(JSON.stringify(listResourcesRequest) + '\n');

    // Wait for response
    setTimeout(() => {
      console.log('Response received:', responseBuffer.substring(0, 2000) + '...');

      // Clean up
      setTimeout(() => {
        server.kill();
        console.log('Test completed');
      }, 1000);
    }, 1000);
  }, 500);
}

testProjectGuardianResources().catch(console.error);
