#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('Building frontend...');
try {
  execSync('vite build --mode production', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Frontend build failed');
  process.exit(1);
}

console.log('Building server...');
try {
  execSync('tsc --project tsconfig.server.json --outDir ./dist/server --rootDir ./src/server', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Server build failed');
  process.exit(1);
}

console.log('Build completed successfully');
