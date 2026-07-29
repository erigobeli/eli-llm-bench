#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist', 'server');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Simple fix: replace from './X' with from './X.js'
  content = content.replace(/from ['"](\.[^'"]*?)['"](?!\.js['"])/g, "from '$1.js'");
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Process all JS files
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  processDirectory(distDir);
  console.log('Fixed imports in dist/server');
}
