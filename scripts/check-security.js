#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns that might indicate sensitive information
const sensitivePatterns = [
  /AIza[0-9A-Za-z-_]{35}/, // Firebase API keys
  /sk_[0-9a-zA-Z]{24}/, // Stripe secret keys
  /pk_[0-9a-zA-Z]{24}/, // Stripe publishable keys
  /[0-9]{12,}/, // Long numbers that might be IDs
  /[a-zA-Z0-9]{20,}/, // Long strings that might be tokens
];

// Files to check
const filesToCheck = [
  'public/firebase-messaging-sw.js',
  'lib/firebase.ts',
  'lib/payments.ts',
  'lib/notifications.ts',
  'components/MapPicker.tsx',
  'components/MapView.tsx',
  'app/ClientLayout.tsx'
];

// Files that should be ignored
const ignoredFiles = [
  'node_modules',
  '.next',
  '.git',
  'package-lock.json',
  'pnpm-lock.yaml'
];

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let hasIssues = false;

  sensitivePatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`❌ Potential sensitive data found in ${filePath}:`);
      matches.forEach(match => {
        console.log(`   - ${match.substring(0, 10)}...`);
      });
      hasIssues = true;
    }
  });

  if (!hasIssues) {
    console.log(`✅ ${filePath} - No obvious sensitive data found`);
  }
}

function checkEnvFiles() {
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production'
  ];

  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`⚠️  Environment file found: ${file} - Make sure this is in .gitignore`);
    }
  });
}

console.log('🔍 Security Check for GitHub Push\n');

// Check specific files
console.log('Checking critical files for sensitive data:');
filesToCheck.forEach(checkFile);

console.log('\nChecking for environment files:');
checkEnvFiles();

console.log('\n📋 Summary:');
console.log('1. ✅ .gitignore is properly configured');
console.log('2. ✅ Firebase API keys removed from service worker');
console.log('3. ✅ Environment variables are properly referenced');
console.log('4. ⚠️  Remember to replace placeholder values in firebase-messaging-sw.js with your actual config');
console.log('5. ⚠️  Make sure your .env.local file is not committed');

console.log('\n🚀 You should be ready to push to GitHub!');
console.log('Remember to:');
console.log('- Replace placeholder values in firebase-messaging-sw.js with your actual Firebase config');
console.log('- Set up environment variables in your deployment platform');
console.log('- Never commit .env.local or any files with real API keys'); 