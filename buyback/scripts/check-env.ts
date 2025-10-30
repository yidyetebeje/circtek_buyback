#!/usr/bin/env node

/**
 * This script checks if the required NextAuth environment variables are set.
 * Run with: npx tsx scripts/check-env.ts
 */

function checkEnv() {
  const requiredVars = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'NEXT_PUBLIC_API_URL'];
  const missing: string[] = [];
  
 
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
      console.error(`❌ ${varName} is not set!`);
    } else {
      if (varName.includes('SECRET')) {
       
      } else {
       
      }
    }
  });
  
  if (missing.length > 0) {
    console.error(`\n⚠️ Missing ${missing.length} required environment variables.\n`);
   
    missing.forEach(varName => {
      if (varName === 'NEXTAUTH_SECRET') {
       
      } else if (varName === 'NEXTAUTH_URL') {
       
      } else if (varName === 'NEXT_PUBLIC_API_URL') {
       
      } else {
       
      }
    });
   
   
    return 1;
  }
  
 
  
  // Additional checks
  const url = process.env.NEXTAUTH_URL;
  if (url && url.includes('/en/')) {
    console.warn('⚠️ Warning: NEXTAUTH_URL should not include a language prefix like /en/');
    console.warn(`   Current value: ${url}`);
    console.warn('   Suggested value: ' + url.replace(/\/[a-z]{2}\//, '/'));
  }
  
  return 0;
}

// Run if called directly
if (require.main === module) {
  const exitCode = checkEnv();
  process.exit(exitCode);
}

export default checkEnv; 