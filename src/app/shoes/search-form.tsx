'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchForm({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update the URL with the search query
    if (query) {
      router.push(`/shoes?query=${encodeURIComponent(query)}`);
    } else {
      router.push('/shoes');
    }
  };

  return (
    <form onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shoes by name, brand, or type..."
            className="form-input pl-10 py-3"
          />
        </div>
        <div className="flex gap-2">
          <button 
            type="submit" 
            className="btn btn-primary py-3 px-6"
          >
            Search
          </button>
          {initialQuery && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                router.push('/shoes');
              }}
              className="btn btn-outline py-3"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button 
          type="button" 
          onClick={() => {
            setQuery('road');
            router.push(`/shoes?query=${encodeURIComponent('road')}`);
          }}
          className="text-sm bg-neutral-100 hover:bg-neutral-200 px-3 py-1 rounded-full transition-colors"
        >
          Road
        </button>
        <button 
          type="button" 
          onClick={() => {
            setQuery('trail');
            router.push(`/shoes?query=${encodeURIComponent('trail')}`);
          }}
          className="text-sm bg-neutral-100 hover:bg-neutral-200 px-3 py-1 rounded-full transition-colors"
        >
          Trail
        </button>
      </div>
    </form>
  );
}
