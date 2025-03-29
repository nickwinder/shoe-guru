import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Legal Information | WideToeBox',
  description: 'Legal information, terms, and policies for WideToeBox',
};

export default function LegalIndexPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Legal Information</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="mb-8">
          Welcome to the legal section of WideToeBox. Here you can find all our policies, terms, and legal notices.
        </p>
        
        <div className="grid gap-6 md:grid-cols-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">
              <Link href="/legal/terms-of-service" className="text-primary-600 hover:text-primary-800 transition-colors">
                Terms of Service
              </Link>
            </h2>
            <p className="text-neutral-600">
              The rules and guidelines for using our website and services.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">
              <Link href="/legal/privacy-notice" className="text-primary-600 hover:text-primary-800 transition-colors">
                Privacy Notice
              </Link>
            </h2>
            <p className="text-neutral-600">
              Information about how we collect, store, and use your data, including questions submitted through our "Ask an Expert" feature.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">
              <Link href="/legal/affiliate-disclosure" className="text-primary-600 hover:text-primary-800 transition-colors">
                Affiliate Disclosure
              </Link>
            </h2>
            <p className="text-neutral-600">
              Information about our participation in affiliate programs and how we may earn commissions from links on our site.
            </p>
          </div>
        </div>
        
        <p className="mt-8 text-neutral-600">
          If you have any questions about our legal policies, please contact us at hello@barefootrunreview.com.
        </p>
      </div>
    </div>
  );
}
