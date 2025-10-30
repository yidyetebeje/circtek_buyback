#!/usr/bin/env node

/**
 * This script helps debug NextAuth configuration issues.
 * Run it with: node scripts/debug-nextauth.js
 */

console.log('\n🔍 NextAuth Debug Helper\n');

console.log('📋 Environment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`);
console.log(`- NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '(set)' : 'not set'}`);
console.log(`- NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set'}`);

console.log('\n📝 Recommendations:');
if (!process.env.NEXTAUTH_URL) {
 
}
if (!process.env.NEXTAUTH_SECRET) {
 
 
}
if (!process.env.NEXT_PUBLIC_API_URL) {
 
}

console.log('\n📚 Important Tips:');
console.log('1. Make sure your API routes are available at /api/auth/* (not /en/api/auth/*)');
console.log('2. NextAuth requires NEXTAUTH_URL to know where your API routes are located');
console.log('3. The NextAuth configuration should use basePath: "/api/auth" to handle routes correctly');
console.log('4. Middleware should exclude API routes from processing');

console.log('\n🔧 File paths to check:');
console.log('- app/api/auth/[...nextauth]/route.ts - Should export GET and POST directly from handlers');
console.log('- auth.ts - Should have proper callbacks and basePath settings');
console.log('- middleware.ts - Should exclude API routes from being processed');

console.log('\n✅ Done'); 