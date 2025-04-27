'use client'; // Required for form actions and potentially hooks later

import { login, signInWithGoogle } from './actions';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // Import the hook
import { useEffect, useState } from 'react'; // Import hooks for managing message display

export default function LoginPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const error = searchParams.get('error'); // Also handle potential error messages
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    // Set the message to display, prioritize error over general message
    setDisplayMessage(error || message);
    // Optional: Clear the message from the URL after displaying it once
    // if (message || error) {
    //   window.history.replaceState({}, '', '/login');
    // }
  }, [message, error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Login</h1>

        {/* Display Message/Error if present */}
        {displayMessage && (
          <p className={`text-center text-sm p-3 rounded-md ${error ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
            {displayMessage}
          </p>
        )}

        {/* Email/Password Form */}
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-500 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-500 dark:text-white"
            />
          </div>
          <button
            formAction={login}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Log in
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <form>
            <button
              formAction={signInWithGoogle}
              className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
               {/* Basic Google Icon Placeholder - Replace with actual SVG if needed */}
              <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#EA4335" d="M24 9.5c3.48 0 6.23.78 8.25 2.5l6.25-6.25C34.75 2.75 30 1 24 1 14.5 1 6.5 6.75 3 15l7.25 5.5C11.75 14.25 17.5 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24c0-1.66-.15-3.25-.42-4.8H24v9.1h12.9c-.56 2.88-2.16 5.32-4.56 6.98l7.25 5.5C44.4 36.58 46.5 30.85 46.5 24z"/><path fill="#FBBC05" d="M10.25 20.5C9.8 19.07 9.5 17.55 9.5 16s.3-3.07.75-4.5L3 6C1.17 9.75 0 14.67 0 20s1.17 10.25 3 14l7.25-5.5c-.45-1.43-.75-2.95-.75-4.5z"/><path fill="#34A853" d="M24 47c6 0 11-1.98 14.67-5.33l-7.25-5.5C29.32 37.7 26.88 38.5 24 38.5c-6.5 0-12.25-4.75-14.25-11L2.5 32.5C6.5 41.25 14.5 47 24 47z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
              Sign in with Google
            </button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          {/* Link to Sign Up page - create later */}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Sign up
          </Link>
        </p>
         <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
} 