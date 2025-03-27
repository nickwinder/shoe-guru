'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AskExpertForm({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to match the content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query) return;

    setIsLoading(true);
    setResponse('');

    try {
      // Make a POST request to the API endpoint
      const response = await fetch('/api/ask-expert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the response JSON
      const data = await response.json();

      // Set the response text
      setResponse(data.response);
    } catch (error) {
      console.error("Error asking the expert:", error);
      setResponse("Sorry, I couldn't get an answer at this time. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} suppressHydrationWarning>
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute top-0 left-0 pt-3 pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask our shoe expert any question..."
              className="form-input pl-10 py-3 w-full min-h-[48px]"
              style={{
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.5',
              }}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-1 shrink-0">
            <button 
              type="submit" 
              className="btn btn-primary py-2 px-3 sm:py-3 sm:px-6"
              disabled={isLoading}
            >
              {isLoading ? 'Thinking...' : '→'}
            </button>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResponse('');
                }}
                className="btn btn-outline py-2 px-2 sm:py-3 sm:px-3"
                disabled={isLoading}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Default question buttons */}
      <div className="mt-4">
        <p className="text-sm text-neutral-500 mb-2">Common questions:</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setQuery("What's the highest stack height zero drop shoe?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            What's the highest stack height zero drop shoe?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("What's the widest trail shoe available?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            What's the widest trail shoe available?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("Which shoes are best for flat feet runners?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            Which shoes are best for flat feet runners?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("What are the most cushioned shoes for long distance running?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            What are the most cushioned shoes for long distance running?
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("Which shoes have the best grip for wet trail conditions?");
              setTimeout(() => handleSubmit(new Event('submit') as unknown as React.FormEvent), 0);
            }}
            className="text-sm bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
            disabled={isLoading}
          >
            Which shoes have the best grip for wet trail conditions?
          </button>
        </div>
      </div>

      {response && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="prose max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
          <div className="animate-pulse">
            <p className="text-neutral-600">Our shoe expert is thinking...</p>
          </div>
        </div>
      )}
    </div>
  );
}
