#!/usr/bin/env node

/**
 * Build script for Next.js static export with Tauri
 *
 * This script temporarily moves the API routes out of the app directory
 * during build, since they only work in development mode anyway.
 * Next.js 15 is stricter about API routes with static export.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const API_DIR = path.join(ROOT_DIR, 'src', 'app', 'api');
const API_BACKUP_DIR = path.join(ROOT_DIR, '.api-backup');
const NEXT_DIR = path.join(ROOT_DIR, '.next');
const OUT_DIR = path.join(ROOT_DIR, 'out');

function moveDir(src, dest) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${src} to ${dest}`);
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed ${dir}`);
  }
}

function main() {
  let buildSuccess = false;

  try {
    // Clean build directories to prevent stale references
    console.log('Cleaning build directories...');
    rmDir(NEXT_DIR);
    rmDir(OUT_DIR);

    // Move API directory out of app folder (to project root, hidden)
    console.log('Moving API routes out for static build...');
    moveDir(API_DIR, API_BACKUP_DIR);

    // Run the Next.js build
    console.log('Running Next.js build...');
    execSync('next build', { stdio: 'inherit' });
    buildSuccess = true;
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Always restore API directory
    console.log('Restoring API routes...');
    moveDir(API_BACKUP_DIR, API_DIR);

    if (buildSuccess) {
      console.log('Build completed successfully!');
    }
  }
}

main();
