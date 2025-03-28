import React from 'react';
import Link from 'next/link';
import './globals.css';
import Copyright from './components/Copyright';

export const metadata = {
  title: 'Wide Toe Box',
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
                Wide<span className="text-black">ToeBox</span>
              </span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-180px)]">
          {children}
        </main>

        <footer className="bg-neutral-800 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Wide<span className="text-white">ToeBox</span></h3>
                <p className="text-neutral-300 mb-4">Your specialized resource for finding the perfect wide toe box running shoes.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Contact</h4>
                <p className="text-neutral-300 mb-2">Have questions? We're here to help!</p>
                <a href="mailto:info@widetoebox.com" className="text-primary-400 hover:text-primary-300 transition-colors">info@widetoebox.com</a>
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
