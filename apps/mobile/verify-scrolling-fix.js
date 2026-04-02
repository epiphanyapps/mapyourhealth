#!/usr/bin/env node

/**
 * Verification script for mobile scrolling fix
 * This script checks that the ContaminantTable component changes are correctly applied
 */

const fs = require('fs');
const path = require('path');

const CONTAMINANT_TABLE_PATH = path.join(__dirname, 'app/components/ContaminantTable.tsx');
const CATEGORY_DETAIL_SCREEN_PATH = path.join(__dirname, 'app/screens/CategoryDetailScreen.tsx');

function verifyContaminantTableFix() {
  console.log('🔍 Verifying ContaminantTable.tsx fixes...');
  
  const content = fs.readFileSync(CONTAMINANT_TABLE_PATH, 'utf8');
  
  // Check that overflow: "hidden" has been removed (check for the actual property, not comments)
  if (content.match(/overflow:\s*["']hidden["']/)) {
    console.log('❌ ERROR: overflow: "hidden" still present in ContaminantTable');
    return false;
  }
  
  // Check that minimum height has been added
  if (!content.includes('minHeight: 44')) {
    console.log('❌ ERROR: minHeight: 44 not found in ContaminantTable');
    return false;
  }
  
  // Check increased padding
  if (!content.includes('paddingVertical: 14') || !content.includes('paddingHorizontal: 10')) {
    console.log('❌ ERROR: Improved mobile padding not found in ContaminantTable');
    return false;
  }
  
  console.log('✅ ContaminantTable.tsx fixes verified successfully');
  return true;
}

function verifyCategoryDetailScreenFix() {
  console.log('🔍 Verifying CategoryDetailScreen.tsx fixes...');
  
  const content = fs.readFileSync(CATEGORY_DETAIL_SCREEN_PATH, 'utf8');
  
  // Check increased bottom padding
  if (!content.includes('paddingBottom: 48')) {
    console.log('❌ ERROR: paddingBottom: 48 not found in CategoryDetailScreen');
    return false;
  }
  
  // Check minHeight addition
  if (!content.includes('minHeight: "100%"')) {
    console.log('❌ ERROR: minHeight: "100%" not found in CategoryDetailScreen');
    return false;
  }
  
  console.log('✅ CategoryDetailScreen.tsx fixes verified successfully');
  return true;
}

function main() {
  console.log('🚀 Starting mobile scrolling fix verification...\n');
  
  let success = true;
  
  try {
    success &= verifyContaminantTableFix();
    success &= verifyCategoryDetailScreenFix();
    
    if (success) {
      console.log('\n🎉 All mobile scrolling fixes have been successfully applied!');
      console.log('📝 See test-scrolling-fix.md for testing instructions');
      process.exit(0);
    } else {
      console.log('\n💥 Some fixes are missing. Please review the code changes.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}