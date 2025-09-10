/**
 * Sets default environment variables if they're not already set.
 * This is useful for development and testing.
 * This should run on startup of the server.
 */

function setupServerEnvVars() {
  // Only run this in development
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Default values for development
  const defaults: Record<string, string> = {
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'development-secret-do-not-use-in-production',
  };

  // Set defaults if not already set
  Object.entries(defaults).forEach(([key, value]) => {
    if (!process.env[key]) {
      console.warn(`[ENV] Setting default value for ${key} in development`);
      process.env[key] = value;
    }
  });

  // Log important environment variables
  console.log('[ENV] Environment setup complete');
  console.log(`[ENV] NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
  console.log(`[ENV] NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '(set)' : '(not set)'}`);
  console.log(`[ENV] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || '(not set)'}`);
}

// Run setup when this module is imported
setupServerEnvVars();

export default setupServerEnvVars; 