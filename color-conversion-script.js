#!/usr/bin/env node

/**
 * Color Conversion Script
 * Converts orange colors to golden yellow across the entire Hermes application
 */

const fs = require('fs');
const path = require('path');

// Color mappings - Orange to Golden Yellow
const colorMappings = {
  // Orange colors to convert
  'bg-orange-500': 'bg-yellow-500',
  'bg-orange-600': 'bg-yellow-600', 
  'bg-orange-700': 'bg-yellow-700',
  'text-orange-600': 'text-yellow-600',
  'text-orange-700': 'text-yellow-700',
  'text-orange-500': 'text-yellow-500',
  'bg-orange-100': 'bg-yellow-100',
  'text-orange-400': 'text-yellow-400',
  'border-orange-200': 'border-yellow-200',
  'border-orange-300': 'border-yellow-300',
  
  // Golden yellow colors to use
  'bg-yellow-500': 'bg-yellow-500',
  'bg-yellow-600': 'bg-yellow-600',
  'bg-yellow-700': 'bg-yellow-700',
  'text-yellow-600': 'text-yellow-600',
  'text-yellow-700': 'text-yellow-700',
  'text-yellow-500': 'text-yellow-500',
  'bg-yellow-100': 'bg-yellow-100',
  'text-yellow-400': 'text-yellow-400',
  'border-yellow-200': 'border-yellow-200',
  'border-yellow-300': 'border-yellow-300',
};

// File patterns to process
const filePatterns = [
  '**/*.jsx',
  '**/*.js',
  '**/*.ts',
  '**/*.tsx'
];

// Directories to process
const directories = [
  'client/src/pages/Admin',
  'client/src/pages/Client',
  'client/src/components/admin',
  'client/src/components/admin/layout',
  'client/src/components/admin/ui'
];

let convertedFiles = 0;
let totalFiles = 0;

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let converted = content;
    
    // Apply all color conversions
    Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
      converted = converted.replace(new RegExp(oldColor, 'g'), newColor);
    });
    
    // Write back if changes were made
    if (content !== converted) {
      fs.writeFileSync(filePath, converted, 'utf8');
      console.log(`✅ Converted colors in: ${filePath}`);
      convertedFiles++;
    } else {
      console.log(`ℹ️  No orange colors found in: ${filePath}`);
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function findFiles(dir, pattern) {
  try {
    const files = fs.readdirSync(dir);
    return files.filter(file => pattern.test(file));
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error.message);
    return [];
  }
}

// Main conversion function
function convertColors() {
  console.log('🎨 Starting color conversion: Orange → Golden Yellow');
  console.log('📁 Target directories:', directories);
  
  directories.forEach(dir => {
    console.log(`\n📂 Processing: ${dir}`);
    
    // Find all relevant files
    const files = findFiles(dir, /\.(jsx|js|ts|tsx)$/);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      processFile(filePath);
    });
  });
  
  console.log(`\n✅ Color conversion completed!`);
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`🔄 Files converted: ${convertedFiles}`);
  console.log(`📈 Success rate: ${((convertedFiles / totalFiles) * 100).toFixed(1)}%`);
}

// Run the conversion
if (require.main === module) {
  convertColors();
} else {
  console.log('❌ This script should be run with: node color-conversion-script.js');
  process.exit(1);
}
