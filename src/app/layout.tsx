import React from 'react';
import Link from 'next/link';
import './globals.css';
import Copyright from './components/Copyright';

export const metadata = {
  title: 'Shoe Guru',
  description: 'Browse and search for running shoes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body>
        <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-primary-600">
                Shoe<span className="text-secondary-600">Guru</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/shoes" className="font-medium text-neutral-700 hover:text-primary-600 transition-colors">
                All Shoes
              </Link>
              <Link href="#" className="font-medium text-neutral-700 hover:text-primary-600 transition-colors">
                Brands
              </Link>
              <Link href="#" className="font-medium text-neutral-700 hover:text-primary-600 transition-colors">
                Categories
              </Link>
              <Link href="#" className="btn btn-primary">
                Ask Guru
              </Link>
            </nav>
            <button className="md:hidden text-neutral-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-180px)]">
          {children}
        </main>

        <footer className="bg-neutral-800 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Shoe<span className="text-primary-400">Guru</span></h3>
                <p className="text-neutral-300 mb-4">Your expert guide to finding the perfect running shoes for your needs.</p>
                <div className="flex gap-4">
                  <a href="#" className="text-white hover:text-primary-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="text-white hover:text-primary-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li><Link href="/shoes" className="text-neutral-300 hover:text-white transition-colors">All Shoes</Link></li>
                  <li><Link href="#" className="text-neutral-300 hover:text-white transition-colors">Popular Brands</Link></li>
                  <li><Link href="#" className="text-neutral-300 hover:text-white transition-colors">Running Guides</Link></li>
                  <li><Link href="#" className="text-neutral-300 hover:text-white transition-colors">About Us</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Contact</h4>
                <p className="text-neutral-300 mb-2">Have questions? We're here to help!</p>
                <a href="mailto:info@shoeguru.com" className="text-primary-400 hover:text-primary-300 transition-colors">info@shoeguru.com</a>
              </div>
            </div>
            <div className="border-t border-neutral-700 mt-8 pt-8 text-center text-neutral-400">
              <Copyright />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
