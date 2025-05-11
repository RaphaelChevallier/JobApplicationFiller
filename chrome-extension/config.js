// Environment configuration for the extension
// Change these values for different environments

const config = {
  // Base URLs
  development: {
    baseUrl: 'http://localhost:3000',
    // Supabase configuration
    supabaseUrl: 'https://qculzyrifhqowlmgihqw.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdWx6eXJpZmhxb3dsbWdpaHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTAxMTYsImV4cCI6MjA2MTI2NjExNn0.nyNnMX8YslNB2EUFK9GrNiSDHr2l76lS2RQu0RpD11k'
  },
  production: {
    baseUrl: 'https://job-application-filler.vercel.app',
    // Supabase configuration - using the same values, but could be different in a real app
    supabaseUrl: 'https://qculzyrifhqowlmgihqw.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdWx6eXJpZmhxb3dsbWdpaHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTAxMTYsImV4cCI6MjA2MTI2NjExNn0.nyNnMX8YslNB2EUFK9GrNiSDHr2l76lS2RQu0RpD11k'
  },
  
  // Determine which environment to use
  // Set this to 'production' before building for deployment
  environment: 'development'
};

// Export the correct environment config
const env = config[config.environment];

// Add derived URLs
env.loginUrl = `${env.baseUrl}/login`;
env.applicationUrl = `${env.baseUrl}/application`;

// Export the config
export default env; 