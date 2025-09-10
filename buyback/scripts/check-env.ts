#!/usr/bin/env node

/**
 * This script checks if the required NextAuth environment variables are set.
 * Run with: npx tsx scripts/check-env.ts
 */

function checkEnv() {
  const requiredVars = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'NEXT_PUBLIC_API_URL'];
  const missing: string[] = [];
  
  console.log('\n🔍 Checking environment variables for NextAuth...\n');
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
      console.error(`❌ ${varName} is not set!`);
    } else {
      if (varName.includes('SECRET')) {
        console.log(`✅ ${varName} is set (value hidden)`);
      } else {
        console.log(`✅ ${varName} is set to: ${process.env[varName]}`);
      }
    }
  });
  
  if (missing.length > 0) {
    console.error(`\n⚠️ Missing ${missing.length} required environment variables.\n`);
    console.log('Please set them in your .env.local file:\n');
    missing.forEach(varName => {
      if (varName === 'NEXTAUTH_SECRET') {
        console.log(`${varName}="generate a secure random string"`);
      } else if (varName === 'NEXTAUTH_URL') {
        console.log(`${varName}="http://localhost:3000"`);
      } else if (varName === 'NEXT_PUBLIC_API_URL') {
        console.log(`${varName}="http://localhost:5500/api"`);
      } else {
        console.log(`${varName}="..."`);
      }
    });
    console.log('\nYou can generate a secure string for NEXTAUTH_SECRET with:');
    console.log('node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"\n');
    return 1;
  }
  
  console.log('\n✅ All required environment variables are set!\n');
  
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