import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Navigation Bar */}
      <nav className="w-full p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">One AI-pplication</h1>
          <div>
            <Link href="/login" className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              Login
            </Link>
            <Link href="/signup" className="ml-2 px-4 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-600/80 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-4xl font-bold mb-4">One Profile. Countless Applications.</h2>
        <p className="text-lg mb-8 max-w-xl">
          Complete one AI-powered job application profile. Let our AI automatically fill out applications on any job site for you.
        </p>
        <div className="space-x-4">
          <Link href="/signup" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">
            Create Your Profile
          </Link>
          <Link href="#how-it-works" className="px-6 py-3 bg-white text-indigo-600 rounded-lg border border-indigo-300 hover:bg-indigo-50 transition-colors shadow-lg">
            How It Works
          </Link>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Build Your Profile</h3>
              <p className="text-gray-600 dark:text-gray-300">Enter your information once in our comprehensive profile builder.</p>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Install Extension</h3>
              <p className="text-gray-600 dark:text-gray-300">Get our browser extension that connects to your profile.</p>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Apply With One Click</h3>
              <p className="text-gray-600 dark:text-gray-300">Our AI fills job applications automatically when you visit job sites.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} One AI-pplication. All rights reserved.
      </footer>
    </div>
  );
}
