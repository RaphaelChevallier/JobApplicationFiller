import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Navigation Bar */}
      <nav className="w-full p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">JobAppFiller</h1>
          <div>
            <Link href="/login" className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              Login
            </Link>
            {/* Add Sign Up link later */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-4xl font-bold mb-4">Tired of Filling Job Applications?</h2>
        <p className="text-lg mb-8 max-w-xl">
          Let AI handle the repetitive parts. Sign up, store your info, and let our Chrome extension fill out applications for you.
        </p>
        <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Get Started
        </Link>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} JobAppFiller. All rights reserved.
      </footer>
    </div>
  );
}
