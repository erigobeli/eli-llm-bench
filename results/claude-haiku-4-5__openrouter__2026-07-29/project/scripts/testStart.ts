#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Start the server
const server = spawn('node', ['dist/server/index.js'], {
  cwd: projectRoot,
  stdio: 'pipe'
});

let started = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Server running at http://localhost:3000')) {
    started = true;
  }
});

server.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Wait for server to start
setTimeout(() => {
  if (started) {
    console.log('✓ Server started successfully');
    process.exit(0);
  } else {
    console.error('✗ Server failed to start');
    process.exit(1);
  }
  server.kill();
}, 5000);

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
